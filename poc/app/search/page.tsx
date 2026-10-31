import { getSuggestItems } from "@/lib/articles";
import SuggestBox from "@/app/search/SuggestBox";
import SearchResults from "@/app/search/SearchResults";
import { Suspense } from "react";

export default function SearchPage() {
  const items = getSuggestItems();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">検索</h1>
      <SuggestBox items={items} />
      <Suspense fallback={<p>読み込み中...</p>}>
        <SearchResults />
      </Suspense>
    </main>
  );
}
