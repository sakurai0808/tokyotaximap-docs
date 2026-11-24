// Markdownファイル→アプリが使えるデータ に変換する層をここで作る(UIとデータ取得を分離)

import fs from "fs"; // ファイルの読み込み・存在確認などできる
import path from "path"; // パスを結合させる
import matter from "gray-matter"; // front matterを分割
import { remark } from "remark";
import html from "remark-html";
import remarkGfm from "remark-gfm";
import { defaultSchema } from "hast-util-sanitize"; // HTMLの安全設定の初期値（remark-htmlが使っているもの）
import {
  articleSchema,
  type Category,
  type ArticleFrontMatter,
  type City,
} from "./schema";
import { z } from "zod";

// 記事ディレクトリを定義する
const articlesDir = path.join(process.cwd(), "content/articles");

export type Article = ArticleFrontMatter & {
  slug: string;
  contentHtml: string;
};

// 使えないslugを定義する
const reservedSlugs = ["area", "search", "pagefind", "404"];

// 全ての記事のデータの一覧を作る関数
export function getAllSlugs(): string[] {
  return fs
    .readdirSync(articlesDir) // ファイル名一覧を読み込む
    .filter((file) => file.endsWith(".md")) // 末尾が.mdのものだけフィルタリング
    .map((file) => file.replace(/\.md$/, "")); // 「.md」を除去
}

// 一覧ページ用の型。用途をArticleと分ける
export type ArticleSummary = {
  slug: string;
  title: string;
  category: string;
  updatedAt: string;
};

// 記事を読み込み、型が合っていなければビルドを中止する。frontMatterの作成
function readArticleFile(slug: string) {
  const filePath = path.join(articlesDir, `${slug}.md`);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  const result = articleSchema.safeParse(data); // Zodで検証
  if (!result.success) {
    throw new Error(
      `${slug}.md のfront matterが不正です\n${z.prettifyError(result.error)}`, // prettifyErrorで、人が読みやすい文字列にする
    );
  }

  if (result.data.slug !== slug) {
    throw new Error(
      `${slug}.mdのfront matterの「${result.data.slug}」がファイル名と一致しません`,
    );
  }

  if (reservedSlugs.includes(slug)) {
    throw new Error(`${slug}.mdの「${slug}」はslugに使用することはできません`);
  }

  return { frontMatter: result.data, content }; // 検証済みのデータに「frontMatter」という名前をつけて、本文(content)と一緒にオブジェクトとして返す
}

// 記事のスラッグ、タイトルを返す関数
export function getArticleSummaries(): ArticleSummary[] {
  return getAllSlugs().map((slug) => {
    const { frontMatter } = readArticleFile(slug);

    return {
      slug,
      title: frontMatter.title,
      category: frontMatter.category,
      updatedAt: frontMatter.updatedAt,
    };
  });
}

// 記事の内容を読み取ってMarkdownからHTMLに出力する関数
// Markdownの木（mdast）の中の節を表す型（ここでは最低限の形だけ決める）
type MdNode = {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hProperties?: Record<string, string> };
};

// 節の中の文字を、順番につなげて1つの文字列にする（見出し「**北の丸IC**」なども、文字だけ取り出す）
function nodeText(node: MdNode): string {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(nodeText).join("");
}

// 見出し（h2・h3）に、見出しの文字と同じ id を付ける。本文中の「#北の丸IC」へのリンクが飛べるようにするため
function remarkHeadingIds() {
  return (tree: MdNode) => {
    const walk = (node: MdNode) => {
      if (node.type === "heading") {
        node.data = { ...node.data, hProperties: { id: nodeText(node) } };
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  // slugから.mdファイルのパスを組み立てる
  const filePath = path.join(articlesDir, `${slug}.md`);

  // 存在しないスラッグはnullを返す
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const { frontMatter, content } = readArticleFile(slug);
  const processed = await remark()
    .use(remarkGfm) // GFM(表などの拡張機能)を解析できるようにする
    .use(remarkHeadingIds) // 見出しに id を付ける（同じページ内のリンクを飛べるようにする）
    .use(html, {
      // 初期値は id に「user-content-」を付けるため、リンク先の #見出し と合わなくなる。付けないように変える（ほかの安全設定は初期値のまま）
      sanitize: { ...defaultSchema, clobberPrefix: "" },
    })
    .process(content); // Markdown文字列をHTML出力

  return {
    ...frontMatter,
    slug,
    contentHtml: processed.toString(),
  };
}

export type SuggestItem = {
  slug: string; // リストを表示するときのkeyとして使用
  title: string;
  keywords: string[];
};

// サジェストに必要なデータを集める関数
export function getSuggestItems(): SuggestItem[] {
  return getAllSlugs().map((slug) => {
    const { frontMatter } = readArticleFile(slug);

    return {
      slug,
      title: frontMatter.title,
      keywords: frontMatter.keywords,
    };
  });
}

// ピンマップ用の型を定義
export type PinmapItem = {
  slug: string;
  title: string;
  category: Category;
  location: { lat: number; lng: number };
  summary: string;
};

// ピンマップに必要なデータを集める関数
export function getPinmapItems(): PinmapItem[] {
  const pinmapItemList: PinmapItem[] = [];

  for (const slug of getAllSlugs()) {
    const { frontMatter } = readArticleFile(slug);

    if (frontMatter.pinmap) {
      pinmapItemList.push({
        // 必要な項目だけで作ったオブジェクトを追加する
        slug,
        title: frontMatter.title,
        category: frontMatter.category,
        location: frontMatter.location,
        summary: frontMatter.summary,
      });
    }
  }

  return pinmapItemList;
}

// 区名を受け取って、ArticleSummary(L33付近)を返す
export function getArticleSummariesByCity(cityName: City): ArticleSummary[] {
  const articleSummariesByCity: ArticleSummary[] = [];

  for (const slug of getAllSlugs()) {
    const { frontMatter } = readArticleFile(slug);

    if (frontMatter.city.includes(cityName)) {
      articleSummariesByCity.push({
        slug: frontMatter.slug,
        title: frontMatter.title,
        category: frontMatter.category,
        updatedAt: frontMatter.updatedAt,
      });
    }
  }

  return articleSummariesByCity;
}
