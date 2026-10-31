"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

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

  const [results, setResults] = useState<PagefindResultData[]>([]); // results=結果の配列。setResults=resultsを入れ替える関数。

  const [isLoading, setIsLoading] = useState(true); // ローディング状態はstateでもつ。まずは「検索中とみなす」かたちでスタート

  useEffect(() => {
    if (q === "") return;

    async function runSearch() {
      setIsLoading(true);

      try {
        const pagefindPath = "/pagefind/pagefind.js";
        const pagefind = await import(/* webpackIgnore: true */ pagefindPath); // ビルド時には存在しないpagefind.jsを、ブラウザでの実行時に読み込ませる

        const search = await pagefind.search(q);
        const data: PagefindResultData[] = await Promise.all(
          search.results.map((result: PagefindResult) => result.data()),
        );

        setResults(data);
      } catch (error) {
        console.log("読み込めなかった", error);
      } finally {
        setIsLoading(false); // 成功、失敗に関係なく必ず検索は終了する
      }
    }
    runSearch();
  }, [q]);

  if (q === "") return null; // 条件1:qが空なら何も表示しない

  if (isLoading) return <p>検索中...</p>; // 検索中の表示

  if (results.length === 0)
    return <p>「{q}」に一致する記事は見つかりませんでした。</p>; // 検索結果の個数が0のとき

  return (
    <section>
      <p>「{q}」の検索結果</p>
      <ul className="list-disc space-y-2 pl-6">
        {results.map((result) => (
          <li key={result.url}>
            <Link href={result.url} className="text-blue-600 underline">
              {result.meta.title}
            </Link>
            <p dangerouslySetInnerHTML={{ __html: result.excerpt }} />
          </li>
        ))}
      </ul>
    </section>
  );
}
