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
): { html: string; mapConverted: number; youtubeConverted: number; status?: string; abolishedAt?: string } {
  let html = post.content.rendered;

  // ブロックエディタのコメント（<!-- wp:paragraph --> など）を取り除く
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  // YouTubeの埋め込み（iframe）は、動画のURLを1行の段落にする（決めたこと 2026-11-25: 本文の位置に、URLを単独行で書く）
  // 表示側が、このURLを埋め込みに変える。`<a>` で包むのは、Markdownの中で単独のリンクとして残すため
  const youtubeRe =
    /<iframe\b[^>]*\ssrc="(?:https?:)?\/\/(?:www\.)?(?:youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})[^"]*"[^>]*>[\s\S]*?<\/iframe>/gi;
  const youtubeConverted = [...html.matchAll(youtubeRe)].length;
  html = html.replace(youtubeRe, (_, id: string) => {
    const url = `https://youtu.be/${id}`;
    return `<p><a href="${url}">${url}</a></p>`;
  });

  // Googleマップの埋め込み（iframe）は、埋め込みURLを1行の段落にする（決めたこと 2026-11-25）
  // 表示側が iframe に変える。WordPressの埋め込みは、すべて `https://www.google.com/maps/embed?pb=…` の形
  const mapRe = /<iframe\b[^>]*\ssrc="([^"]*google\.com[^"]*)"[^>]*>[\s\S]*?<\/iframe>/gi;
  const mapUrls = [...html.matchAll(mapRe)].map((m) => m[1]);
  for (const url of mapUrls) {
    // URLの中の空白（改行）は取り除く。URLには空白を入れられず、改行が入ると、リンクが壊れる
    if (/\s/.test(url)) problems.push(`${post.slug}: 地図のURLに改行があったので取り除いた`);
    const clean = url.replace(/\s+/g, "");
    if (!clean.startsWith("https://www.google.com/maps/embed?pb=") || clean.includes("&")) {
      problems.push(`${post.slug}: 地図の埋め込みURLの形が想定と違う（手で確認）: ${clean}`);
    }
  }
  html = html.replace(mapRe, (_, url: string) => {
    const clean = url.replace(/\s+/g, "");
    return `<p><a href="${clean}">${clean}</a></p>`;
  });
  const mapConverted = mapUrls.length;

  // 吹き出し（VK Blocks の balloon）のアイコン（サイトのロゴ）は、本文から外す
  // 吹き出しの文は残す（引用ブロックに直すのは、別の作業）。ロゴは、どの記事にも同じ画像として入ってしまうため
  html = html.replace(/<div class="vk_balloon_icon">[\s\S]*?<\/div>/g, "");

  // 廃止された出入口の注意（VK Blocks の alert）は、本文から外し、front matter に書く
  // 決め（2026-11-27）: status: 廃止、pinmap: false（ピンから外す）、abolishedAt: YYYY-MM（年月）。タイトルの【※廃止済み】は残す
  let status: string | undefined;
  let abolishedAt: string | undefined;
  html = html.replace(/<div class="wp-block-vk-blocks-alert[^"]*">([\s\S]*?)<\/div>/g, (whole, inner: string) => {
    const note = inner.replace(/<[^>]+>/g, "").trim();
    if (!note.includes("廃止")) {
      problems.push(`${post.slug}: 注意（alert）の文を、扱いを決められなかった（手で確認）: ${note}`);
      return whole;
    }
    status = "廃止";
    const ym = note.match(/(\d{4})年(\d{1,2})月/);
    if (ym) {
      abolishedAt = `${ym[1]}-${ym[2].padStart(2, "0")}`;
    } else {
      problems.push(`${post.slug}: 廃止の年月が読み取れなかった（abolishedAt を手で書く）: ${note}`);
    }
    problems.push(`${post.slug}: 注意の文を status: 廃止 に置き換えた（pinmap: false、abolishedAt: ${abolishedAt ?? "未入力"}）。元の文: ${note}`);
    return "";
  });

  // 外したあとに残っているiframeは、人が確かめる
  const iframeLeft = (html.match(/<iframe\b/gi) ?? []).length;
  if (iframeLeft > 0) {
    problems.push(`${post.slug}: 本文にほかのiframeが${iframeLeft}個ある（手で確認）`);
  }

  // 画像
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    // リンクカードのサムネイルと、ファビコンは取り除く（リンクの文字は残る）
    if (isLinkCardImage(tag)) return "";

    // alt が空の画像は、記事ごとに埋める（確認の一覧に出す。決めたこと 2026-11-25）
    if (!/\salt="[^"]+"/.test(tag)) {
      problems.push(`${post.slug}: 画像のalt が空（記事ごとに埋める）: ${imgSrc(tag) ?? "(src なし)"}`);
    }

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

  return { html, mapConverted, youtubeConverted, status, abolishedAt };
}

