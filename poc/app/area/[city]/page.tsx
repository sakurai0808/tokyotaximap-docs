// エリア名から記事一覧ページを作成する

import { getArticleSummariesByCity } from "@/lib/articles";
import { cities, cityPaths } from "@/lib/schema";
import { notFound } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{ city: string }>;
};

// どのURLを作るか
export async function generateStaticParams(): Promise<{ city: string }[]> {
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
        <p>このエリアの記事はまだありません。</p>
      ) : (
        <div className="space-y-6">
          {articles.map((article) => (
            <div key={article.slug}>
              {/* .mapでjsxを並べたら必ずkeyを記述 */}
              <Link href={`/${article.slug}/`} className="block">
                {article.title}
              </Link>
              <span className="ml-2 text-sm text-zinc-500">
                {article.category} ・ 更新 {article.updatedAt}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
