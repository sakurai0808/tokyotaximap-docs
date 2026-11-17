// トップページを描画する(記事一覧の入口)

import Link from "next/link";
import { getPinmapItems } from "@/lib/articles";
import { cities, cityPaths } from "@/lib/schema";
import PinmapLoader from "./components/PinmapLoader";

// ユーザーがトップ(/)にアクセスしたときに実行
export default function Home() {
  const pinmapItems = getPinmapItems();

  return (
    <main className="px-6 py-4">
      <PinmapLoader items={pinmapItems} />
      <div className="mx-auto max-w-3xl">
        {/* 「エリアから探す」 */}
        <h2>エリアから探す</h2>
        <div className="flex flex-wrap gap-2">
          {cities.map((c) => (
            <Link
              key={cityPaths[c]}
              href={`/area/${cityPaths[c]}/`}
              className="cursor-pointer rounded-2xl border border-zinc-300 px-3 py-1 text-sm inline-flex items-center gap-1"
            >
              {c}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
