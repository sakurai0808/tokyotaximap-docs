# ADR 0001: Next.jsを使用する

## ステータス

採用

## 決定

WordPressの使用を終了し、リニューアル後のウェブアプリケーションにはNext.jsを使用する。

ピンマップにはLeafletを使用し、コンテンツはMarkdownで管理する。

## 関連する後続決定

- CMS: 採用しない（Git + Markdown）。詳細は [アプリケーション技術設計](../engineering/architecture.md)
- Markdown のメタデータ構造: 決定。詳細は [コンテンツモデル・編集方針](../design/content-model.md)

## 継続して検討する事項

- 全文検索エンジンの選定
- `tags` の enum リスト
- ホスティングおよびデプロイ環境
