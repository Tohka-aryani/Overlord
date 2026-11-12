export default function TelegramPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-[var(--border)] px-8 py-5">
        <h1 className="text-xl font-semibold tracking-tight">Telegram</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Channel monitoring for Malaysia CTI signals — not wired in v1.
        </p>
      </header>

      <section
        aria-label="Coming soon"
        className="flex flex-1 flex-col items-start justify-center px-8 py-16"
      >
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Deferred
        </p>
        <h2 className="mt-3 text-2xl font-medium tracking-tight text-[var(--text)]">
          Coming soon
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">
          This tab is a placeholder. Live Telegram ingest and alerts are out of
          scope for the local archive v1.
        </p>
      </section>
    </main>
  );
}
