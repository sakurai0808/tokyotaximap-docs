"use client";

import { useState } from "react";
import type { SuggestItem } from "@/lib/articles";

import Form from "next/form";

export default function SuggestBox({
  items,
  onAfterSubmit,
}: {
  items: SuggestItem[];
  onAfterSubmit?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false); // サジェストの表示のONOFF

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
    <div>
      <Form
        action="/search/"
        onSubmit={() => {
          setIsOpen(false);
          onAfterSubmit?.();
        }}
        className="flex gap-2"
      >
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="施設名・通称・地名で検索"
          className="min-w-0 flex-1 rounded border px-3 py-2 text-zinc-900 bg-white"
          autoFocus
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-zinc-800 px-4 py-2 font-bold text-white"
        >
          検索
        </button>
      </Form>
      {isOpen && suggestions.length > 0 && (
        <ul className="mt-2 divide-y rounded border">
          {suggestions.map((item) => (
            <li key={item.slug}>
              <button
                type="button"
                // サジェストが表示された時ではなく、「クリックしたときに」setQueryを呼ぶ
                onClick={() => {
                  setQuery(item.title);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-zinc-100"
              >
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
