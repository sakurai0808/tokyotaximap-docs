"use client";

// ジャンルごとに一覧を表示させる

import { ArticleSummary } from "@/lib/articles";
import ArticleCard from "./ArticleCard";
import type { Category } from "@/lib/schema";
import { useState } from "react";

// ジャンル分け用のカテゴリ配列を作成
const genreCategories: Category[] = [
  "幹線道路",
  "交差点",
  "主要駅",
  "施設",
  "通称がある道",
  "抜け道・定番ルート",
  "首都高",
];

export default function GenreBrowse({
  articles,
}: {
  articles: ArticleSummary[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<Category>(
    genreCategories[0],
  );

  const visibleArticles = articles.filter(
    (article) => article.category === selectedCategory,
  );

  return (
    <div className="mx-auto max-w-[1052px]">
      <h2 className="text-center text-2xl mb-[1em] font-bold">
        ジャンルから探す
      </h2>
      {/* タブボタン列 */}
      <div className="flex flex-wrap gap-4 mb-[20px]">
        {genreCategories.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={selectedCategory === c}
            onClick={() => setSelectedCategory(c)}
            className={`cursor-pointer border border-zinc-300 px-[1em] py-[0.5em] text-base inline-flex items-center gap-1
              ${selectedCategory === c ? "font-bold underline" : ""}`}
          >
            {c}
          </button>
        ))}
      </div>
      {/* フィルターした記事一覧 */}
      <div className="space-y-[24px] md:space-y-[30px]">
        {visibleArticles.length === 0 ? (
          <p>このジャンルの記事はまだありません。</p>
        ) : (
          visibleArticles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))
        )}
      </div>
    </div>
  );
}
