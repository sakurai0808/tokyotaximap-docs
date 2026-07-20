# コンテンツモデル・編集方針

## 管理形式

コンテンツは Markdown で管理する。カテゴリや記事ごとに優先すべき情報は異なるため、編集者が重要なブロックを本文の上部へ配置する。

記事 URL は `https://tokyotaximap.com/{slug}/` 形式とし、パス prefix は付けない。既存 WordPress サイトの英字スラッグを引き継ぐ。

## 重要ブロック

「そのページで強調すべき情報を表示したブロック」を「重要ブロック」と呼ぶ。

例:

- 施設: 車寄せの情報
- 交差点: 右折禁止の情報
- 首都高: 右折禁止の情報

同じカテゴリでも、ドライバーの現場目線では記事ごとに重要項目の順序が異なる。このため、現時点では細かな配置ルールを定めず、記事ごとに判断する。

## 編集ルール

既存の WordPress サイトは自由に編集しながら作成されており、統一ルールが定まっていない。編集ルールは別途言語化し、仕様としてまとめる予定である。

### カテゴリ選定

1 記事 1 カテゴリとする。同じ場所が複数の観点（通称・抜け道など）に当てはまる場合、記事の主題で 1 つを選び、重なりは `tags` や `keywords` で表現する。

- 場所の種類がはっきりしているもの（交差点、主要駅、施設、首都高）はそちらを優先する。
- 道について、主題が「名前の確認」なら `通称がある道`、「走り方・ルート」なら `抜け道・定番ルート` とする。
- `抜け道・定番ルート` カテゴリ内では、地点が特定しやすい抜け道は `pinmap: true`、区間が広い定番ルートは `pinmap: false` とする。

## 検索・サジェスト

検索エンジンは Pagefind を採用する。構築方式・Phase 設計の詳細は [アプリケーション技術設計](../engineering/architecture.md#全文検索サジェスト) を参照。

### 検索インデックス

次を検索対象とする。

- 本文全文
- `title`
- `keywords`
- ミニ単語帳の掲載語（記事 front matter とは別ファイル）

`tags` は検索インデックスには載せない（回遊・関連記事用）。

Pagefind は最終 HTML を索引化するため、front matter の `keywords` は記事テンプレートで HTML に埋め込む（画面には出さず、`data-pagefind-meta="keywords"` で出力）。本文側は `data-pagefind-body` を付ける。

### サジェスト

`title` と `keywords` でマッチさせる。候補の表示文言は常に `title` とし、ヒット元が keyword でもタイトルを表示する。候補をタップすると検索ボックスに `title` が挿入される。

この表示ルールは Pagefind 同梱 UI ではなく、React 側で実装する。

## メタデータ（front matter）

記事のメタデータは YAML front matter で管理する。具体的なスキーマ検証は [アプリケーション技術設計](../engineering/architecture.md) で実装する。

### 必須キー

| キー        | 型       | 説明                                                  |
| ----------- | -------- | ----------------------------------------------------- |
| `title`     | string   | 記事タイトル                                          |
| `slug`      | string   | URL スラッグ（WordPress から引き継ぎ）                |
| `category`  | enum     | [カテゴリ一覧](../requirements/content.md#単語系記事) |
| `city`      | string[] | 所属する区。区なしは `[]`。UI 上は「区から探す」      |
| `keywords`  | string[] | 呼称の揺らぎ。なければ `[]`                           |
| `pinmap`    | boolean  | ピンマップ掲載可否。全記事で `true` / `false` を明示  |
| `thumbnail` | string   | サムネイル画像パス（一覧・SNS 共有用）                |

`city` の取りうる値は次の 6 つ。詳細は [コンテンツ構造](../requirements/content.md#区との紐づけ) を参照。

- 渋谷区、新宿区、中央区、千代田区、港区、都心以外の区

### 条件付きキー

| キー       | 型       | 条件                                            |
| ---------- | -------- | ----------------------------------------------- |
| `location` | object   | `pinmap: true` のとき必須（`lat`, `lng`）       |
| `summary`  | string   | `pinmap: true` のとき必須。ポップアップ用の短文 |
| `youtube`  | string   | 任意。動画がない記事はキーを省略                |
| `tags`     | string[] | 任意。なければ `[]`。enum リストは未確定        |

### 記述例

```yaml
---
title: ザ・キャピトルホテル東急
slug: the-capitol-hotel-tokyu
category: 施設
city: [千代田区]
keywords:
  - キャピトルホテル
  - キャピトルホテル東急
  - 赤坂東急ホテル
tags: []
thumbnail: /images/articles/the-capitol-hotel-tokyu.png
pinmap: true
location:
  lat: 35.673898
  lng: 139.741400
summary: 車寄せへの入口は2つあります。両方とも右折で進入可能です。
youtube: []
---
```

`thumbnail` は記事上部の代表画像 1 枚を指定する。本文に複数画像がある記事（例: タクシー基礎）も、最上部の画像をサムネイルに用いる。
