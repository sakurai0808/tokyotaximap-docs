import { getArticleSummariesByCity } from "@/lib/articles";
import { cities, cityPaths } from "@/lib/schema";
import { notFound } from "next/navigation";

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

  console.log(getArticleSummariesByCity(cityName));

  return <h1>{cityName}</h1>;
}
