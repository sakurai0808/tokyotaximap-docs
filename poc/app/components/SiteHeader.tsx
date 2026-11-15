"use client";

import { useState } from "react";
import { useEffect } from "react";
import Link from "next/link";

import type { SuggestItem } from "@/lib/articles";
import SuggestBox from "../search/SuggestBox";

export default function SiteHeader({ items }: { items: SuggestItem[] }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // そもそも閉じているときはリターン
    if (!isOpen) return;

    // Escが押されたとき、閉じる
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown); //1つめはkeydownイベント、2つめは自作の関数のこと
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <header>
      <Link href="/">東京都心タクマップ</Link>
      <button type="button" onClick={() => setIsOpen(true)}>
        検索
      </button>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/40"
        >
          <div onClick={(e) => e.stopPropagation()}>
            <SuggestBox items={items} onAfterSubmit={() => setIsOpen(false)} />
            <button type="button" onClick={() => setIsOpen(false)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
