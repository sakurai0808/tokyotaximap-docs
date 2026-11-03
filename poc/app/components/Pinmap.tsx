// ピンマップを表示

"use client";

// Leaflet関連
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { PinmapItem } from "@/lib/articles";

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
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
