# 「東京都心タクマップ」関連ドキュメント

新人のタクシー運転手にとって役立つ地理知識を学習できるウェブアプリケーション「東京都心タクマップ」の仕様・設計・開発過程をまとめるリポジトリです。

既存のWordPressサイト「[東京都心タクマップ](https://tokyotaximap.com)」を、Next.jsを使用したウェブアプリケーションへリニューアルします。

## ドキュメント

### 要件

- [ユーザーと利用目的](./docs/requirements/users.md)
- [機能要件](./docs/requirements/features.md)
- [コンテンツ構造](./docs/requirements/content.md)

### デザイン

見た目・操作・情報の見せ方を扱う。

- [UI・UX設計](./docs/design/ui-ux.md)
- [コンテンツモデル・編集方針](./docs/design/content-model.md)
- 設計サンプル: [ザ・キャピトルホテル東急](./docs/design/samples/articles/the-capitol-hotel-tokyu.md)

### エンジニアリング

システムとしてどう実現し、どう動かすかを扱う。

- [アプリケーション技術設計](./docs/engineering/architecture.md)
- [インフラ設計](./docs/engineering/infrastructure.md)

### 移行・運用

- [WordPressからの移行](./docs/operations/migration.md)
- [コンテンツの編集・公開](./docs/operations/publishing.md)

### 意思決定記録

- [ADR 0001: Next.jsを使用する](./docs/decisions/0001-use-nextjs.md)

### 参考資料

- [参考資料](./docs/references.md): デザイン・機能を考えるときに参考にするサイト

## 開発・検討ログ

- [`logs/ai/project.md`](./logs/ai/project.md): プロジェクトに関する検討ログ
- [`logs/ai/design.md`](./logs/ai/design.md): デザインに関する検討ログ
- [`logs/ai/images/`](./logs/ai/images/): 画面案などの画像

## 最初の公開

既存の約300本を移行し、検索・ピンマップ・記事ページ・区から探すで公開する。QRコードによる共有、さくいん、ミニ単語帳は公開後に追加する。公開時期の目安は2027年2〜3月（試験版は2026年12月下旬）。詳細は [機能要件](./docs/requirements/features.md#最初の公開の範囲) を参照。

## 現在の主な未決定事項

- `tags` のenumリスト
- ホスティング・デプロイ・監視
- ミニ単語帳のデータ形式とPagefindへの載せ方（最初の公開後）
- 地図埋め込みの方式
