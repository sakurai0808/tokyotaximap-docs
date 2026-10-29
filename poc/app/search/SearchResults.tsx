"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function SearchResults() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();

  useEffect(() => {
    if (q === "") return;

    console.log(q);
  }, [q]);

  return q.length > 0 && <p>「{q}」の検索結果</p>;
}
