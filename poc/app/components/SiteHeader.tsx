"use client";

import { useState } from "react";
import Link from "next/link";

export default function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header>
      <Link href="/">東京都心タクマップ</Link>
      <button type="button" onClick={() => setIsOpen(true)}>
        検索
      </button>
      {isOpen && (
        <div>
          <p>検索モーダル(準備中)</p>
          <button type="button" onClick={() => setIsOpen(false)}>
            閉じる
          </button>
        </div>
      )}
    </header>
  );
}
