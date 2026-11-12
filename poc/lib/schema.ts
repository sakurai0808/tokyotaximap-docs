// Zodでスキーマ検証

import { z } from "zod";

// カテゴリ
export const categories = [
  "幹線道路",
  "交差点",
  "主要駅",
  "施設",
  "通称がある道",
  "抜け道・定番ルート",
  "首都高",
  "タクシー基礎",
  "主要エリア解説",
  "その他お役立ち知識",
] as const; // 配列の型を具体的な値の集まりにできる

export type Category = (typeof categories)[number];

// 区名
export const cities = [
  "渋谷区",
  "新宿区",
  "中央区",
  "千代田区",
  "港区",
  "都心以外の区",
] as const; // 値の一覧を型として使うので、「as const」

export type City = (typeof cities)[number];

export const cityPaths: Record<City, string> = {
  渋谷区: "shibuya",
  新宿区: "shinjuku",
  中央区: "chuo",
  千代田区: "chiyoda",
  港区: "minato",
  都心以外の区: "others",
};

const dateSchema = z.date().transform((d) => d.toISOString().slice(0, 10)); // Dateとして受け取り、YYYY-MM-DDの文字列に変換する

// front matterのルールを決める
// メソッドチェーンの順番に注意。中身を確かめるルールを先に書き、包むものは最後に記述する
const baseSchema = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .regex(
      /^[a-z0-9_-]+$/,
      "slugに使えるのは英小文字・数字・アンダースコア・ハイフンです",
    ), // スラッグを縛る
  category: z.enum(categories),
  city: z.array(z.enum(cities)),
  keywords: z.array(z.string()),
  publishedAt: dateSchema,
  updatedAt: dateSchema,
  tags: z.array(z.string()),
  thumbnail: z.string(),
  youtube: z
    .string()
    .regex(
      /^[A-Za-z0-9_-]{11}$/,
      "YouTubeの動画IDは11文字の英数字・_・-で書きます。URLではないことに注意してください",
    )
    .optional(),
});

export const articleSchema = z.discriminatedUnion("pinmap", [
  // pinmapの値によって使うルールを決める
  baseSchema.extend({
    pinmap: z.literal(true),
    location: z.object({ lat: z.number(), lng: z.number() }),
    summary: z.string().min(1),
  }),
  baseSchema.extend({
    pinmap: z.literal(false),
  }),
]);

export type ArticleFrontMatter = z.infer<typeof articleSchema>;
