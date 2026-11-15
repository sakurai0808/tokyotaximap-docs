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
    <header className="flex items-center justify-between px-6 py-3 border-b">
      <Link href="/">東京都心タクマップ</Link>
      <button type="button" onClick={() => setIsOpen(true)}>
        検索
      </button>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[1100] bg-black/40 p-4 pt-16"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto max-w-3xl rounded-lg bg-white p-4 shadow-lg text-zinc-900"
          >
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2 py-1 text-sm text-zinc-600"
              >
                閉じる
              </button>
            </div>
            <SuggestBox items={items} onAfterSubmit={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
