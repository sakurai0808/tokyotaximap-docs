"use client";

// ジャンルごとに一覧を表示させる

import { ArticleSummary } from "@/lib/articles";
import type { Category } from "@/lib/schema";
import Link from "next/link";
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
    <div className="mx-auto max-w-3xl">
      <h2 className="text-center mb-6">ジャンルから探す</h2>
      {/* タブボタン列 */}
      <div className="flex flex-wrap gap-2 mb-[20px]">
        {genreCategories.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={selectedCategory === c}
            onClick={() => setSelectedCategory(c)}
            className={`cursor-pointer border border-zinc-300 px-3 py-1 text-xs inline-flex items-center gap-1
              ${selectedCategory === c ? "font-bold underline" : ""}`}
          >
            {c}
          </button>
        ))}
      </div>
      {/* フィルターした記事一覧 */}
      <div className="space-y-[60px]">
        {visibleArticles.length === 0 ? (
          <p>このジャンルの記事はまだありません。</p>
        ) : (
          visibleArticles.map((article) => (
            <Link
              key={article.slug}
              href={`/${article.slug}/`}
              className="block"
            >
              {article.title}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
