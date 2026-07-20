# 「東京都心タクマップ」関連ドキュメント

新人のタクシー運転手にとって役立つ地理知識を学習できるウェブアプリケーション「東京都心タクマップ」の仕様・設計・開発過程をまとめるリポジトリです。

既存の WordPress サイト「[東京都心タクマップ](https://tokyotaximap.com)」を、Next.js を使用したウェブアプリケーションへリニューアルします。

## ドキュメント

### 要件

- [ユーザーと利用目的](./docs/requirements/users.md)
- [機能要件](./docs/requirements/features.md)
- [コンテンツ構造](./docs/requirements/content.md)

### デザイン

見た目・操作・情報の見せ方を扱う。

- [UI・UX 設計](./docs/design/ui-ux.md)
- [コンテンツモデル・編集方針](./docs/design/content-model.md)

### エンジニアリング

システムとしてどう実現し、どう動かすかを扱う。

- [アプリケーション技術設計](./docs/engineering/architecture.md)
- [インフラ設計](./docs/engineering/infrastructure.md)

### 移行・運用

- [WordPress からの移行](./docs/operations/migration.md)
- [コンテンツの編集・公開](./docs/operations/publishing.md)

### 意思決定記録

- [ADR 0001: Next.js を使用する](./docs/decisions/0001-use-nextjs.md)

## 開発・検討ログ

- [`logs/ai/project.md`](./logs/ai/project.md): プロジェクトに関する検討ログ
- [`logs/ai/design.md`](./logs/ai/design.md): デザインに関する検討ログ
- [`logs/ai/images/`](./logs/ai/images/): 画面案などの画像

## 現在の主な未決定事項

- `tags` の enum リスト
- ホスティング・デプロイ・監視
- ミニ単語帳のデータ形式と Pagefind への載せ方
- サンプル記事のファイル配置・本文編集ルールの詳細
