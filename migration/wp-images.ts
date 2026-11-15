// 既存のWordPressのコンテンツを読み込み、任意の形に取り込む

// WPの記事を全ページすべて取得する
const wpContentList: {
  slug: string;
  featured_media: number;
  content: { rendered: string };
}[] = []; // 下のfor文により、すべてのコンテンツ分が入る
for (let page = 1; page <= 4; page++) {
  const wpContent = await fetch(
    `https://tokyotaximap.com/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=slug,featured_media,content`, // featured_media=記事の代表画像
  ); // URLに頼んで、返事の封筒を受け取る。中身はまだ未確認の状態
  const wpContentArray = await wpContent.json(); // 中身をJSONとして読む
  wpContentList.push(...wpContentArray);
}

// 記事ごとに必要な要素を抜き出す
const articleImages: { slug: string; ids: number[] }[] = []; // まずは箱をつくる
for (const article of wpContentList) {
  const html = article.content.rendered;
  const matches = html.matchAll(/wp-image-(\d+)/g); // wp-image- のあとに続く数字の列を正規表現で探す
  const ids = [...matches].map((m) => Number(m[1])); // 文字列を数字に変換して新しい配列をつくる。
  // 代表画像が存在し、かつ配列にその番号が入って「いない」時(本文=代表となって「いない」とき)
  if (article.featured_media && !ids.includes(article.featured_media)) {
    ids.push(article.featured_media);
  }
  articleImages.push({ slug: article.slug, ids });
}
const mediaResponse = await fetch(
  "https://tokyotaximap.com/wp-json/wp/v2/media/3213?_fields=id,source_url",
);
const media = await mediaResponse.json();
console.log(media.source_url);
