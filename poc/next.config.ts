import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true, // 画像最適化のサーバーなしでエクスポート可能にする
  },
  trailingSlash: true, // スラッシュを入れたスラッグ形式に寄せる
};

export default nextConfig;
