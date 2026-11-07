// ピンマップを表示

"use client";

// Leaflet関連
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";

import type { PinmapItem } from "@/lib/articles";

import Link from "next/link";

import type { Category } from "@/lib/schema"; // カテゴリの型をインポート
import { useState } from "react";

const categoryStyles: Record<Category, { color: string; label: string }> = {
  // すべてのカテゴリをキーに持ち、値は色とラベルの組
  幹線道路: { color: "#7F7F7F", label: "幹" },
  交差点: { color: "#D55E00", label: "交" },
  主要駅: { color: "#0072B2", label: "駅" },
  施設: { color: "#E69F00", label: "施" },
  通称がある道: { color: "#CC79A7", label: "通" },
  "抜け道・定番ルート": { color: "#56B4E9", label: "抜" }, // 「・」を含んでいるため、""で囲まないとエラーになる可能性がある
  首都高: { color: "#009E73", label: "首" },
  タクシー基礎: { color: "#7F7F7F", label: "基" },
  主要エリア解説: { color: "#7F7F7F", label: "エ" },
  その他お役立ち知識: { color: "#7F7F7F", label: "他" },
};

const pinCategories: Category[] = [
  "交差点",
  "主要駅",
  "施設",
  "抜け道・定番ルート",
  "通称がある道",
  "首都高",
];

// ピンのアイコンをつくる関数
function createPinIcon(category: Category) {
  const categoryColor = categoryStyles[category].color; // 2段で項目を取り出す
  const categoryLabel = categoryStyles[category].label;

  return L.divIcon({
    html: `<div class="h-6 w-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-black" style="background-color: ${categoryColor}">${categoryLabel}</div>`,
    className: "pinmap-icon", // 独自の名前(クラス)をつけないとLeaflet標準のデザインがついてしまう
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export default function Pinmap({ items }: { items: PinmapItem[] }) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  ); // カテゴリの選択状態
  const visibleItems =
    selectedCategory === null
      ? items
      : items.filter((item) => item.category === selectedCategory);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={selectedCategory === null}
          onClick={() => setSelectedCategory(null)}
          className={`inline-flex items-center gap-1
                      ${selectedCategory === null ? "font-bold underline" : ""}`}
        >
          すべて
        </button>
        {pinCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            aria-pressed={selectedCategory === cat}
            onClick={() => setSelectedCategory(cat)}
            className={`inline-flex items-center gap-1
                        ${selectedCategory === cat ? "font-bold underline" : ""}`}
          >
            <span
              style={{ backgroundColor: categoryStyles[cat].color }}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-black"
            >
              {categoryStyles[cat].label}
            </span>
            {cat}
          </button>
        ))}
      </div>
      <MapContainer
        center={[35.6812, 139.7671]}
        zoom={13}
        className="h-[500px]"
      >
        <TileLayer
          url="https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"
          attribution='<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>' // 地理院タイル(淡色地図)
        />
        <MarkerClusterGroup
          chunkedLoading // 少しずつ読み込む
          disableClusteringAtZoom={16}
        >
          {visibleItems.map((item) => (
            <Marker
              key={item.slug}
              position={item.location}
              icon={createPinIcon(item.category)}
            >
              <Popup>
                <strong>{item.title}</strong>
                <p>{item.summary}</p>
                <div>
                  {/* GoogleMapのリンクボタン */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${item.location.lat},${item.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GoogleMapで確認
                  </a>
                  {/* タクマップ記事リンクボタン */}
                  <Link href={`/${item.slug}/`}>解説記事を見る</Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </>
  );
}