// 5. 木の構造を使う部分: 目次（WordPressのプラグイン ez-toc）を、HTMLの木から取り除く
// 目次の機能は、いまは作らないと決めている（docs/design/ui-ux.md 参照）
// 文字の並びではなく木で探すので、入れ子のdivがあっても正しく取り除ける
type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
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

// クラス名を持つか（hast では className が配列で入る）
function hasClass(node: HastNode, name: string): boolean {
  const cls = node.properties?.className;
  if (Array.isArray(cls)) return cls.includes(name);
  return typeof cls === "string" && cls.split(" ").includes(name);
}

// 木の中から、クラス名を持つ最初の要素を探す（入れ子でも探せる）
function findByClass(node: HastNode, name: string): HastNode | undefined {
  if (hasClass(node, name)) return node;
  for (const child of node.children ?? []) {
    const found = findByClass(child, name);
    if (found) return found;
  }
  return undefined;
}

// 木の中の文字を、つなげて1つの文字列にする
function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

// リンクカード（WordPressのlkcプラグインの `<div class="linkcard">`）を、タイトルのリンクだけの段落にする。
// 説明文・URL・サイト名・日付・共有ボタンの文字は取り除く（決めたこと 2026-11-25: タイトルのリンクだけ残す）
function linkCardToParagraph(card: HastNode): HastNode | undefined {
  const link = findByClass(card, "lkc-link");
  const title = findByClass(card, "lkc-title-text");
  if (!link || !title) return undefined;
  return {
    type: "element",
    tagName: "p",
    properties: {},
    children: [
      {
        type: "element",
        tagName: "a",
        properties: { href: link.properties?.href },
        children: [{ type: "text", value: textOf(title) }],
      },
    ],
  };
}

// リンクカードを、タイトルのリンクの段落に置き換える（タイトルが見つからなければ、取り除く）
function removeLinkCards(node: HastNode, counter: { n: number }): void {
  if (!node.children) return;
  const next: HastNode[] = [];
  for (const child of node.children) {
    if (hasClass(child, "linkcard")) {
      counter.n += 1;
      const paragraph = linkCardToParagraph(child);
      if (paragraph) next.push(paragraph);
      continue;
    }
    next.push(child);
  }
  node.children = next;
  for (const child of node.children) removeLinkCards(child, counter);
}

function removeLinkCardsPlugin(counter: { n: number }) {
  return (tree: HastNode) => removeLinkCards(tree, counter);
}

// remark-stringify は、太字（**…**）の直後の日本語を &#x3067; のような実体参照に書き換えることがある
// （「白洋舎ビル**です**」→「白洋舎ビル**&#x3067;す**」の形になる）。元の文字に戻す。
// 英数字（C&#x31; = C1 など）も戻す。記号（&#x2A; = * など）は Markdown の記号になるため戻さない
function decodeSafeReferences(text: string): string {
  const isSafe = (cp: number) => cp >= 0x80 || /[0-9A-Za-z]/.test(String.fromCodePoint(cp));
  return text
    .replace(/&#x([0-9a-f]+);/gi, (m, h: string) => {
      const cp = parseInt(h, 16);
      return isSafe(cp) ? String.fromCodePoint(cp) : m;
    })
    .replace(/&#(\d+);/g, (m, n: string) => {
      const cp = Number(n);
      return isSafe(cp) ? String.fromCodePoint(cp) : m;
    });
}

