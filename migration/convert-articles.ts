// 既存のWordPressの記事を、poc/content/articles/ と同じ形（front matter＋Markdown本文）の下書きに変換する
// 実行: node --experimental-strip-types migration/convert-articles.ts
// 出力: migration/articles/{slug}.md（全件）。WordPressにない項目は、空のまま残す（Zodのエラーで埋め忘れを見つける）
// 先に add-url-images.ts を実行して、URLだけで書かれた画像を対応表に入れておく

import fs from "node:fs";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { format } from "prettier";
import {
  SITE,
  fetchAllPosts,
  readImageMap,
  isLinkCardImage,
  imgSrc,
  wpImageId,
  type WpPost,
} from "./shared.ts";

const OUT_DIR = "migration/articles";

// 変換の途中で見つけた、人が確かめるべきこと
type Problems = string[];

// 1. 対応表を辞書にする
// ・WordPressの画像ID: 「記事のslug:画像ID」→ 保存先のパス
// ・URLだけの画像: 「記事のslug:src:本文のsrc」→ 保存先のパス
// 同じ画像IDが本文に複数回出ると対応表に行が重なるので、最初の1つだけを使う
function loadImageMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of readImageMap()) {
    const key =
      row.mediaId !== null
        ? `${row.slug}:${row.mediaId}`
        : `${row.slug}:src:${row.srcInContent}`;
    if (!map.has(key)) map.set(key, `/${row.destPath}`);
  }
  return map;
}

// 2. WordPressの画像IDが、対応表になく、WordPressでも404かを確かめる
// 404のものは、画像を消す（決めたこと）。ほかの理由で取れないものは、人が確かめる
async function findGoneMediaIds(posts: WpPost[], images: Map<string, string>): Promise<Set<number>> {
  const mapped = new Set([...images.keys()].map((k) => Number(k.split(":")[1])).filter((n) => !Number.isNaN(n)));
  const ids = new Set<number>();
  for (const post of posts) {
    for (const m of post.content.rendered.matchAll(/<img\b[^>]*>/g)) {
      const id = wpImageId(m[0]);
      if (id !== undefined && !mapped.has(id)) ids.add(id);
    }
  }
  const gone = new Set<number>();
  for (const id of ids) {
    const res = await fetch(`${SITE}/wp-json/wp/v2/media/${id}?_fields=id`);
    if (res.status === 404) gone.add(id);
  }
  return gone;
}

// 3. タイトルのHTMLの実体参照（&amp; など）を、元の文字に戻す
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&"); // &amp; は最後に戻す（先に戻すと、&amp;lt; が二重に戻ってしまう）
}

function replaceSrc(tag: string, dest: string): string {
  return tag.replace(/\ssrc="[^"]*"/, ` src="${dest}"`);
}

// 4. 本文のHTMLを、変換しやすい形に前もって整える
// 文字の並びを正規表現で書き換える部分と、木の構造を扱う部分（removeToc）がある
function prepareHtml(
  post: WpPost,
  images: Map<string, string>,
  gone: Set<number>,
  problems: Problems,
): { html: string; youtube?: string; mapRemoved: number } {
  let html = post.content.rendered;

  // ブロックエディタのコメント（<!-- wp:paragraph --> など）を取り除く
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  // YouTubeの埋め込みは、動画IDだけを取り出して本文から外す（front matter の youtube に入れる）
  let youtube: string | undefined;
  const youtubeRe =
    /<iframe\b[^>]*\ssrc="(?:https?:)?\/\/(?:www\.)?(?:youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})[^"]*"[^>]*>[\s\S]*?<\/iframe>/gi;
  const youtubeIds = [...html.matchAll(youtubeRe)].map((m) => m[1]);
  if (youtubeIds.length > 1) {
    problems.push(`${post.slug}: YouTubeの埋め込みが${youtubeIds.length}個ある（最初の1つだけ使った）`);
  }
  if (youtubeIds.length > 0) youtube = youtubeIds[0];
  html = html.replace(youtubeRe, "");

  // Googleマップの埋め込みは外す（地図は `## 地図(GoogleMap)` のプレースホルダにする。埋め込み方式は未決定）
  const mapRe = /<iframe\b[^>]*\ssrc="[^"]*google\.com[^"]*"[^>]*>[\s\S]*?<\/iframe>/gi;
  const mapRemoved = [...html.matchAll(mapRe)].length;
  html = html.replace(mapRe, "");

  // 外したあとに残っているiframeは、人が確かめる
  const iframeLeft = (html.match(/<iframe\b/gi) ?? []).length;
  if (iframeLeft > 0) {
    problems.push(`${post.slug}: 本文にほかのiframeが${iframeLeft}個ある（手で確認）`);
  }

  // 画像
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    // リンクカードのサムネイルと、ファビコンは取り除く（リンクの文字は残る）
    if (isLinkCardImage(tag)) return "";

    const id = wpImageId(tag);
    if (id !== undefined) {
      // WordPressの画像ID: 対応表の保存先に置き換える
      const dest = images.get(`${post.slug}:${id}`);
      if (dest) return replaceSrc(tag, dest);
      // WordPressでも404の画像は、消す（決めたこと）。下書きの一覧に出して、確かめられるようにする
      if (gone.has(id)) {
        problems.push(`${post.slug}: 画像を削除した（WordPressで404。ID ${id}）`);
        return "";
      }
      problems.push(`${post.slug}: 画像ID ${id} が対応表にない（手で確認）`);
      return tag;
    }

    // URLだけで書かれた画像: add-url-images.ts が対応表に入れたものを使う
    const src = imgSrc(tag);
    if (src === undefined) return tag;
    const dest = images.get(`${post.slug}:src:${src}`);
    if (dest) return replaceSrc(tag, dest);
    problems.push(`${post.slug}: URLだけの画像が対応表にない（add-url-images.ts を実行する）: ${src}`);
    return tag;
  });

  // 見出し: WordPressの h4 は、h3 に直す（content-model.md の「h4は誤り、h3が正しい」）
  html = html.replace(/<h4\b/gi, "<h3").replace(/<\/h4>/gi, "</h3>");

  // 記事内リンク: https://tokyotaximap.com/{slug}/ は /{slug}/ に書き換える（本番ドメインは書かない）
  // #で始まる目次用のアンカーは、残す（/{slug}/#見出し）
  html = html.replace(
    /href="https:\/\/tokyotaximap\.com\/([^"\/?#]+)\/?(#[^"]*)?"/g,
    (_, slug: string, hash: string | undefined) => `href="/${slug}/${hash ?? ""}"`,
  );
  const leftover = html.match(/href="https?:\/\/tokyotaximap\.com[^"]*"/g) ?? [];
  for (const link of leftover) {
    problems.push(`${post.slug}: 内部リンクが残っている（手で確認）: ${link}`);
  }

  return { html, youtube, mapRemoved };
}

