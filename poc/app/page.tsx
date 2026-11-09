// トップページを描画する(記事一覧の入口)

import Link from "next/link";
import { getArticleSummaries } from "@/lib/articles";
import { getPinmapItems } from "@/lib/articles";
import { cities, cityPaths } from "@/lib/schema";
import PinmapLoader from "./components/PinmapLoader";

// ユーザーがトップ(/)にアクセスしたときに実行
export default function Home() {
  const articles = getArticleSummaries(); // 中身はオブジェクト

  const pinmapItems = getPinmapItems();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">東京都心タクマップ PoC</h1>
      <PinmapLoader items={pinmapItems} />
      {/* 「区から探す」 */}
      <h2>区から探す</h2>
      <ul className="list-disc space-y-2 pl-6">
        {cities.map((c) => (
          <li key={cityPaths[c]}>
            <Link
              href={`/area/${cityPaths[c]}/`}
              className="text-blue-600 underline"
            >
              {c}
            </Link>
          </li>
        ))}
      </ul>
      {/* 記事一覧 */}
      <ul className="list-disc space-y-2 pl-6">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link
              href={`/${article.slug}/`}
              className="text-blue-600 underline"
            >
              {article.title}
            </Link>
            <span className="ml-2 text-sm text-zinc-500">
              {article.category} ・ 更新 {article.updatedAt}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
