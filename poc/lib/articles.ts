// Markdownファイル→アプリが使えるデータ に変換する層をここで作る(UIとデータ取得を分離)

import fs from "fs"; // ファイルの読み込み・存在確認などできる
import path from "path"; // パスを結合させる
import matter from "gray-matter"; // front matterを分割
import { remark } from "remark";
import html from "remark-html";

// 記事ディレクトリを定義する
const articlesDir = path.join(process.cwd(), "content/articles");

// 記事の型を定義。まずは最小セット
export type Article = {
  slug: string;
  title: string;
  summary?: string;
  contentHtml: string;
};

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
};

// 記事のスラッグ、タイトルを返す関数
export function getArticleSummaries(): ArticleSummary[] {
  return getAllSlugs().map((slug) => {
    const filePath = path.join(articlesDir, `${slug}.md`);
    const raw = fs.readFileSync(filePath, "utf8");
    const { data } = matter(raw);

    return {
      slug,
      title: data.title as string,
    };
  });
}

// 記事の内容を読み取ってMarkdownからHTMLに出力する関数
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  // slugから.mdファイルのパスを組み立てる
  const filePath = path.join(articlesDir, `${slug}.md`);

  // 存在しないスラッグはnullを返す
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf8"); // rawはファイル全文の文字列を指す
  const { data, content } = matter(raw); // 分割代入でdata, contentを抜き出し
  const processed = await remark().use(html).process(content); // Markdown文字列をHTML出力

  return {
    slug,
    title: data.title as string,
    summary: data.summary as string | undefined,
    contentHtml: processed.toString(),
  };
}