// 5. 木の構造を使う部分: 目次（WordPressのプラグイン ez-toc）を、HTMLの木から取り除く
// 目次の機能は、いまは作らないと決めている（docs/design/ui-ux.md 参照）
// 文字の並びではなく木で探すので、入れ子のdivがあっても正しく取り除ける
type HastNode = {
  type: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function removeById(node: HastNode, id: string, counter: { n: number }): void {
  if (!node.children) return;
  const before = node.children.length;
  node.children = node.children.filter((child) => child.properties?.id !== id);
  counter.n += before - node.children.length;
  for (const child of node.children) removeById(child, id, counter);
}

function removeTocPlugin(counter: { n: number }) {
  return (tree: HastNode) => removeById(tree, "ez-toc-container", counter);
}

// 6. HTMLをMarkdownに変換する（rehype-parse → 目次を外す → rehype-remark → remark-stringify）
// rehype-parse: HTMLの文字 → HTMLの木（hast）
// rehype-remark: HTMLの木 → Markdownの木（mdast）
// remark-stringify: Markdownの木 → Markdownの文字
async function htmlToMarkdown(html: string, tocCounter: { n: number }): Promise<string> {
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(removeTocPlugin, tocCounter)
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify)
    .process(html);
  // 地図の見出しは、プレースホルダの名前にそろえる（PoCの記事と同じ）
  return String(file)
    .trim()
    .replace(/^## (google|Google)マップ$/gm, "## 地図(GoogleMap)");
}

// 7. front matter を組み立てる
// WordPressにない項目は、キーだけ残して値を書かない（空＝null。Zodのエラーで見つける）
// [] にすると検証を通ってしまうので、配列の項目も空のままにする
function buildFrontMatter(
  post: WpPost,
  thumbnail: string | undefined,
  youtube: string | undefined,
): string {
  const lines = [
    "---",
    `title: ${JSON.stringify(decodeEntities(post.title.rendered))}`,
    `slug: ${post.slug}`,
    `publishedAt: ${post.date.slice(0, 10)}`,
    `updatedAt: ${post.modified.slice(0, 10)}`,
    "category:",
    "city:",
    "keywords:",
    "tags: []",
    `thumbnail: ${thumbnail ?? ""}`,
    "pinmap:",
    "location:",
    "summary:",
  ];
  if (youtube) lines.push(`youtube: ${youtube}`);
  lines.push("---");
  return lines.join("\n");
}

async function main() {
  const posts = await fetchAllPosts();
  const images = loadImageMap();
  const gone = await findGoneMediaIds(posts, images);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const problems: Problems = [];
  const tagCounts = new Map<string, number>(); // 本文に出てきたHTMLタグの数（対応の確認用）
  const tocCounter = { n: 0 };
  let mapRemoved = 0;
  let written = 0;

  for (const post of posts) {
    for (const m of post.content.rendered.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)\b/g)) {
      const tag = m[1].toLowerCase();
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }

    const prepared = prepareHtml(post, images, gone, problems);
    mapRemoved += prepared.mapRemoved;
    const body = await htmlToMarkdown(prepared.html, tocCounter);

    let thumbnail: string | undefined;
    if (post.featured_media) {
      thumbnail = images.get(`${post.slug}:${post.featured_media}`);
      if (!thumbnail) problems.push(`${post.slug}: 代表画像（ID ${post.featured_media}）が対応表にない`);
    }

    const raw = `${buildFrontMatter(post, thumbnail, prepared.youtube)}\n\n${body}\n`;
    // 整形（Prettier。既定の設定）。空行などを整える
    const text = await format(raw, { parser: "markdown" });
    fs.writeFileSync(`${OUT_DIR}/${post.slug}.md`, text);
    written++;
  }

  console.log(`記事: ${posts.length}本を取得、${written}本を書き出した（${OUT_DIR}/）`);
  console.log(`目次（ez-toc）を取り除いた要素: ${tocCounter.n}個`);
  console.log(`Googleマップの埋め込みを外した数: ${mapRemoved}個`);
  console.log(`WordPressで404の画像（削除した）: ${gone.size}種類（ID: ${[...gone].join(", ") || "なし"}）`);
  console.log(`\n本文に出てきたHTMLタグ（多い順）:`);
  for (const [tag, count] of [...tagCounts].sort((a, b) => b[1] - a[1])) {
    console.log(`  <${tag}>: ${count}`);
  }
  console.log(`\n確認が必要なこと: ${problems.length}件`);
  for (const p of problems) console.log(`  - ${p}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
