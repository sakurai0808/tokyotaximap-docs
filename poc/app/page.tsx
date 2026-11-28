// トップページを描画する(記事一覧の入口)

import Link from "next/link";
import { getPinmapItems, getArticleSummaries } from "@/lib/articles";
import { cities, cityPaths } from "@/lib/schema";
import PinmapLoader from "./components/PinmapLoader";
import GenreBrowse from "./components/GenreBrowse";

// ユーザーがトップ(/)にアクセスしたときに実行
export default function Home() {
  const pinmapItems = getPinmapItems();

  const articles = getArticleSummaries();

  return (
    <main className="px-6 py-4 space-y-[50px] md:space-y-[100px]">
      {/* ピンマップ */}
      <PinmapLoader items={pinmapItems} />
      {/* ジャンルから探す */}
      <GenreBrowse articles={articles} />
      {/* 「エリアから探す」 */}
      <div className="mx-auto max-w-[1052px]">
        <h2 className="text-center text-2xl mb-[1em] font-bold">
          エリアから探す
        </h2>
        <div className="flex flex-wrap gap-4">
          {cities.map((c) => (
            <Link
              key={cityPaths[c]}
              href={`/area/${cityPaths[c]}/`}
              className="cursor-pointer rounded-2xl border border-zinc-300 px-[0.75em] py-[0.25em] text-base inline-flex items-center gap-1"
            >
              {c}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
