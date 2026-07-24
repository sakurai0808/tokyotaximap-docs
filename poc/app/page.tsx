// トップページを描画する(記事一覧の入口)

import Link from "next/link";
import { getAllSlugs } from "@/lib/articles";

// ユーザーがトップ(/)にアクセスしたときに実行
export default function Home() {
  const slugs = getAllSlugs(); // slug一覧を取得(articles.tsで定義した処理を使用)

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">東京都心タクマップ PoC</h1>
      <ul className="list-disc space-y-2 pl-6">
        {slugs.map((slug) => (
          <li key={slug}>
            <Link href={`/${slug}`} className="text-blue-600 underline">
              {slug}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
