// 既存のWordPressのコンテンツを読み込み、任意の形に取り込む

const wpContent = await fetch(
  "https://tokyotaximap.com/wp-json/wp/v2/posts?per_page=100&page=1&_fields=slug",
); // URLに頼んで、返事の封筒を受け取る。中身はまだ未確認の状態
const wpContentArray = await wpContent.json(); // 中身をJSONとして読む
console.log(wpContentArray.length);
console.log(wpContentArray[0].slug);
