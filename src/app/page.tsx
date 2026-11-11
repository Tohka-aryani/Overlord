export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-white/10 px-6 py-4">
        <p className="font-mono text-sm tracking-[0.2em] text-[var(--threat)]">
          RAVEN · MY
        </p>
      </header>
      <main className="flex flex-1 flex-col justify-center gap-3 px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">
          Dark Web Monitoring
        </h1>
        <p className="max-w-xl text-[var(--muted)]">
          Malaysia-first CTI console scaffold. Ops rail, archive APIs, and ingest
          land in later tasks — see PRODUCT.md and DESIGN.md.
        </p>
      </main>
    </div>
  );
}
