// 本文にwp-image-{id}がなく、URLだけで書かれた画像を、対応表に加えてダウンロードする
// 実行: node --experimental-strip-types migration/add-url-images.ts
// 対応表（migration/image-map.json）に行を足し、poc/public/images/articles/{slug}/{n}.webp を作る
// 2回目以降は、もう対応表にある画像を飛ばすので、何度実行しても同じ結果になる

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  SITE,
  fetchAllPosts,
  readImageMap,
  writeImageMap,
  isLinkCardImage,
  imgSrc,
  wpImageId,
  type ImageRow,
} from "./shared.ts";

// WordPressは、画像を小さく書き出すとき、ファイル名の末尾に「-300x212」のような大きさを付ける
// 元の大きさの画像のURLにするため、その部分を取り除く（横幅は元のまま、と決めている）
function originalUrl(url: string): string {
  return url.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1");
}

async function download(url: string): Promise<Buffer | undefined> {
  const res = await fetch(url);
  if (!res.ok) return undefined;
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const posts = await fetchAllPosts();
  const rows = readImageMap();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "url-images-"));

  let added = 0;
  const failed: string[] = [];
  const skippedExternal: string[] = [];

  for (const post of posts) {
    const html = post.content.rendered.replace(/<!--[\s\S]*?-->/g, "");
    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      const tag = m[0];
      if (isLinkCardImage(tag) || wpImageId(tag) !== undefined) continue;

      const src = imgSrc(tag);
      if (!src) continue;

      // 同じ記事に、同じsrcの行がもうあるなら飛ばす
      if (rows.some((r) => r.slug === post.slug && r.srcInContent === src)) continue;

      // 「//」で始まるURLは https: を付けて、自サイトのURLか確かめる
      const absolute = src.startsWith("//") ? `https:${src}` : src;
      if (!absolute.startsWith(`${SITE}/`)) {
        skippedExternal.push(`${post.slug}: ${src}`);
        continue;
      }

      // 元の大きさを優先し、無ければ本文のURLのまま取る
      let buf = await download(originalUrl(absolute));
      let usedUrl = originalUrl(absolute);
      if (!buf) {
        buf = await download(absolute);
        usedUrl = absolute;
      }
      if (!buf) {
        failed.push(`${post.slug}: ダウンロードできない: ${src}`);
        continue;
      }

      // 番号は、その記事の一番大きい番号の次にする（既存の番号と重ならないように）
      const maxIndex = Math.max(0, ...rows.filter((r) => r.slug === post.slug).map((r) => r.index));
      const index = maxIndex + 1;
      const destPath = `images/articles/${post.slug}/${index}.webp`;
      const outPath = path.join("poc/public", destPath);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });

      const tmpFile = path.join(tmpDir, `src-${post.slug}-${index}.bin`);
      fs.writeFileSync(tmpFile, buf);
      execFileSync("cwebp", ["-q", "80", tmpFile, "-o", outPath]);

      rows.push({
        slug: post.slug,
        index,
        mediaId: null,
        sourceUrl: usedUrl,
        srcInContent: src,
        destPath,
      });
      added++;
      console.log(`追加: ${outPath}（${usedUrl}）`);
    }
  }

  writeImageMap(rows);
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`\n対応表に追加: ${added}件（対応表は ${rows.length}行）`);
  if (skippedExternal.length) {
    console.log(`自サイトではないURLで、飛ばした: ${skippedExternal.length}件`);
    for (const s of skippedExternal) console.log(`  - ${s}`);
  }
  if (failed.length) {
    console.log(`取れなかった: ${failed.length}件`);
    for (const f of failed) console.log(`  - ${f}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
