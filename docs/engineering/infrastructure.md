# インフラ設計

## 現時点で決まっていること

- 既存サイトのドメインを引き継ぐ。
- 既存の記事URLを引き継ぎ、ブックマークや検索結果から引き続き到達できるようにする。

## ホスティング

**Cloudflare Pages（無料プラン）** に置く。`output: "export"` で書き出した `out/` をそのまま配る（静的ホスティング）。GitHubへのプッシュで自動的に公開できる。

選んだ理由（料金・条件は2026-11-12に各社の公式ページで確認）:

- 広告（Google AdSense）を貼る商用サイトにする。Vercelの無料プラン（Hobby）は非商用に限られ、AdSenseを名指しで商用扱いにしている。GitHub Pagesはネットでの商売に使うことを禁じている
- 現行サイトの表示回数は月2.4万（Google Analytics、アクティブユーザー8,800。2024年11月以降は新着記事なし）。Netlifyの無料プランは月300クレジットで、公開1回15クレジット、配信1GBで20クレジット。表示1回0.5MBと見積もっても約12GB（240クレジット）で、公開を足すと超える。Cloudflare Pagesは静的なファイルの配信が回数・量とも無料
- 無料プランの上限は1サイト2万ファイル、1ファイル25MiB。PoCの `out/` は175ファイル・2.4MB。記事約300本と画像361枚を足しても届かない
- 次点はロリポップ（現行の契約）に `out/` を置く方法。ドメインの設定は変えずに済むが、更新のたびにファイルを上げる仕組みが要る

### ビルドの設定

2026-11-12にGitHubのリポジトリとつないで設定した。`main` へのプッシュで、Cloudflareがビルドして公開する。

| 項目 | 値 | 理由 |
|---|---|---|
| Project name | `tokyotaximap-docs` | URLが `tokyotaximap-docs.pages.dev` になる |
| Production branch | `main` | |
| Framework preset | `None` | 「Next.js (Static HTML Export)」を選ぶとビルドの命令が `npx next build` になり、Pagefindが動かない |
| Build command | `npm run build` | `poc/package.json` の `build` が `next build` のあとにPagefindまで実行する |
| Build output directory | `out` | Root directoryから見た場所（`poc/out`） |
| Root directory | `poc` | `package.json` と `package-lock.json` が `poc/` にある。指定しないとリポジトリのいちばん上で作業を始め、部品を入れられない |
| Environment variables | なし | Node.jsは指定しなくても22.23.4（手元はv22.21.0、同じ22の系列） |

- GitHubとの連携では、Cloudflareに渡す範囲を「Only select repositories」で `tokyotaximap-docs` だけにした
- ビルドのログで `Indexed 5 pages` を確かめた（手元と同じ。`data-pagefind-body` は記事ページだけ）

### 404の画面

Cloudflare Pagesは、いちばん上に `404.html` があれば、見つからないURLでそれを出す（同じフォルダから上へ順に `404.html` を探す）。Next.jsの静的エクスポートは `out/404.html` を書き出すので、これが使われる。

いちばん上に `404.html` がないと、1ページだけのアプリ（SPA）とみなされ、どのURLにもトップページを返す。存在しない記事のURLでもトップページが出て、エラーにならずに間違った動きになるので、`out/404.html` が書き出されていることを確かめる。

試験版で、ない記事（`/no-such-page/`）が404で「This page could not be found.」の画面になり、ある記事（`/tomigaya/`）が200になることを確かめた（2026-11-12）。

### URL末尾の `/`

`/tomigaya` を開くと、Cloudflare Pagesは308（移転）で `/tomigaya/` に移す。`out/tomigaya/index.html` があるため。`trailingSlash: true` で書き出したURLの形にそろうので、同じ記事が2つのURLに分かれない（2026-11-12に確認）。

### 試験版

- Cloudflare Pagesが無料でくれる `…pages.dev` のURLで公開する（2026年12月下旬、30本ほど）。URLは `https://tokyotaximap-docs.pages.dev/`
- プレビューの公開には `X-Robots-Tag: noindex` が自動で付くが、本番扱いの `pages.dev` には付かない。試験版は現行サイトと同じ記事を持つので、`_headers` ファイルで `noindex` を付け、検索結果に出さない

