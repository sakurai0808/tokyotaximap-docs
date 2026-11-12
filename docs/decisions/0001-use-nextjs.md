# ADR 0001: Next.jsを使用する

## ステータス

採用

## 決定

WordPressの使用を終了し、リニューアル後のウェブアプリケーションにはNext.jsを使用する。

ピンマップにはLeafletを使用し、コンテンツはMarkdownで管理する。

## 関連する後続決定

- CMS: 採用しない（Git + Markdown）。詳細は [アプリケーション技術設計](../engineering/architecture.md)
- Markdownのメタデータ構造: 決定。詳細は [コンテンツモデル・編集方針](../design/content-model.md)
- 全文検索エンジン: Pagefind。詳細は [アプリケーション技術設計](../engineering/architecture.md#全文検索サジェスト)
- ホスティング: Cloudflare Pages（無料プラン）。詳細は [インフラ設計](../engineering/infrastructure.md#ホスティング)

## 継続して検討する事項

- `tags` のenumリスト
- `poc/` から本実装への移り方（ビルドの設定は [インフラ設計](../engineering/infrastructure.md#ビルドの設定) で決定）
