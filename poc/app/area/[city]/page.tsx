// 区名から記事一覧ページを作成する

import { getArticleSummariesByCity } from "@/lib/articles";
import { cities, cityPaths } from "@/lib/schema";
import { notFound } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{ city: string }>;
};

// どのURLを作るか
export async function generateStaticParams() {
  return Object.values(cityPaths).map((city) => ({ city }));
}

export default async function CityPage({ params }: PageProps) {
  const { city } = await params;
  const cityName = cities.find((c) => city === cityPaths[c]);

  if (!cityName) {
    notFound();
  }

  const articles = getArticleSummariesByCity(cityName); // 記事の一覧を作成

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">{cityName}</h1>
      {articles.length === 0 ? (
        <p>この区の記事はまだありません</p>
      ) : (
        <ul className="list-disc space-y-2 pl-6">
          {articles.map((article) => (
            <li key={article.slug}>
              {/* .mapでjsxを並べたら必ずkeyを記述 */}
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
      )}
    </main>
  );
}
