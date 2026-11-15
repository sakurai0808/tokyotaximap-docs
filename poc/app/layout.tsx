// 全ページ共通の枠

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "東京都心タクマップ PoC",
  description: "Markdown記事表示とPagefind検索のPoC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="flex items-center justify-between px-16 py-6">
          <Link href="/">東京都心タクマップ</Link>
          <Link
            href={`/search/`}
            className="text-white bg-[#95c7ec] rounded-full px-4 py-2"
          >
            検索
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
