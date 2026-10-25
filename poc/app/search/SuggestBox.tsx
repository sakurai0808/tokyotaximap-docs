"use client";

import { useState } from "react";
import type { SuggestItem } from "@/lib/articles";

export default function SuggestBox({ items }: { items: SuggestItem[] }) {
  const [query, setQuery] = useState("");

  const keyword = query.trim(); // 入力が空なら空の配列にする
  const suggestions =
    keyword === ""
      ? []
      : items.filter(
          (item) =>
            item.title.includes(keyword) || // 文字列に、指定の文字が含まれるか
            item.keywords.some((word) => word.includes(keyword)), // 条件に当たるものが1つでもあるかチェック。word=記事それぞれに設定したキーワード、keyword=入力された文字
        );

  return (
    <div className="mb-8">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="施設名・通称・地名で検索"
        className="w-full rounded border px-3 py-2"
      />
      {suggestions.length > 0 && (
        <ul>
          {suggestions.map((item) => (
            <li key={item.slug}>
              <button type="button" onClick={() => setQuery(item.title)}> {/* サジェストが表示された時ではなく、「クリックしたときに」setQueryを呼ぶ */}
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
