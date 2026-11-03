// ピンマップを表示

"use client";

// Leaflet関連
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { PinmapItem } from "@/lib/articles";

import Link from "next/link";

import type { Category } from "@/lib/schema"; // カテゴリの型をインポート

const categoryColors: Record<Category, string> = {
  // すべてのカテゴリをキーに持ち、値は文字列
  幹線道路: "#7F7F7F",
  交差点: "#D55E00",
  主要駅: "#0072B2",
  施設: "#E69F00",
  通称がある道: "#CC79A7",
  "抜け道・定番ルート": "#56B4E9", // 「・」を含んでいるため、""で囲まないとエラーになる可能性がある
  首都高: "#009E73",
  タクシー基礎: "#7F7F7F",
  主要エリア解説: "#7F7F7F",
  その他お役立ち知識: "#7F7F7F",
};

export default function Pinmap({ items }: { items: PinmapItem[] }) {
  return (
    <MapContainer center={[35.6812, 139.7671]} zoom={13} className="h-[500px]">
      <TileLayer
        url="https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"
        attribution='<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>' // 地理院タイル(淡色地図)
      />
      {items.map((item) => (
        <Marker key={item.slug} position={item.location}>
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
    </MapContainer>
  );
}
