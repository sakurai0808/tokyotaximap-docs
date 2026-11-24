// 移行スクリプトで共通に使うもの（記事の取得、対応表の読み書き、画像タグの見分け方）

import fs from "node:fs";

export const SITE = "https://tokyotaximap.com";
export const IMAGE_MAP_PATH = "migration/image-map.json"; // wp-images.ts が作る対応表

// WordPressの記事のうち、使う項目だけ
export type WpPost = {
  id: number;
  slug: string;
  date: string; // 公開日。例: 2024-10-23T17:27:13（日本時間）
  modified: string; // 最終更新日
  title: { rendered: string };
  content: { rendered: string };
  featured_media: number; // 代表画像のID（0は代表画像なし）
};

// 対応表の1行（migration/image-map.json）
export type ImageRow = {
  slug: string;
  index: number; // 記事の中での番号（1始まり）
  mediaId: number | null; // WordPressの画像ID。本文にURLだけで書かれた画像は null
  sourceUrl: string; // ダウンロードしたURL
  srcInContent?: string; // 本文に書かれていたsrc（URLだけの画像で使う）
  destPath: string; // 例: images/articles/parkhyatt/1.webp
};

// 1. 記事を全ページ取得する（総ページ数はレスポンスのヘッダーから読む）
export async function fetchAllPosts(): Promise<WpPost[]> {
  const fields = "id,slug,date,modified,title,content,featured_media";
  const first = await fetch(
    `${SITE}/wp-json/wp/v2/posts?per_page=100&page=1&_fields=${fields}`,
  );
  if (!first.ok) throw new Error(`記事の取得に失敗（1ページ目）: ${first.status}`);
  const totalPages = Number(first.headers.get("x-wp-totalpages"));
  const posts: WpPost[] = await first.json();

  for (let page = 2; page <= totalPages; page++) {
    const res = await fetch(
      `${SITE}/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=${fields}`,
    );
    if (!res.ok) throw new Error(`記事の取得に失敗（${page}ページ目）: ${res.status}`);
    posts.push(...(await res.json()));
  }
  return posts;
}

export function readImageMap(): ImageRow[] {
  return JSON.parse(fs.readFileSync(IMAGE_MAP_PATH, "utf8"));
}

export function writeImageMap(rows: ImageRow[]): void {
  fs.writeFileSync(IMAGE_MAP_PATH, JSON.stringify(rows, null, 2));
}

// 画像タグ（<img ...>）の見分け方
// リンクカード（プラグイン lkc-）のサムネイルと、ファビコンは、本文の画像ではない
export function isLinkCardImage(tag: string): boolean {
  return /class="[^"]*\blkc-/.test(tag) || /google\.com\/s2\/favicons/.test(tag);
}

export function imgSrc(tag: string): string | undefined {
  return tag.match(/\ssrc="([^"]*)"/)?.[1];
}

export function wpImageId(tag: string): number | undefined {
  const m = tag.match(/wp-image-(\d+)/);
  return m ? Number(m[1]) : undefined;
}
