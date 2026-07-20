# アプリケーション技術設計

## 採用技術

- フレームワーク: Next.js
- ピンマップ: Leaflet
- コンテンツ: Markdown（Git 管理）
- 全文検索: Pagefind

## CMS 方針

現段階では CMS を採用しない。Git と Markdown（front matter 付き）でコンテンツを管理する。

当面はエンジニア 1 人が記事を管理するため、検索・ピンマップ・AI リライトなどプロダクト要件の開発を優先する。将来、非エンジニアの編集者が必要になった段階で導入を検討する。

## コンテンツデータ

Markdown 記事に YAML front matter を付与する。キー定義・編集ルールは [コンテンツモデル・編集方針](../design/content-model.md) を参照。

### URL ルーティング

- 形式: `/{slug}/`（パス prefix なし）
- `slug` は既存 WordPress サイトの英字スラッグを引き継ぐ

### スキーマ検証

ビルド時に front matter を検証する。`category`・`city`・`tags` は enum で制約する。`publishedAt`・`updatedAt` は必須（`YYYY-MM-DD`）。キー定義の詳細は [コンテンツモデル・編集方針](../design/content-model.md) を参照。

### 全文検索・サジェスト

| 対象       | データ源                                   |
| ---------- | ------------------------------------------ |
| 検索       | `title` + `keywords` + 本文 + ミニ単語帳   |
| サジェスト | `title` + `keywords`（表示は常に `title`） |

検索エンジンは **Pagefind** を採用する。600 本規模を前提に、`next build` 後に生成 HTML を読み込み、ビルド時にクライアント向けインデックスを生成する。

選定理由:

- 静的サイト向けで、HTML を食わせるだけで索引を構築できる
- 日本語（CJK）対応が標準で扱いやすい
- サーバー不要・月額コストなし
- FlexSearch + 形態素解析のような追加実装を避け、プロダクト固有の UX に手間を割ける

#### `keywords` の HTML 出力

Pagefind は最終 HTML を索引化する。front matter の `keywords` は記事テンプレートで HTML に埋め込む。

- 本文領域: `data-pagefind-body`
- `keywords`: 画面には出さず、`data-pagefind-meta="keywords"` で hidden 出力（例: `join(", ")`）
- `title`: 通常どおり `h1` に表示（必要なら `data-pagefind-meta="title"` も明示可）
- `keywords: []` のときはメタ要素を出さない
- `tags` は索引に載せない

#### サジェスト UI

Pagefind は索引生成と日本語分割を担当する。要件固有のサジェスト（表示は常に `title`、タップ後に `title` を検索ボックスへ）は React 側で実装する。同梱 UI は PoC 用とし、本番は Pagefind JS API + 自前 UI を想定する。

#### マッチングの段階的拡張

1. Phase 1: `keywords` を前方一致でサジェスト・検索両方に載せる
2. Phase 2: よくあるタイポを `keywords` に運用で蓄積
3. Phase 3: あいまい一致（編集距離・正規化）を検討

### 地図データ

`pinmap: true` の記事のみピンマップに掲載する。位置情報は front matter の `location`（`lat`, `lng`）に保持する。ポップアップ概要文は `summary` を使用する。

## 次のステップ

施設カテゴリ 1 本（ザ・キャピトルホテル東急）で front matter + 本文構成を固めた。続けて次を行う。

- サンプル記事のファイル配置を決める
- 可能なら `pinmap: false` や別カテゴリの 2 本目で条件付きキーの差を確認する
- その後 Next.js での Markdown 読み込み、続けて Pagefind PoC

## 未決定事項

- `tags` の enum リスト
- ホスティング・デプロイ・監視
- ミニ単語帳のデータ形式と Pagefind への載せ方
- サンプル記事のファイル配置
- 地図埋め込みの方式

## Q&A（検討ログ）

### 日時: 2026-07-20 — 全文検索エンジンの選定

**Q. 全文検索の基礎から知りたい。Pagefind / FlexSearch とは何か。**

全文検索は、タイトルだけでなく本文も含めてキーワードで探すこと。高速化のため、あらかじめ「単語 → どの記事にあるか」の索引（転置インデックス）を作る。Pagefind / FlexSearch は、その索引をブラウザ側で使うための道具で、データベースや CMS ではない。

日本語はスペース区切りがないため、単語分割（形態素解析や N-gram / CJK 分割）が必要になる。

**Q. Pagefind と FlexSearch の違いは。**

| | Pagefind | FlexSearch |
| --- | --- | --- |
| 方式 | ビルド後 HTML から索引生成 | JS ライブラリ。索引データは自前で組み立てる |
| 日本語 | CJK 対応が比較的そのまま使える | 追加の工夫（Kuromoji 等）が必要なことが多い |
| UI | 同梱あり（カスタムも可） | 自前 |
| 向く規模 | 静的サイト・数百〜数千ページ | 柔軟なフィールド制御が必要なとき |

**Q. Tokyo Taxi Map ではどちらを選ぶか。**

**Pagefind を採用する。** HTML を食わせる手間の少なさ、日本語対応のしやすさ、600 本・Git + Markdown・ひとり開発という前提に合うため。Algolia 等の外部 SaaS は規模・コスト面で第一候補にしない。

**Q. Pagefind なら全部お任せか。**

いいえ。索引と日本語分割は Pagefind が担うが、次は自前設計が必要。

1. `keywords` を HTML に出す（`data-pagefind-meta`）
2. サジェストの表示ルール（常に `title`）を UI で実装する
3. ミニ単語帳を HTML として存在する形にする
4. Phase 1〜3 の運用（タイポ蓄積など）はそのまま有効

**Q. `keywords` をどう HTML に出力するか。**

記事テンプレートで hidden 要素として埋め込む。

```html
<div hidden aria-hidden="true">
  <span data-pagefind-meta="keywords">ミッドタウン, 六本木ミッド</span>
</div>
```

読者向け表示ではなく検索用の補助データとして扱い、本文と分離する。

**Q. サンプル記事の設計に進んでよいか。**

よい。front matter と検索方針が固まった今が適切なタイミング。未決定の `tags` enum・ホスティング・Pagefind 実装詳細は、サンプル記事を止める理由にはならない。
