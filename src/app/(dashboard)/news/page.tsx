import { Suspense } from "react";
import { connection } from "next/server";
import { NewsClient } from "@/components/news/NewsClient";
import { queryNews } from "@/lib/news-query";

async function NewsBody() {
  await connection();
  const initial = await queryNews();
  return <NewsClient initial={initial} />;
}

export default function NewsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <p className="px-4 py-8 text-sm text-[var(--muted)]">
            Loading news archive…
          </p>
        }
      >
        <NewsBody />
      </Suspense>
    </div>
  );
}
