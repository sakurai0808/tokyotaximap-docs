"use client";

import { useState } from "react";
import type { SuggestItem } from "@/lib/articles";

export default function SuggestBox({ items }: { items: SuggestItem[] }) {
  const [query, setQuery] = useState("");

  return (
    <div className="mb-8">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="施設名・通称・地名で検索"
        className="w-full rounded border px-3 py-2"
      />
      <p>入力中: {query}</p>
      <p>記事数: {items.length}</p>
    </div>
  );
}
