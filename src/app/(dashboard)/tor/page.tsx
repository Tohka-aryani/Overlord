import { Suspense } from "react";
import { connection } from "next/server";
import { TorClient } from "@/components/tor/TorClient";
import { queryTorSites } from "@/lib/tor-query";

async function TorBody() {
  await connection();
  const initial = await queryTorSites({ status: "all", limit: 500 });
  return <TorClient initial={initial} />;
}

export default function TorPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <p className="px-4 py-8 text-sm text-[var(--muted)]">
            Loading Tor archive…
          </p>
        }
      >
        <TorBody />
      </Suspense>
    </div>
  );
}
