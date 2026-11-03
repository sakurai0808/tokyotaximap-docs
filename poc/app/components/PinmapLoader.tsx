// page.tsxとPinmap.tsxの中継役。クライアントコンポーネントをはさむことで「ssr: false」を記述できる

"use client";

import dynamic from "next/dynamic";
import type { PinmapItem } from "@/lib/articles";

const Pinmap = dynamic(() => import("./Pinmap"), {
  ssr: false,
  loading: () => <p>地図を読み込んでいます...</p>,
});

export default function PinmapLoader({ items }: { items: PinmapItem[] }) {
  return <Pinmap items={items} />;
}
