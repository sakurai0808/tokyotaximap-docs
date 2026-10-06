import Script from "next/script";

export default function SearchPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <link rel="stylesheet" href="/pagefind/pagefind-component-ui.css" />
      <Script src="/pagefind/pagefind-component-ui.js" type="module" />

      <h1 className="mb-6 text-2xl font-bold">検索</h1>
      <pagefind-input placeholder="施設名・通称・地名で検索"></pagefind-input>
      <pagefind-summary></pagefind-summary>
      <pagefind-results></pagefind-results>
    </main>
  );
}
