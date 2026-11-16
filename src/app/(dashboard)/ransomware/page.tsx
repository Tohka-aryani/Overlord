import { Suspense } from "react";
import { connection } from "next/server";
import { RansomwareClient } from "@/components/ransomware/RansomwareClient";
import { queryRansomware } from "@/lib/ransomware-query";

async function RansomwareBody() {
  await connection();
  const initial = await queryRansomware({
    country: "ALL",
    source: "all",
    days: null,
    limit: 5000,
  });
  return <RansomwareClient initial={initial} />;
}

export default function RansomwarePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <p className="px-4 py-8 text-sm text-[var(--muted)]">
            Loading ransomware archive…
          </p>
        }
      >
        <RansomwareBody />
      </Suspense>
    </div>
  );
}
