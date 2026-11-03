# 参考資料

デザイン・機能を考えるときに参考にするサイトをまとめる。

## デザイン・UI/UX

- [Zenn](https://zenn.dev/)
  - 特にデザイン、UI/UX。
- [React](https://ja.react.dev/)
  - 検索のサジェストとUXが理想的。入力している間に候補が出て使いやすい。

## ピンマップ・地図アプリ

- [タクシー運転手向けピンマップ（テスト）](https://sample-map-eight.vercel.app/)（[GitHub](https://github.com/sakurai0808/sample-map)）
  - 自作のピンマップ。PoCのピンマップはこれにならって作った。
- [Naimap](https://naimap.figma.site/)
  - マップアプリ。デザインがよい（CARTOのvoyagerを使用）。カテゴリの絞り込みや、一覧表示の発想はここから。
  - 現在は地図が表示されない。タイルの提供元がAPIキー必須になった後、運用されていないようである。
- [SeichiMap](https://www.seichi-map.com/)
  - Naimapと同じような理由で選定。クラスタリングを導入している。
- [安野たかひろ 選挙掲示板マップ](https://anno-poster-map.netlify.app/)（[GitHub](https://github.com/takahiroanno2024/poster-map)）
  - Leafletで、OpenStreetMap、Google Map、地理院タイル（淡色地図）を切り替えられるようにしている。
  - 開発方法に注意点がある。Googleのタイルを正式なAPIを通さずに直接読み込むのは規約上認められていない。OpenStreetMapの標準タイルは、利用方針でアクセスの多いサービスでの常用を控えるよう求められている。詳細は [アプリケーション技術設計](./engineering/architecture.md#ピンマップ) を参照。

## 道路交通情報

- [首都高道路交通状況マップ mew-ti（ミューティー）](https://search.shutoko-eng.jp/rtmap.html)
  - 東京のプロドライバーが、混雑状況の確認のためによく使用するアプリ。
  - ICやJCTといった固有名詞で表現せざるをえないため、アクセスしてから状況を把握するのに時間がかかる。新人ドライバーにフレンドリーな地図とはどのようなものかを考えるための資料。
- [阪神高速](https://www.hanshin-exp.co.jp/drivers/)、[阪神高速はしれGo!](https://www.8405.jp/)
  - 首都高より相当洗練されていると感じるサイト。まず見やすい。
  - トップページで、路線ごとの混雑状況が「◯」「△」「×」のようにわかりやすく表示されている。さらに詳細は「はしれGo!」で確認できる。地図上の色でなんとなく渋滞を把握するしかない首都高とは差がある。

## ブログ・記事

- [阪神高速お役立ちマガジン アレこれ!](https://www.hanshin-exp.co.jp/drivers/blogarekore/)
  - ブログとして綺麗で見やすい。カテゴリやタグの付け方も参考になるかもしれない。

## アクセシビリティ

- [東京都カラーユニバーサルデザインガイドライン](https://www.fukushi.metro.tokyo.lg.jp/documents/d/fukushi/colorudguideline2)
  - 色だけに頼らない配色の考え方。ピンの表示（[UI・UX設計](./design/ui-ux.md#ピンの表示)）で採用した方針の参考。
