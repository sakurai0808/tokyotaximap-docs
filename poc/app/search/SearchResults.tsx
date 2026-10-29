"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function SearchResults() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();

  useEffect(() => {
    if (q === "") return;

    async function runSearch() {
      try {
        const pagefindPath = "/pagefind/pagefind.js";
        const pagefind = await import(/* webpackIgnore: true */ pagefindPath); // ビルド時には存在しないpagefind.jsを、ブラウザでの実行時に読み込ませる

        const search = await pagefind.search(q);

        console.log("読み込めた", search.results.length);
      } catch (error) {
        console.log("読み込めなかった", error);
      }
    }
    runSearch();
  }, [q]);

  return q.length > 0 && <p>「{q}」の検索結果</p>;
}
