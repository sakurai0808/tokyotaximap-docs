// 一覧ページに表示する記事カードを作る
import Link from "next/link";
import type { ArticleSummary } from "@/lib/articles";

export default function ArticleCard({ article }: { article: ArticleSummary }) {
  const fixedUpdatedAt = article.updatedAt.replaceAll("-", "/"); // 実際の日付の表示は"-"を"/"に変換する
  return (
    <Link href={`/${article.slug}/`} className="">
      <img src={article.thumbnail} alt={article.title} className="" />
      <div>
        <h3>{article.title}</h3>
        <div>
          <time dateTime={article.updatedAt}>{fixedUpdatedAt}</time>
          <span>{article.category}</span>
        </div>
      </div>
    </Link>
  );
}
