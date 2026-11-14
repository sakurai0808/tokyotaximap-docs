// 既存のWordPressのコンテンツを読み込み、任意の形に取り込む

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
console.log(wpContentList[0].featured_media);
console.log(wpContentList[0].content.rendered.length);
