// 一覧ページに表示する記事カードを作る
// GenreBrowse.tsxで呼び出されたとき、すでにそのtsxがClient Componentになっているため、こちらにuse clientの記述は不要
import Link from "next/link";
import type { ArticleSummary } from "@/lib/articles";

export default function ArticleCard({ article }: { article: ArticleSummary }) {
  const fixedUpdatedAt = article.updatedAt.replaceAll("-", "/"); // 実際の日付の表示は"-"を"/"に変換する
  return (
    <Link
      href={`/${article.slug}/`}
      className="flex flex-col md:items-center md:flex-row md:gap-[50px] md:pl-[30px] md:pr-[50px] md:py-[20px]"
    >
      <img
        src={article.thumbnail}
        alt={article.title}
        className="w-full aspect-[200/142] object-cover md:w-[200px] md:shrink-0"
      />
      <div className="p-[20px] leading-[1.7] md:p-0 md:flex-1 md:min-w-0">
        <h3 className="text-xl font-bold leading-[1.7] mb-[0.8em] md:mb-[1.8em]">
          {article.title}
        </h3>
        <div className="flex items-center justify-between">
          <time dateTime={article.updatedAt} className="text-sm leading-[1.7]">
            {fixedUpdatedAt}
          </time>
          <span className="text-sm leading-[1.7] px-[1em] py-[0.5em] border">
            {article.category}
          </span>
        </div>
      </div>
    </Link>
  );
}
