# アプリケーション技術設計

## 採用技術

- フレームワーク: Next.js
- ピンマップ: Leaflet（react-leaflet）。ベースマップは地理院タイル（淡色地図）
- コンテンツ: Markdown（Git管理）
- 全文検索: Pagefind

## CMS方針

現段階ではCMSを採用しない。GitとMarkdown（front matter付き）でコンテンツを管理する。

当面はエンジニア1人が記事を管理するため、検索・ピンマップ・AIリライトなどプロダクト要件の開発を優先する。将来、非エンジニアの編集者が必要になった段階で導入を検討する。

## コンテンツデータ

Markdown記事にYAML front matterを付与する。キー定義・編集ルールは [コンテンツモデル・編集方針](../design/content-model.md) を参照。

### ファイル配置

- 設計サンプル（本リポジトリ）: `docs/design/samples/articles/{slug}.md`
- 実装リポジトリ（将来）: `content/articles/{slug}.md`
- サムネイル: `public/images/articles/`（`thumbnail` と対応）
- カテゴリ別フォルダは使わない（URLは `/{slug}/`。カテゴリはfront matter）

設計サンプル: [ザ・キャピトルホテル東急](../design/samples/articles/the-capitol-hotel-tokyu.md)

### URLルーティング

- 形式: `/{slug}/`（パスprefixなし）
- `slug` は既存WordPressサイトの英字スラッグを引き継ぐ。2026-11-13にWordPressのREST API（`/wp-json/wp/v2/posts`）で公開中の記事310本のslugを調べたところ、16本に `_` が入っていた（`hitotsubashi_exit`、`yasukuni-street_chiyodaku_chuoku` など）。URLを変えずに引き継ぐため、slugに `_` を使えるようにした。使えない名前（`area`・`search`・`pagefind`・`404`）と重なる記事はなかった
- 区から探すのページは `/area/{英字}/`（例: `/area/chiyoda/`）。詳しくは [区から探す](#区から探す)
- 記事と同じ階層にあるページ・フォルダの名前（`area`・`search`・`pagefind`・`404`）は、記事の `slug` に使えない（ビルド時に検証）
- 現行のWordPressには固定ページが6つある（2026-11-14にREST API `/wp-json/wp/v2/pages` で確認）。固定ページも記事と同じ `/{slug}/` の形のURLなので、Next.jsのページとして作ったら、その名前を `reservedSlugs` にも足す。扱いは未決定

| slug | タイトル | 最初の公開での扱い（案） |
|---|---|---|
| `home` | （トップページ） | `/` のピンマップのページになる |
| `howtouse` | このウェブサイトの使い方 | 移す |
| `what-is-tokyotaximap` | 「東京都心タクマップ」を作った経緯 | 移す |
| `privacy-policy-2` | プライバシーポリシー | 移す。AdSenseを貼るのでなくてはならない |
| `mini-wordbook` | ミニ単語帳 | 公開後の機能。それまでのURLの扱いを決める |
| `index` | さくいん | 公開後の機能。それまでのURLの扱いを決める |

### スキーマ検証

ビルド時にfront matterを検証する。`category`・`city`・`tags` はenumで制約する。`publishedAt`・`updatedAt` は必須（`YYYY-MM-DD`）。キー定義の詳細は [コンテンツモデル・編集方針](../design/content-model.md) を参照。

PoCでは **Zod** で実装した（`poc/lib/schema.ts`）。

- スキーマから実行時の検証と型（`z.infer`）を同時に得る。読み込み側（`poc/lib/articles.ts`）で `as` による型付けはしない
- `category`・`city` は定数配列（`as const`）を `z.enum()` に渡す。`tags` はenumリストが未決定のため、当面は文字列の配列
- 条件付きキーは `pinmap` を識別子とする `z.discriminatedUnion` で表す。`pinmap: true` なら `location`・`summary` が必須、`false` なら持たない
- 日付はYAMLパーサーが `Date` として渡すため、`Date` として検証し `YYYY-MM-DD` の文字列に変換する
- 検証に失敗したらビルドを止める。エラーには記事のファイル名と違反したキーを表示する
- `youtube` は動画IDだけを書き、`z.string().regex(/^[A-Za-z0-9_-]{11}$/, "…").optional()` で形を確かめる。URLを書くとビルドが止まる。`^`・`$` がないと、URLの中の11文字に当たって通ってしまう
- front matterの `slug` とファイル名（`{slug}.md`）が一致しなければビルドを止める。URLはファイル名から作るので、一致を確かめないとfront matterの `slug` の間違いに気づけない。エラーにはファイル名とfront matterの値を表示する。Zodの検証の後に確かめる（検証前の値は型が `any` のため）
- `slug` が `area`・`search`・`pagefind`・`404` のどれかならビルドを止める（`poc/lib/articles.ts` の `reservedSlugs`）。記事とほかのページが同じURLを作ろうとしても、ビルドはエラーにならず、片方だけが書き出される（`slug: search` の実験では検索ページが残り、記事はURLでも検索でも見つからなくなった）。一覧は `as const` を付けない `string[]` にする（付けると `reservedSlugs.includes(slug)` に `string` を渡せず、TypeScriptのエラーになる）
- `slug` の1文字目は英小文字か数字、2文字目からは英小文字・数字・アンダースコア・ハイフン。1文字以上（`z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, "…")`）。大文字・空のslug・`_` や `-` で始まるslugはZodの検証でビルドを止める
  - `[a-z0-9]` は後ろに何も付けないので、ちょうど1文字。そのあとの `[a-z0-9_-]*` は `*`（0回以上）なので、`a` の1文字だけでも通る。空のslugは1文字目の `[a-z0-9]` で止まる
  - `[ ]` の中の `-` は2つの文字の間では「〜から〜まで」になるので、文字そのものの `-` はいちばん最後に置く
  - `_` を使えるのは、既存WordPressの16本のslugに `_` があるため（[URLルーティング](#urlルーティング)）。1文字目を縛るのは、`out/` のいちばん上にある `_next/`（JavaScriptなどの部品）・`_not-found/`・`_headers`（Cloudflare Pagesの設定）とぶつからないようにするため。`_` だけを許して1文字目を縛らないと、`_next` のようなslugがエラーにならずに通ってしまう
  - ハイフンの位置のうち、`-` で始まる形（`-abc`）は1文字目の縛りで止まる。`-` が続く形（`a--b`）と `-` で終わる形（`abc-`）はまだ縛っていない（既存の310本にはない）
  - エラーの文は「slugを確認してください。1文字目は英小文字か数字のみが使えます。2文字目以降は英小文字、数字、ハイフン、アンダースコアが使用できます。」。決まりを変えたら、エラーの文も合わせて直す
- 確かめる順番は、Zodの検証 → ファイル名との一致 → 使えない `slug`。`throw` でそこで止まるので、エラーは最初に引っかかった1つだけが出る

### 全文検索・サジェスト

| 対象       | データ源                                   |
| ---------- | ------------------------------------------ |
| 検索       | `title` + `keywords` + 本文 + ミニ単語帳   |
| サジェスト | `title` + `keywords`（表示は常に `title`） |

ミニ単語帳は最初の公開に含めないため（[機能要件](../requirements/features.md#最初の公開の範囲)）、公開時点の検索対象は `title` + `keywords` + 本文とする。

検索エンジンは **Pagefind** を採用する。600本規模を前提に、`next build` 後に生成HTMLを読み込み、ビルド時にクライアント向けインデックスを生成する。

選定理由:

- 静的サイト向けで、HTMLを食わせるだけで索引を構築できる
- 日本語（CJK）対応が標準で扱いやすい
- サーバー不要・月額コストなし
- FlexSearch + 形態素解析のような追加実装を避け、プロダクト固有のUXに手間を割ける

#### `keywords` のHTML出力

Pagefindは最終HTMLを索引化する。front matterの `keywords` は記事テンプレートでHTMLに埋め込む。

- 本文領域: `data-pagefind-body`
- `keywords`: 画面には出さず、`data-pagefind-meta="keywords"` でhidden出力（例: `join(", ")`）
- `title`: 通常どおり `h1` に表示（必要なら `data-pagefind-meta="title"` も明示可）
- `keywords: []` のときはメタ要素を出さない
- `tags` は索引に載せない

#### 検索機能のメモ

テスト記事1つ目「キャピトルホテル東急」の検索をかける場合の実験のメモ

| 検索語         | 確かめたいこと                                                       | 結果                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| キャピトル     | タイトルの一部でヒットするか                                         | ヒットする                                                                                                                                              |
| 赤坂東急ホテル | 本文にないkeywordsでヒットするか（メタ情報も検索対象になる）         | ヒットする                                                                                                                                              |
| スロープ       | 本文の言葉でヒットするか                                             | ヒットする                                                                                                                                              |
| 永田町         | 住所の言葉でヒットするか                                             | ヒットする                                                                                                                                              |
| 東急/赤坂      | 長い言葉の一部でヒットするか（日本語の区切り方の確認）               | ヒットする                                                                                                                                              |
| 2024           | 日付がdata-pagefind-ignoreで除外されているか（ヒットしないのが正解） | 日付は除外されている（同じく2024年の日付を持つ赤坂通りはヒットしない）。キャピトルホテル東急だけヒットするのは、本文の「2」（住所など）によるもの（[日本語の区切り方と一致のきまり](#日本語の区切り方と一致のきまり)のきまりB） |

テスト記事2つ目「赤坂通り」を加えた後のメモ
|検索語|確かめたいこと|結果|
|---|---|---|
|赤坂|2件ヒットするか|ヒットする|
|山王下|2件ヒットするか|ヒットする|

検索結果の一覧を自前UIにした後のメモ

| 検索語     | 確かめたいこと                         | 結果                                                                                                                     |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 赤坂       | 自前UIの一覧に2件出るか                | 2件出る（タイトルのリンクと抜粋）                                                                                         |
| キャピトル | 1件だけ出るか                          | 1件出る                                                                                                                  |
| 銀座       | どの記事にもない語で0件になるか        | 0件（「見つかりませんでした」）。2本の記事に「銀」も「座」もない                                                         |
| なああああ | 意味のない語で0件になるか              | 2件ヒットする。抜粋の「な」「ない」がハイライトされる。検索語が「な」「ああ」「ああ」に区切られ、「な」がきまりAで当たり、「ああ」はきまりCで捨てられる（[日本語の区切り方と一致のきまり](#日本語の区切り方と一致のきまり)） |

#### サジェストUI

Pagefindは索引生成と日本語分割を担当する。要件固有のサジェスト（表示は常に `title`、タップ後に `title` を検索ボックスへ）はReact側で実装する。

サジェストの候補はPagefindではなく、記事データから探す。Pagefindは本文も検索するため、`title` と `keywords` だけでマッチさせる要件より広く拾ってしまう。

- サーバーコンポーネントで全記事の `slug`・`title`・`keywords` を集め、propsでクライアントコンポーネントに渡す（PoC: `poc/app/search/SuggestBox.tsx`）
- 前後の空白を取り除いた入力で、`title` と `keywords` を部分一致で絞り込む。入力が空なら候補を出さない
- 候補をタップすると入力欄に `title` を入れ、候補を閉じる。再び入力すると開く

#### 検索結果の一覧

検索結果の一覧は、Pagefind JS API + 自前UIで表示する。同梱のComponent UI（`<pagefind-input>` など）は使わない（PoCで置き換え済み）。

検索語はURLに載せる（`/search/?q=赤坂`）。

- 固定ヘッダーの検索ボックスからも「`/search/?q=...` へ移動する」形で使い回せる。要件の「検索ボタンのあとに記事一覧ページを必ず挟む」にもそのまま合う
- 記事を開いてからブラウザで戻ると、同じ結果一覧に戻れる

構成（PoC）:

- `poc/app/search/SuggestBox.tsx`: 入力欄を `next/form` の `<Form action="/search/">` で囲み、入力欄に `name="q"` を付ける。検索ボタンかEnterで、ページを読み直さずに `?q=` 付きのURLへ移動する
- `poc/app/search/SearchResults.tsx`（クライアントコンポーネント）: `useSearchParams` で `q` を読み、`q` が変わるたびにPagefindで検索して、タイトル（記事へのリンク）と抜粋を一覧表示する
- `poc/app/search/page.tsx`: `SearchResults` を `<Suspense>` で囲む。静的エクスポートではビルド時に `?q=` が決まらないため、サーバーコンポーネントの `searchParams` は使えない。囲まないと本番ビルドが止まる

実装上の決まり:

- `/pagefind/pagefind.js` は `next build` のあとに `pagefind` が生成するため、ビルド時には存在しない。`useEffect` の中で `import(/* webpackIgnore: true */ pagefindPath)` とし、Turbopackに束ねさせずブラウザで読み込む。パスは変数に入れる（文字列を直接書くとTypeScriptがエラーを出す）
- ブラウザの検索APIの型はPagefindが提供しないので、使う項目（`url`・`excerpt`・`meta.title`）だけ自前で定義する
- 抜粋（`excerpt`）は `<mark>` 付きのHTML文字列なので、`dangerouslySetInnerHTML` で表示する。索引は自分の記事から作られ、Pagefindが付け足すのは `<mark>` だけなので許容する
- 表示は4状態。`q` が空なら何も出さない、検索中、0件（「見つかりませんでした」）、一覧。検索中かどうかは `results` から計算できないので、`isLoading` のstateで持つ（初期値は `true`）

確認はビルド後に行う（devには `pagefind.js` がない）。ビルドし直したら、開いたままのタブは古いコードで動き続けるので、ページを読み直してから確認する。

#### 日本語の区切り方と一致のきまり

検索は本文そのものではなく、ビルド時に本文を単語に区切って作った索引と、検索語を照らし合わせる。区切る仕組みは2か所で別のもの。

| 区切る場面 | 仕組み | 例 |
| --- | --- | --- |
| ビルド（本文の索引） | `pagefind_extended` の中の `charabia`（日本語の辞書）。細かい単位で区切る。同じ語でも前後で区切りが変わる | 「新幹線」→「新」「幹線」、「美術館」→「美術」「館」、「交差点」→「交差」「点」、「赤坂見附」→「赤坂」「見附」、「2024年」→「2」「0」「2」「4」「年」。見出しの「東京駅(八重洲口)」は「東」「京」「駅」、本文の「東京駅の」は「東京」「駅」 |
| ブラウザ（検索語） | `pagefind.js` の中の `Intl.Segmenter`（ブラウザの辞書） | 「新幹線」「交差点」「2024」は1語のまま。「なああああ」→「な」「ああ」「ああ」、「赤坂見附」→「赤坂」「見附」 |

検索語の1語ずつを、索引の単語と次の3つのきまりで照らし合わせる（Pagefind v1.5.2 の [`pagefind_web/src/search.rs`](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web/src/search.rs) の `find_word_extensions` と `search_term`）。

- きまりA（前方一致）: 検索語で始まる単語をすべて拾う。検索語とぴったり同じ単語も含む。「な」→「な」「ない」「など」「なり」「なる」
- きまりB（逆向きの前方一致）: Aで1つもないときだけ、検索語の先頭部分と同じ単語のうち、いちばん長いものを1つ拾う。「2024」→「2」、「新幹線」→「新」、「交差点」→「交」「交差」のうち「交差」
- きまりC（見つからない語は捨てる）: 複数の語はAND（すべて含む）だが、AとBで何も見つからない語は条件から外す。すべての語が見つからないときだけ0件。「なああああ」は「な」だけの検索と同じ結果になり、「ああ」は0件

本実装への影響:

- 数字・ひらがな・索引にない語を含む検索語は、短い単語に置き換わったり、黙って捨てられたりして、関係の薄い記事まで当たる。利用者には見分けられない（「赤坂見附」は、記事に「見附」がなければ「赤坂」だけの検索になる。記事に「赤坂見附」が入れば「見附」の単語ができ、絞り込みに使われる）
- 本文の「2024年」も1桁ずつ区切られるので、年号で記事を絞ることは期待できない
- 単語の長さの差が大きいほどスコアが下がる（`word_length_bonus`）ので、置き換わった単語で当たった記事は並び順の下のほうに来ると考えられる（未確認）
- 対策は本実装で決める。候補は、そのまま受け入れる、表示の側で検索語そのものを含む記事を上に並べる、引用符 `"…"` で囲む完全一致検索を使う（`pagefind.js` に `exact_search` の処理がある。動きは未確認）

確かめ方: 本文の区切りは `out/pagefind/fragment/` を展開して確かめた（単語の間にゼロ幅スペースが入る）。検索語の区切りはNode.jsの `Intl.Segmenter` で確かめた（ブラウザによって少し違う可能性がある）。「赤坂見附」「2024年」などは、リポジトリの外に作った1ページだけのサイトで区切りを確かめた。ブラウザでは、「ああ」が0件、「新幹線」が東京駅(八重洲口)の1件で、予想どおりだった。

#### マッチングの段階的拡張

1. Phase 1: `keywords` をサジェスト・検索両方に載せる。サジェストは部分一致（前方一致だと、先頭に「ザ・」が付くtitleなどを取りこぼすため）
2. Phase 2: よくあるタイポを `keywords` に運用で蓄積
3. Phase 3: あいまい一致（編集距離・正規化）を検討

### 地図データ

`pinmap: true` の記事のみピンマップに掲載する。位置情報はfront matterの `location`（`lat`, `lng`）に保持する。ポップアップ概要文は `summary` を使用する。

カテゴリごとの掲載の目安は [機能要件](../requirements/features.md#ピンマップ) にあるが、スキーマではカテゴリと `pinmap` の組み合わせを制限しない。「抜け道・定番ルート」のように同じカテゴリの中で分かれるものがあるため、記事ごとの `pinmap` を正とする。

#### ピンマップ

構成（PoC）:

- `poc/lib/articles.ts` の `getPinmapItems()`: 全記事から `pinmap: true` のものだけを選び、`slug`・`title`・`category`・`location`・`summary` を集める。`pinmap` で型が絞り込まれるので、`if (frontMatter.pinmap)` の中でだけ `location`・`summary` を使える
- `poc/app/page.tsx`（サーバーコンポーネント）: `getPinmapItems()` を呼び、`PinmapLoader` にpropsで渡す
- `poc/app/components/PinmapLoader.tsx`（クライアントコンポーネント）: `next/dynamic` で `Pinmap` を `ssr: false` で読み込み、`items` を渡すだけの中継役
- `poc/app/components/Pinmap.tsx`（クライアントコンポーネント）: Leafletの本体。カテゴリの絞り込みのボタン、地図、ピン、ポップアップ、クラスタリング

中継役を挟むのは、`page.tsx` が `fs` で記事を読むためサーバーで動かす必要がある一方、`ssr: false` はサーバーコンポーネントに書けないため（同梱ドキュメント `lazy-loading.md`: 「`ssr: false` is not allowed with `next/dynamic` in Server Components.」）。

静的エクスポートでは、書き出されるHTMLに地図は入らず、`loading` の表示（「地図を読み込んでいます...」）だけが入る。ブラウザで `Pinmap` を読み込んでから地図を組み立てる。`npm run build` → `npx pagefind --site out --serve` で動作を確認済み。

ポップアップ:

- `title`、`summary`、Googleマップへのリンク、記事へのリンク
- Googleマップ: `https://www.google.com/maps/search/?api=1&query={lat},{lng}`。外部サイトなので `<a target="_blank" rel="noopener noreferrer">` で新しいタブ
- 記事: `next/link` の `<Link href="/{slug}/">` で同じタブ。ルート相対パスにして、dev・Pagefindの確認用サーバー・本番のどこでも、同じサイトの記事へ移動できるようにする

ベースマップ:

地理院タイルの淡色地図（`https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png`）を使う。出典として「地理院タイル」と、[地理院タイル一覧](https://maps.gsi.go.jp/development/ichiran.html)へのリンクを表示する。

選定理由:

- 参考にしたsample-mapのCARTO Basemaps（voyager）は、利用条件（2026年9月29日版）でAPIキー必須になった。キーなしでは「API KEY REQUIRED」の画像が返る。無料枠は非商用で月500万リクエスト、商用で月100万リクエストまでで、超えると有料
- 地理院タイルは、ウェブサイトでリアルタイムに読み込む場合、出典の明示のみで申請不要。料金が発生しない
- 地名が日本語で、国道・都道の番号が出る。淡色地図は色付きのピンが目立つ
- 公的なデータを使っておくと、将来の提供・連携の可能性が開けたときに都合がよい

気になる点: Voyagerほど洗練されていない、通りの名前は出にくい、稼働の保証（SLA）はない。

OpenStreetMapの標準タイルは、react-leafletの `LayersControl` で切り替えて選べる2番目の地図として検討する（利用方針上、アクセスの多いサービスでの常用は控える）。Googleのタイルを正式なAPIを通さずに直接読み込むのは、規約上認められていないため使わない。

ピン:

`L.divIcon` の自前のアイコンにする。Leaflet標準のピンは、バンドラーを通すと画像のパスが壊れる（PoCでも壊れた画像になった）。見た目のルールは [UI・UX設計](../design/ui-ux.md#ピンの表示) を参照。

- `html` はJSXではなくHTMLの文字列（`class`、属性はスペース区切り）。形はTailwindのクラス、色は `style` で渡す。Tailwindはファイルにそのまま書かれたクラス名しか生成しないため、`bg-[${色}]` のようにクラス名を組み立てない
- `className` に独自の名前を付ける。付けないとLeaflet標準の白い四角い背景が出る
- `iconSize: [24, 24]`、`iconAnchor: [12, 12]`（丸の中心を座標に合わせる。単位はピクセル）
- 色とラベルは `Record<Category, { color: string; label: string }>` の対応表で持つ（`Category` は `schema.ts` の `categories` から作る）。全カテゴリが必須なので、カテゴリを増やして書き漏らすと型エラーで気づける

カテゴリの絞り込み:

- 選んでいるカテゴリを `useState<Category | null>(null)` で持つ。`null` は「すべて」
- 表示するピンは `selectedCategory === null ? items : items.filter((item) => item.category === selectedCategory)` で計算する（stateには持たない）
- ボタンにするカテゴリは、掲載の目安の6カテゴリの配列（`pinCategories: Category[]`、部品の外に置く）を `map` して並べる。順番は [機能要件](../requirements/features.md#ピンマップ) と同じ
- 選んでいるボタンは `aria-pressed` と `className`（太字・下線）を同じ条件で切り替える
- 各ボタンにピンと同じ色の丸と1文字を付け、凡例を兼ねる。JSXでは色を `style={{ backgroundColor: … }}` で渡す

クラスタリング:

- `react-leaflet-cluster`（4.1.3。react-leaflet 5、React 19、leaflet 1.9に対応）の `MarkerClusterGroup` で、`visibleItems.map(...)` の `Marker` を囲む。絞り込んだ後のピンをまとめる
- 4系はCSSを自動で読み込まないので、`react-leaflet-cluster/dist/assets/MarkerCluster.css` と `MarkerCluster.Default.css` を自分で読み込む
- `disableClusteringAtZoom={16}`: 運行中に見る縮尺ではまとめず、色と文字のピンを見せる
- `chunkedLoading`: ピンが多くても固まらないよう、少しずつ読み込む
- 静的エクスポートでも動作を確認済み

### YouTube

front matterの `youtube` には動画IDだけを書く（URLは書かない）。動画は1記事に1本までで本数も限られるため、URLからIDを切り出す手間より、形がはっきりしていて検証しやすいことを優先した。URLはいくつもの形（`watch?v=…`、`youtu.be/…`、`shorts/…`、`&t=30s` など）があり、IDを取り出すコードの間違いがエラーにならない間違いになりやすい。

記事ページ（PoC: `poc/app/[slug]/page.tsx`）では、`youtube` があるときだけ `<iframe>` を出す（`{article.youtube && (…)}`）。ない記事では何も出さず、空いた場所もできない。PoCでは日付と本文の間に置く（本実装では重要ブロックとの並びを決める。[UI・UX設計](../design/ui-ux.md#基本方針)）。

- `src`: `https://www.youtube-nocookie.com/embed/{ID}`（再生するまでYouTubeのCookieを置かない版）
- `title`: `{記事のタイトル}の動画`（画面読み上げ用）
- `allow`: YouTubeの標準の埋め込みコードと同じ（`accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share`）。区切りの `;` が抜けたり余分な文字が入ったりしても、ブラウザはエラーを出さずにその機能を無視する
- `allowFullScreen`、`loading="lazy"`（画面に近づくまで読み込まない）
- `referrerPolicy="strict-origin-when-cross-origin"`（YouTubeの標準の埋め込みコードと同じ。リファラーがないとYouTube側でエラーになる場合がある）
- 大きさは `aspect-video w-full`（横幅いっぱい、16:9）

dev、`npm run build` → `npx pagefind --site out --serve` の両方で再生を確認済み。

### 区から探す

区ごとの記事一覧ページを、静的エクスポートで区の数（6つ）だけ書き出す。

| 区名         | URL               |
| ------------ | ----------------- |
| 渋谷区       | `/area/shibuya/`  |
| 新宿区       | `/area/shinjuku/` |
| 中央区       | `/area/chuo/`     |
| 千代田区     | `/area/chiyoda/`  |
| 港区         | `/area/minato/`   |
| 都心以外の区 | `/area/others/`   |

URLの形を `/area/{英字}/` にした理由:

- 記事が `/{slug}/` でprefixがないため、`/chiyoda/` のような形だと記事の `slug` とぶつかるおそれがある。`/area/` の下に置けば、気をつけるのは記事の `slug` に `area` を使わないことだけになる
- 日本語のURL（`/area/千代田区/`）は、共有したときに `%E5%8D%83…` の形に崩れて読めない。書き出すフォルダ名も日本語になる

構成（PoC）:

- `poc/lib/schema.ts`: `City` 型（`(typeof cities)[number]`）と、区名と英字の対応表 `cityPaths: Record<City, string>`。全区が必須なので、区の書き漏らし（キーの不足）や打ち間違い（余分なキー）は型エラーになる
- `poc/lib/articles.ts` の `getArticleSummariesByCity(cityName: City)`: 全記事から、front matterの `city`（配列）に `cityName` が含まれるもの（`frontMatter.city.includes(cityName)`）を集め、`ArticleSummary` の配列で返す。区が2つある記事（`akasaka-street` の `[千代田区, 港区]`）は両方の区に出る
- `poc/app/area/[city]/page.tsx`:
  - `generateStaticParams` は `Object.values(cityPaths).map((city) => ({ city }))`。返すオブジェクトのキーはフォルダ名 `[city]` と同じにする。返す型を `Promise<{ city: string }[]>` と書く。書かないと、`{ City: city }` のようにキーを違えても `tsc` はエラーにせず、devで開いたときに初めて「missing param」のエラーになる。書いておけば `tsc` のエラー（`TS2322`）で見つかる
  - URLの英字から区名に戻す（`cities.find((c) => city === cityPaths[c])`）。見つからなければ `notFound()`。`if` の後では `cityName` の型が `City | undefined` から `City` に絞り込まれるので、`getArticleSummariesByCity` に渡せる
  - 記事が0本の区では「この区の記事はまだありません」、それ以外は記事の一覧（タイトルのリンク、カテゴリ、更新日）を出す
- `poc/app/page.tsx`: 「区から探す」の見出しと、6区のリンク（`` `/area/${cityPaths[c]}/` ``）。区のページ・記事へのリンクは、`/` で始まり `/` で終わる形にそろえる

devとビルドの違い:

- devは開かれたURLのページをその場で作る。対応表にない `/area/shibuy/` では `CityPage` が動き、`notFound()` の404になる（`if` がないと、空の `<h1>` がエラーなしで出る）
- ビルドでは `out/area/{英字}/index.html` が6つだけ書き出される。対応表にないURLはファイルがないので、ホスティングの404になる（`notFound()` は動かない）。本番のCloudflare Pagesでは `out/404.html` が404の画面として使われる（[インフラ設計](infrastructure.md#404の画面)）
- Pagefindは `data-pagefind-body` のあるページだけを索引するため、区のページは検索の対象にならない（`Indexed 5 pages` のまま）。区のページは記事のタイトルの寄せ集めなので、検索結果に出ないほうがよい

区のページはdevとビルド（`npm run build` → `npx pagefind --site out --serve`）の両方で、トップページの入口はdevで確認済み。

### 画像

`output: "export"` では `next/image` の自動の最適化がそのままでは使えないので、画像はビルドの前に変換して `public/` に置く。

- 形式は **WebPだけ**、品質は **80**、横幅は元のまま（編集の方針は [コンテンツモデル・編集方針](../design/content-model.md#画像)）
- 検索の評価につながるのは、形式そのものではなく、ページの表示の速さ（いちばん大きな画像や文字が出るまでの時間、LCP）を通して。PageSpeed Insightsも、WebPのような次世代フォーマットを勧めている

現行のWordPressのメディアライブラリ（2026-11-14にREST API `/wp-json/wp/v2/media` で確認）:

| 項目 | 結果 |
|---|---|
| 枚数 | 361枚（PNG 264枚、JPEG 97枚） |
| 合計 | 33.1MB |
| 1枚の大きさ | 真ん中の値57KB、大きいほうから1割の境目220KB、いちばん大きいもの342KB。1MBを超えるものはない |
| 横幅 | 真ん中の値842ピクセル、いちばん広いもの1920ピクセル（1600ピクセルを超えるものは3枚） |
| ファイル名 | 日本語（例: `ドン・キホーテ靖国通り沿い.png`） |
| 記事との結び付き | 246枚は、WordPressの上でどの記事にも結び付いていない。本文にURLで貼った画像はこうなることがあるので、使っていないという意味ではない |

`cwebp`（Homebrew）で2枚を試した結果:

| 品質 | ドン・キホーテ（元はPNGの56KB） | 昭和通り（元はJPEGの342KB） |
|---|---|---|
| 70 | 27KB（49%） | 43KB（13%） |
| 80 | 32KB（57%） | 52KB（15%） |
| 90 | 42KB（75%） | 69KB（20%） |
| ロスレス | 32KB | 110KB |

- Macの200%表示では、品質70でも気になる崩れはなかった。70と80の差は1枚4〜8KBほど。見比べたのが2枚だけで、小さい文字が読めることを優先して80にした
- 昭和通りのロスレスが大きいのは、JPEGのノイズも絵の一部として写すため。JPEGで失った線のくっきりさは、WebPにしても戻らない

WebPだけにした理由（Google Analytics、2026-08-16〜11-13の90日、「テクノロジー」→「ユーザーの環境の詳細」→「OSのバージョン」）:

- WebPを表示できないiOS 13以前は、50位までで11位の `iOS 13.2.3` だけだった。アクティブユーザー537に対して、エンゲージのあったセッションが9、エンゲージメント率1.68%、平均エンゲージメント時間0秒。12位の `iOS 26.6.0`（526人、40.73%、48秒）と比べて、人ではなく、iPhoneを名乗る自動の巡回プログラム（ボット）の可能性が高い
- Androidの4.x以前は50位までに出てこなかった
- 予備のPNG・JPEGを置くと、守れる人がほぼいないのに、ファイルが2倍になり、HTMLも複雑になる

## 次のステップ

PoC（`poc/`）で、Markdown読み込み、Pagefindでの日本語検索、Zodでのスキーマ検証（`slug` の形、`slug` とファイル名の一致、使えない `slug` を含む）、サジェストUI、検索結果の一覧（Pagefind JS API + 自前UI）、ピンマップ（地理院タイル、自前のピン、ポップアップ、カテゴリの絞り込み、クラスタリング）、記事ページへのYouTubeの埋め込み、区から探す（`/area/{英字}/` の一覧ページとトップページの入口）まで確認した。記事は5本（施設、主要駅、抜け道・定番ルート、交差点が `pinmap: true`、幹線道路が `pinmap: false`。主要駅の `tokyostation-yaesu` に `youtube` あり）。最後に残っていたPagefindの日本語の区切り方と一致のきまりも調べ（[日本語の区切り方と一致のきまり](#日本語の区切り方と一致のきまり)）、技術検証を締めくくった。

本実装で次を行う。

- ピンマップのレイアウト（トップページのファーストビュー、PC・TB・SP）、ポップアップのリンクの見た目
- ベースマップの切り替え（OpenStreetMap）
- 区のページの見た目と、トップページでの入口の置き場所
- 検索で関係の薄い記事まで当たることへの対策

ホスティングはCloudflare Pages（無料プラン）に決めた。理由、ビルドの設定、404の画面、試験版、ドメインの切り替えは [インフラ設計](infrastructure.md) を参照。試験版は `https://tokyotaximap-docs.pages.dev/` に置いた（2026-11-12）。最初の公開の範囲は [機能要件](../requirements/features.md#最初の公開の範囲) を参照。

## 未決定事項

- `tags` のenumリスト
- `poc/` から本実装への移り方・監視（ビルドの設定は決定。[インフラ設計](infrastructure.md#ビルドの設定)）
- ミニ単語帳のデータ形式とPagefindへの載せ方（最初の公開後）
- 地図埋め込みの方式
- ピンマップの一覧表示（サイドバー）の形（本実装のデザインの段階で決める）
- ベースマップの本番での最終決定（PoCは地理院タイル。OpenStreetMapとの切り替えを検討）
- 検索で関係の薄い記事まで当たることへの対策（そのまま受け入れる、検索語そのものを含む記事を上に並べる、完全一致検索。[日本語の区切り方と一致のきまり](#日本語の区切り方と一致のきまり)）
- 画像の変換の道具（`cwebp` をシェルのくり返しで使うか、`sharp` でNode.jsのスクリプトを書くか）、英字のファイル名の付け方、記事の本文の中の画像の拾い方（形式と品質は決定。[画像](#画像)）
- 固定ページの扱い（[URLルーティング](#urlルーティング)）
- 記事データのJSONの書き出し（将来）。静的エクスポートでも、Route Handler（`route.ts`）の `GET` はビルド時に静的なファイルになり、JSONを書き出せる（`node_modules/next/dist/docs/01-app/02-guides/static-exports.md` の233〜235行目）。どのキーを出すかは、使うアプリを作るときに決める（[機能要件](../requirements/features.md#データの再利用将来の構想)）

## Q&A（検討ログ）

### 日時: 2026-07-20 — 全文検索エンジンの選定

**Q. 全文検索の基礎から知りたい。Pagefind / FlexSearchとは何か。**

全文検索は、タイトルだけでなく本文も含めてキーワードで探すこと。高速化のため、あらかじめ「単語 → どの記事にあるか」の索引（転置インデックス）を作る。Pagefind / FlexSearchは、その索引をブラウザ側で使うための道具で、データベースやCMSではない。

日本語はスペース区切りがないため、単語分割（形態素解析やN-gram / CJK分割）が必要になる。

**Q. PagefindとFlexSearchの違いは。**

|          | Pagefind                      | FlexSearch                                 |
| -------- | ----------------------------- | ------------------------------------------ |
| 方式     | ビルド後HTMLから索引生成      | JSライブラリ。索引データは自前で組み立てる |
| 日本語   | CJK対応が比較的そのまま使える | 追加の工夫（Kuromoji等）が必要なことが多い |
| UI       | 同梱あり（カスタムも可）      | 自前                                       |
| 向く規模 | 静的サイト・数百〜数千ページ  | 柔軟なフィールド制御が必要なとき           |

**Q. Tokyo Taxi Mapではどちらを選ぶか。**

**Pagefindを採用する。** HTMLを食わせる手間の少なさ、日本語対応のしやすさ、600本・Git + Markdown・ひとり開発という前提に合うため。Algolia等の外部SaaSは規模・コスト面で第一候補にしない。

**Q. Pagefindなら全部お任せか。**

いいえ。索引と日本語分割はPagefindが担うが、次は自前設計が必要。

1. `keywords` をHTMLに出す（`data-pagefind-meta`）
2. サジェストの表示ルール（常に `title`）をUIで実装する
3. ミニ単語帳をHTMLとして存在する形にする
4. Phase 1〜3の運用（タイポ蓄積など）はそのまま有効

**Q. `keywords` をどうHTMLに出力するか。**

記事テンプレートでhidden要素として埋め込む。

```html
<div hidden aria-hidden="true">
  <span data-pagefind-meta="keywords">ミッドタウン, 六本木ミッド</span>
</div>
```

読者向け表示ではなく検索用の補助データとして扱い、本文と分離する。

**Q. サンプル記事の設計に進んでよいか。**

よい。front matterと検索方針が固まった今が適切なタイミング。未決定の `tags` enum・ホスティング・Pagefind実装詳細は、サンプル記事を止める理由にはならない。
