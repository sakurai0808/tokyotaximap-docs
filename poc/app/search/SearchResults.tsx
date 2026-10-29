"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

// Pagefindでつくるresultの型
type PagefindResultData = {
  url: string;
  excerpt: string;
  meta: { title: string };
};

// 結果の1件 の型
type PagefindResult = {
  data: () => Promise<PagefindResultData>;
};

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
        const results: PagefindResultData[] = await Promise.all(
          search.results.map((result: PagefindResult) => result.data()),
        );

        console.log("結果発表ーー!(浜田)", results);
      } catch (error) {
        console.log("読み込めなかった", error);
      }
    }
    runSearch();
  }, [q]);

  return q.length > 0 && <p>「{q}」の検索結果</p>;
}
