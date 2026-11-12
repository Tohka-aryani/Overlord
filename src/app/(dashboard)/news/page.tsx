export default function NewsPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col px-8 py-5">
      <h1 className="text-xl font-semibold tracking-tight">News</h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
        Chronological MY CTI news list lands next. Archive is readable via{" "}
        <span className="font-mono">/api/news</span>.
      </p>
    </main>
  );
}
