// 一覧ページに表示する記事カードを作る
// GenreBrowse.tsxで呼び出されたとき、すでにそのtsxがClient Componentになっているため、こちらにuse clientの記述は不要
import Link from "next/link";
import type { ArticleSummary } from "@/lib/articles";

export default function ArticleCard({ article }: { article: ArticleSummary }) {
  const fixedUpdatedAt = article.updatedAt.replaceAll("-", "/"); // 実際の日付の表示は"-"を"/"に変換する
  return (
    <Link href={`/${article.slug}/`} className="flex flex-col">
      <img src={article.thumbnail} alt={article.title} className="w-full" />
      <div className="p-5">
        <h3 className="text-xl font-bold mb-4">{article.title}</h3>
        <div className="flex items-center justify-between">
          <time dateTime={article.updatedAt} className="text-sm">
            {fixedUpdatedAt}
          </time>
          <span className="border px-4 py-2">{article.category}</span>
        </div>
      </div>
    </Link>
  );
}
