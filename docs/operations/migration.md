# WordPressからの移行

## 現行サイト

WordPressの既存テーマを使ったウェブサイト「[東京都心タクマップ](https://tokyotaximap.com)」を運営している。

## 移行方針

- WordPressの使用を終了し、Next.jsを使用したサイトへ変更する。
- サイトドメインを引き継ぐ。
- 記事URLを引き継ぐ。
- 現在のブックマークや検索結果から、移行後も同じ記事へ到達できるようにする。

## コンテンツのリライト

既存記事は、リニューアルしたアプリケーションの公開後に順次修正する。

現在のサイトにはすでに一定のアクセスがあるため、次の順序で進めて問題ないと判断する。

1. 新しい技術でデザイン・実装する。
2. リニューアル版をリリースする。
3. 既存記事を順次リライトする。

開発者はデザインとエンジニアリングの初学者であり、1人で開発を進めている。リニューアル時に全記事の情報配置まで変更し終えることは、現実的ではないという事情も考慮する。

## 記事の変換（試験版から使う）

既存のWordPressの記事を、`poc/content/articles/` と同じ形（YAML front matter＋Markdown本文）の下書きに変える。変換の道具はAgentに書いてもらい、ユーザーが出力を確かめて、WordPressにない情報を手で埋める。

### 決めたこと（2026-11-24）

| 項目             | 決定                                                                                |
| ---------------- | ----------------------------------------------------------------------------------- |
| 出力先           | `migration/articles/{slug}.md`（全件）。埋めたあとで `poc/content/articles/` へ移す |
| `updatedAt`      | WordPressの `modified` の日付部分                                                   |
| `thumbnail`      | WordPressの代表画像（`featured_media`）                                             |
| 変換の道具       | `rehype-remark`（HTMLの木をmdastにし、`remark-stringify` で文字にする）             |
| 既存の手書き10本 | 変換の対象に含めるが、`poc/content/articles/` には上書きしない                      |

### 作業の分担

| 作業                                                                          | 担当                                                      |
| ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| 変換スクリプトを書く                                                          | Agent                                                     |
| 出力を読んで、確かめる                                                        | ユーザー（Askモードで一緒に読む。技術の解説もここで行う） |
| WordPressにない front matter の項目を埋める（約300本。1本10〜15分の見積もり） | ユーザー                                                  |
| 本文の確認と、保存後の表示の確認                                              | ユーザー                                                  |

### 入力

- WordPress REST API `https://tokyotaximap.com/wp-json/wp/v2/posts`（認証なしで返る公開中の記事。2026-11-13時点で310本）
- 取得する項目（`_fields`）: `slug`、`title`、`date`、`modified`、`content`、`featured_media`
- `per_page=100` でページを進める（`migration/wp-images.ts` と同じ形）

### 変換ルール

| 項目                                                            | ルール                                                                                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`                                                         | `title.rendered` の HTMLの実体参照（`&amp;` など）を元の文字に戻す                                                                                                       |
| `slug`                                                          | WordPressのslugをそのまま使う                                                                                                                                            |
| `publishedAt`                                                   | `date` の日付部分（`YYYY-MM-DD`）                                                                                                                                        |
| `updatedAt`                                                     | `modified` の日付部分                                                                                                                                                    |
| `tags`                                                          | `[]`                                                                                                                                                                     |
| `thumbnail`                                                     | 代表画像（`featured_media`）の `destPath`（`/images/articles/{slug}/{n}.webp`）。`1.webp` に決め打ちしない（本文に出てこない代表画像は、番号が後ろになることがあるため） |
| `youtube`                                                       | 本文のiframeの `src` から、11文字の動画IDを取り出す。動画がなければキーを省く                                                                                            |
| `category`・`city`・`keywords`・`pinmap`・`location`・`summary` | キーだけ残し、値は書かない。空のままにして、埋め忘れをZodのエラーで見つける（`[]` にすると通ってしまうため）                                                             |
| 本文                                                            | HTMLをMarkdownに変換する。WordPressのブロック用コメント（`<!-- wp:… -->`）は取り除く。対応するMarkdownがない `span`・`div` などは、タグだけ取り除き、中の文字は残す      |
| 画像                                                            | 本文の `wp-image-{id}` の画像のURLを、`migration/image-map.json` の `destPath` に置き換える                                                                              |

### 注意点

- 同じ画像IDが本文に2回以上出ると、`migration/image-map.json` の行が重なる。変換のときは、同じIDを1つにまとめる
- `date` と `modified` は、WordPressの日本時間の日付になる。日付部分だけを使う

### 検証

- 出力したファイルを `poc/lib/schema.ts` で検証する（`node --experimental-strip-types` で読み込む）。空の項目は、エラーとして出ることも確かめる
- 埋めたあとで `poc/content/articles/` へ移し、`npm run build` で記事ページが出ることを確かめる

### 実行の手順

1. `node --experimental-strip-types migration/add-url-images.ts`：本文にURLだけで書かれた画像を、対応表（`migration/image-map.json`）に加えて、`poc/public/images/articles/{slug}/{n}.webp` にダウンロードする（何度実行しても同じ結果。対応表は373行）
2. `node --experimental-strip-types migration/convert-articles.ts`：記事を `migration/articles/{slug}.md` に書き出す（310本。Prettierで整形済み）

依存は `migration/package.json`。`migration/node_modules/` は Git の対象外。

### 変換で自動的に行うこと

- 目次（ez-toc、97本）を取り除く
- Googleマップの埋め込み（197個）を外し、地図の見出しを `## 地図(GoogleMap)` にする
- リンクカードのサムネイルとファビコンを外す（リンクの文字は残す）
- 内部リンクを `/{slug}/` に書き換える（`#` の後ろは残す）
- 見出しの `h4` を `h3` に直す（決めたこと）
- WordPressでも404の画像（6件）は、画像を消し、下書きの一覧に出す（決めたこと）
- URLだけの画像（25件）は、`add-url-images.ts` が対応表に入れた先を使う（決めたこと）

### 人が確かめること（変換の「確認が必要なこと」）

- WordPressでも404の画像を消した6件（一覧に出す）
- YouTubeの埋め込みが2個ある記事（2本）。最初の1つだけ使った
- 内部リンクの書き方が崩れている記事（1件）
- 同じロゴ画像（`cropped-地図　東京タクマップ用.png`）が、複数の記事に入った。記事ごとに1枚ずつ置いているので、同じ画像が増えている。必要かどうかは確かめる
- 検証: 変換直後の `parkhyatt` は、`pinmap` の空で止まる（Zodは分岐ごとに確かめるため、ほかの空の項目のエラーは、`pinmap` を直すまで出ない）。手で埋めると通る

### 決めたこと（2026-11-24）

- 見出し: WordPressの `h4` は、変換で `h3` に直す（`content-model.md` の「h4は誤り、h3が正しい」に合わせる）
- `wp-image-{id}` のない画像（URLだけで書かれた画像）: 対応表に加えて、スクリプトでダウンロードし、`images/articles/{slug}/{n}.webp` に置く
- WordPressでも404の画像: 画像は消し、下書きの一覧に出す
- 出力の整形: 変換のあとにPrettierをかける（空行を整える）
- 内部リンク（試験版の30本に入っていない記事へのリンク）: 残す（2026-11-24 20:06 JST）。試験版では行き先がなく、リンクを押すと404になる。試験版は内々に見てもらい、「リンクは途切れているものも多い」ことを伝えてから見てもらう（2026-11-24 20:51 JST）。本番までに、表示の扱い（文字だけにする、など）を決める
- 主要エリア解説（`category: 主要エリア解説`）の記事: 「基本事項」の見出しと地図を置かない。WordPressでも地図を置いていないため（2026-11-24 20:51 JST）。`pinmap: false` で、`location`・`summary` も書かない
- 強調記号（`*`・`_`）の閉じが記号の後ろにあり、日本語が続く形: 変換で記号を外す（2026-11-24 19:40 JST）。ただし、開きと閉じの記号が対応しない形（`*…_`）は変換では直らないので、記事ごとに手で直す（`kyobashi-exit` で行った）

### 決めていないこと

- 試験版の30本は、PoCの10本に加えて、移行した記事20本で作る。区とジャンルを散らす（2026-11-24に決定）。20本は次のとおり（WordPressの分類から作った候補を、そのまま採用）
  - hakuyosha-shibuya、shinjuku-kuyakusho、showadori-tsukudaohashi、gyoko-street、akabanebashi、about-route-c1、nakano-street-shibuya-nakano、donki-shinjukukabukicho、tokyostation-marunouchi、tokyomidtown-hibiya、azabu-area、shinagawa-station、todaiura、mod、nihonbashinorth、yomiurishibun、sanno-hospital、sangubashi、godzila-head
  - 2026-11-24 19:58 JST の変更: `kyobashi-exit`（首都高、PoCに追加）を残すため、候補から `hotel-gosanke` を外した。候補は19本（+PoC10本+`kyobashi-exit` = 30本）
  - 編集のときに決める: 「目印」「主要エリア」由来のジャンル（`features.md` の決まりで「施設」に含める）、区が無い2本（`shinagawa-station`・`about-route-c1`）の区、`about-route-c1` のジャンル（首都高かタクシー基礎か）
- `updatedAt` に `modified` を使うと、軽い修正でも日付が進む。内容として意味のある更新日かは、記事を埋めるときに確かめる
- リンクカード（WordPressの `lkc` プラグインの、外部サイトの紹介カード）の表現は未決定。変換では削除している（2026-11-24）。30本を作ったあとに考える
- 試験版の目標は、Zennのような読みやすさ（2026-11-24の確認）。見た目の具体的な決めは、30本を作ったあとに行う
