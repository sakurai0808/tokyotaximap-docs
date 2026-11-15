import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rows: {
  slug: string;
  index: number;
  mediaId: number;
  sourceUrl: string;
  destPath: string;
}[] = JSON.parse(fs.readFileSync("migration/image-map.json", "utf8"));

for (const [i, row] of rows.entries()) {
  const outPath = path.join("poc/public", row.destPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const res = await fetch(row.sourceUrl);
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = "/tmp/wp-image-src.bin";
  fs.writeFileSync(tmp, buf);

  execFileSync("cwebp", ["-q", "80", tmp, "-o", outPath]);
  console.log(`${i + 1}/${rows.length}`, outPath);
}
