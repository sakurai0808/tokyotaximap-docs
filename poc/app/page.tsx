// トップページを描画する(記事一覧の入口)

import Link from "next/link";
import { getArticleSummaries } from "@/lib/articles";

// ユーザーがトップ(/)にアクセスしたときに実行
export default function Home() {
  const articles = getArticleSummaries(); // 中身はオブジェクト

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">東京都心タクマップ PoC</h1>
      <ul className="list-disc space-y-2 pl-6">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link href={`/${article.slug}`} className="text-blue-600 underline">
              {article.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
