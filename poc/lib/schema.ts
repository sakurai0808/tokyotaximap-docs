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

// 区名
export const cities = [
  "渋谷区",
  "新宿区",
  "中央区",
  "千代田区",
  "港区",
  "都心以外の区",
] as const;

const dateSchema = z.date().transform((d) => d.toISOString().slice(0, 10)); // Dateとして受け取り、YYYY-MM-DDの文字列に変換する

const baseSchema = z.object({
  title: z.string().min(1),
  slug: z.string(),
  category: z.enum(categories),
  city: z.array(z.enum(cities)),
  keywords: z.array(z.string()),
  publishedAt: dateSchema,
  updatedAt: dateSchema,
  tags: z.array(z.string()),
  thumbnail: z.string(),
  youtube: z.string().optional(),
});

export const articleSchema = z.discriminatedUnion("pinmap", [
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
