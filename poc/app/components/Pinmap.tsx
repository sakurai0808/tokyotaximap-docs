"use client";

import type { PinmapItem } from "@/lib/articles";

export default function Pinmap({ items }: { items: PinmapItem[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.slug}>{item.title}</li>
      ))}
    </ul>
  );
}