// 5b. 強調（斜体・太字）の閉じの記号が、記号（)など）の直後にあり、その後ろに日本語が続く形を直す
// Markdownの規則では、この形の閉じの記号は効かず、記号がそのまま表示される（例: *[リンク](…)*の途中）
// 直し方: 強調の記号を外して、文字だけ残す（案A）
type MdNode = { type: string; value?: string; children?: MdNode[] };

function isPunctOrSpace(ch: string): boolean {
  return /[\s\p{P}\p{S}]/u.test(ch);
}

function lastCharOf(node: MdNode): string {
  if (node.value !== undefined) return node.value.slice(-1);
  if (!node.children?.length) return "";
  return lastCharOf(node.children[node.children.length - 1]);
}

function startsWithSafeChar(node: MdNode | undefined): boolean {
  if (!node) return false;
  if (node.type !== "text" || node.value === undefined) return true; // 文字以外（リンク等）は、記号の直後として問題にしない
  const ch = node.value.charAt(0);
  return ch !== "" && !isPunctOrSpace(ch);
}

function fixEmphasisAfterPunct() {
  return (tree: MdNode) => {
    const walk = (node: MdNode) => {
      if (!node.children) return;
      for (const child of node.children) walk(child);
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type !== "emphasis" && child.type !== "strong") continue;
        const inner = child.children ?? [];
        const last = inner[inner.length - 1];
        const closingAfterSymbol = last?.type === "link" || isPunctOrSpace(lastCharOf(child));
        if (!closingAfterSymbol || !startsWithSafeChar(node.children[i + 1])) continue;
        node.children.splice(i, 1, ...inner); // 記号を外し、中身だけ残す
        i += inner.length - 1;
      }
    };
    walk(tree);
  };
}

// 画像のキャプション（<figure> の <figcaption>）を、画像の title にする
// Markdownでは ![alt](src "キャプション") になり、表示側が画像の下に出す（決めたこと 2026-11-25）
// 画像が1枚の図だけを対象にする（WordPressの図は、すべて画像が1枚）。それ以外は、今までどおり
function findAllByTag(node: HastNode, tag: string, found: HastNode[] = []): HastNode[] {
  if (node.tagName === tag) found.push(node);
  for (const child of node.children ?? []) findAllByTag(child, tag, found);
  return found;
}

function captionFigures(node: HastNode): void {
  if (!node.children) return;
  node.children = node.children.map((child) => {
    if (child.tagName === "figure") {
      const imgs = findAllByTag(child, "img");
      if (imgs.length === 1) {
        const caption = findAllByTag(child, "figcaption")[0];
        const text = caption ? textOf(caption).trim() : "";
        const img = imgs[0];
        if (text) img.properties = { ...img.properties, title: text };
        // 画像だけを段落に入れる（拡大ボタンや、キャプションの段落は残さない）
        return { type: "element", tagName: "p", properties: {}, children: [img] };
      }
    }
    captionFigures(child);
    return child;
  });
}

function captionFiguresPlugin() {
  return (tree: HastNode) => captionFigures(tree);
}

// WordPressの色付きの文字を、Markdownに直す（決めたこと 2026-11-25）
// ・赤字（has-vivid-red-color）→ 太字（**…**）
// ・青い文字（リンクの色）→ 色だけなので、記号を付けずに文字を残す。ここで強調にすると、リンクの前後に記号が残る
// ・黄色マーカー（span.vk_highlighter）→ <mark>…</mark>（生のHTMLとして書く）
const wordpressHandlers = {
  mark(state: any, node: HastNode) {
    if (hasClass(node, "has-vivid-red-color")) return { type: "strong", children: state.all(node) };
    return state.all(node);
  },
  span(state: any, node: HastNode) {
    if (!hasClass(node, "vk_highlighter")) return state.all(node);
    return [{ type: "html", value: "<mark>" }, ...state.all(node), { type: "html", value: "</mark>" }];
  },
};

