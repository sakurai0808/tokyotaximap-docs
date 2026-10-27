"use client";

import { useSearchParams } from "next/navigation";

export default function SearchResults() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  return q.length > 0 && <p>「{q}」の検索結果</p>;
}