`poc/public/_headers` に次のように書いた。`public/` の中身はビルドで `out/` のいちばん上にそのまま写される。

```text
/*
  X-Robots-Tag: noindex
```

- 1行目はURLの形。`/*` はどのドメインで開かれても、すべてのURLに当たる。`https://tokyotaximap.com/*` のようにドメインを書くと、試験版（`pages.dev`）には効かず、本番の公開のあとに本番のサイトにだけ付いてしまう
- ヘッダーはビルドのときではなく、ページを配るときにサーバーが付ける。手元の `npx pagefind --site out --serve`（`localhost:1414`）は `_headers` を読まないので、付かない
- 試験版で、トップページ・記事ページ・404のページのすべてに `x-robots-tag: noindex` が付くことを確かめた（2026-11-12）
- **本番の公開のときに、この `noindex` を外す。** 残したままだと、本番のサイトが検索結果から消えていく

### 試験版で確かめたこと（2026-11-12）

| 確かめたこと | 結果 |
|---|---|
| 検索 `/search/?q=富ヶ谷` | 1本（富ヶ谷(交差点)）。`/pagefind/pagefind.js` は200 |
| 検索 `/search/?q=ラーメン` | 0本 |
| ピンマップ | ピンは4本（`pinmap: true` の4本） |

ブラウザの開発者ツールで番号（Status）を見るときは、「Network」のタブの **Disable cache** に印を付ける。付けないと、ブラウザの写し（キャッシュ）を使って304（変わっていない）になることがある。

### Cloudflare PagesとWorkers

Cloudflareは同じことができるWorkers（静的アセット）を勧めている。Workersでは404の扱いを `not_found_handling: "404-page"` と自分で設定する必要がある。Pagesは `404.html` の有無で自動で決まるので、Pagesで始める。必要になったらWorkersに移る。

## ドメインとDNS

- ドメイン `tokyotaximap.com` はムームードメインで取得・更新している。契約と更新料の支払いはムームードメインのまま
- このドメインでメールは使っていない（DNSを切り替えても、メールの設定が消える心配はない）
- `tokyotaximap.com`（`www` などが付かないapexドメイン）をCloudflare Pagesで使うには、ネームサーバーをCloudflareに変え、Cloudflareのzoneとして登録する。ネームサーバーは「このドメインのサイトはどこにあるか」に答える案内所で、今はムームードメインのDNSがロリポップを指している
- ネームサーバーの切り替えは、本番の公開（2027年2〜3月）のときに行う。試験版は `pages.dev` なので、それまで現行サイトに影響しない

## 現行サーバー（ロリポップ）

- ロリポップのスタンダードプランに現行のWordPressサイトを置いている。契約の更新日は2027-03-23
- 更新する。ほかのプロジェクトのドメイン（実際に動いているのは2〜3個、すべてWordPress）を置いているため。WordPressはPHPで動くので、Cloudflare Pagesには移せない（ネームサーバーだけをCloudflareに移すことはできる）
- 本番の公開後も、旧WordPressはしばらく残せる

## 将来の選択肢: VPS

インフラの勉強も兼ねて、将来VPSで運用することも考えている。`output: "export"` なので、`out/` を置ければどこでも動き、移るのは難しくない。順番は次を想定する。

1. 本番はCloudflare Pagesで公開し、安定して運用する
2. VPSは別のプロジェクトや試験用のサイトで練習する
3. サーバーで動かしたい機能（単語帳の同期、フォーム、定時のビルドなど）が出てきたら、このサイトも移すか検討する

ネームサーバーをCloudflareにしておけば、VPSに移るときも向き先を書き換えるだけで済む。

## 未決定事項

- `poc/` から本実装への移り方（ビルドの設定の Root directory も変わる）
- ビルドを起こすフォルダの絞り込み（Build watch paths。今は `docs/` や `logs/` だけの変更でもビルドが動く）
- CDN・キャッシュ方針
- 監視・ログ
- バックアップ