// 6. HTMLをMarkdownに変換する（rehype-parse → 目次を外す → rehype-remark → remark-stringify）
// rehype-parse: HTMLの文字 → HTMLの木（hast）
// rehype-remark: HTMLの木 → Markdownの木（mdast）
// remark-stringify: Markdownの木 → Markdownの文字
async function htmlToMarkdown(
  html: string,
  tocCounter: { n: number },
  cardCounter: { n: number },
): Promise<string> {
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(removeTocPlugin, tocCounter)
    .use(removeLinkCardsPlugin, cardCounter)
    .use(captionFiguresPlugin)
    .use(rehypeRemark, { handlers: wordpressHandlers })
    .use(fixEmphasisAfterPunct)
    .use(remarkGfm)
    .use(remarkStringify)
    .process(html);
  // 地図の見出しは、プレースホルダの名前にそろえる（PoCの記事と同じ）
  // 段落の字下げ（行頭の全角スペース）は、やめると決めたので消す（決めたこと 2026-11-25）
  return decodeSafeReferences(String(file).trim())
    .replace(/^## (google|Google)マップ$/gm, "## 地図(GoogleMap)")
    .replace(/^　+/gm, "");
}

// 7. front matter を組み立てる
// WordPressにない項目は、キーだけ残して値を書かない（空＝null。Zodのエラーで見つける）
// [] にすると検証を通ってしまうので、配列の項目も空のままにする
function buildFrontMatter(
  post: WpPost,
  thumbnail: string | undefined,
  status: string | undefined,
  abolishedAt: string | undefined,
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
  ];
  if (status) {
    // 廃止の出入口は、ピンから外す（pinmap: false）。location・summary は要らないので書かない（2026-11-27決定）
    lines.push("pinmap: false");
    lines.push(`status: ${status}`);
    // 年月は YYYY-MM。読み取れなければ空のまま（確認の一覧に出している）
    lines.push(`abolishedAt: ${abolishedAt ?? ""}`);
  } else {
    lines.push("pinmap:", "location:", "summary:");
  }
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
  const cardCounter = { n: 0 };
  let mapConverted = 0;
  let youtubeConverted = 0;
  let statusSet = 0;
  let written = 0;

  for (const post of posts) {
    for (const m of post.content.rendered.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)\b/g)) {
      const tag = m[1].toLowerCase();
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }

    const prepared = prepareHtml(post, images, gone, problems);
    mapConverted += prepared.mapConverted;
    youtubeConverted += prepared.youtubeConverted;
    if (prepared.status) statusSet++;
    const body = await htmlToMarkdown(prepared.html, tocCounter, cardCounter);

    let thumbnail: string | undefined;
    if (post.featured_media) {
      thumbnail = images.get(`${post.slug}:${post.featured_media}`);
      if (!thumbnail) problems.push(`${post.slug}: 代表画像（ID ${post.featured_media}）が対応表にない`);
    }

    const raw = `${buildFrontMatter(post, thumbnail, prepared.status, prepared.abolishedAt)}\n\n${body}\n`;
    // 整形（Prettier。既定の設定）。空行などを整える
    const text = await format(raw, { parser: "markdown" });
    fs.writeFileSync(`${OUT_DIR}/${post.slug}.md`, text);
    written++;
  }

  console.log(`記事: ${posts.length}本を取得、${written}本を書き出した（${OUT_DIR}/）`);
  console.log(`目次（ez-toc）を取り除いた要素: ${tocCounter.n}個`);
  console.log(`リンクカードの数（タイトルのリンクだけ残した）: ${cardCounter.n}個`);
  console.log(`Googleマップの埋め込みURLを単独行にした数: ${mapConverted}個`);
  console.log(`YouTubeの埋め込みURLを単独行にした数: ${youtubeConverted}個`);
  console.log(`status: 廃止 にした記事: ${statusSet}本`);
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
