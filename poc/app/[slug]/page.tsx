// 記事詳細ページ。JSXでHTMLページを組み立てる(ブラウザがそのHTMLを表示する)

import { notFound } from "next/navigation";
import { getAllSlugs, getArticleBySlug } from "@/lib/articles"; // articles.tsから機能をインポート

// 受け取るpropsの形
type PageProps = {
  params: Promise<{ slug: string }>;
};

// ビルド時に「どのslugのページを事前に作るか」を教える関数
export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

// URLアクセス時にHTMLを返す処理
export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params; // paramsからslugを受け取る
  const article = await getArticleBySlug(slug); // 記事データの取得

  if (!article) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-4 text-3xl font-bold">{article.title}</h1>

      {/* summaryがあればリード文を表示 */}
      {article.summary && (
        <p className="mb-8 text-lg text-zinc-600">{article.summary}</p>
      )}

      <article
        className="prose prose-zinc max-w-none"
        dangerouslySetInnerHTML={{ __html: article.contentHtml }} // remarkが作ったHTML文字列を埋め込む
      />
    </main>
  );
}
