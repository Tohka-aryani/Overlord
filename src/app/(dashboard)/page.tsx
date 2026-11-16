import { Suspense } from "react";
import { connection } from "next/server";
import { CountryCasesMapPanel } from "@/components/overview/CountryCasesMapPanel";
import { OverviewHeader } from "@/components/overview/OverviewHeader";
import { ArchiveSpark } from "@/components/viz/ArchiveSpark";
import { OverviewPulse } from "@/components/overview/OverviewPulse";
import { getOverviewData } from "@/lib/overview";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

async function OverviewBody({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const sp = await searchParams;
  const threat = first(sp.threat) ?? "All";
  const sortRaw = first(sp.sort) ?? "threat";
  const sort =
    sortRaw === "signal" ||
    sortRaw === "source" ||
    sortRaw === "when" ||
    sortRaw === "threat"
      ? sortRaw
      : "threat";
  const dir = first(sp.dir) === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? "1", 10) || 1);

  const data = await getOverviewData({ threat, sort, dir, page, pageSize: 50 });

  const highDisplay =
    data.highThreatCount === null ? "—" : String(data.highThreatCount);

  const classifiedHint =
    data.archiveTotal > 0
      ? `Classified ${data.archiveClassified} / ${data.archiveTotal}`
      : "No archive rows yet";

  return (
    <>
      <section
        aria-label="Archive pulse"
        className="grid grid-cols-2 gap-px border-b border-[var(--border)] bg-[var(--border)] lg:grid-cols-4"
      >
        <ArchiveSpark
          label="MY victims"
          value={`${data.myVictimCount.toLocaleString()} / ${data.rwVictimTotal.toLocaleString()}`}
          hint={`Malaysia of ${data.rwVictimTotal.toLocaleString()} ransomware`}
        />
        <ArchiveSpark
          label="News items"
          value={data.newsCount.toLocaleString()}
          hint={`Archive total · ${data.newsCount.toLocaleString()}`}
        />
        <ArchiveSpark
          label="Public actors"
          value={data.actorCount.toLocaleString()}
          hint={`Directory total · ${data.actorCount.toLocaleString()}`}
        />
        <ArchiveSpark
          label="High threat"
          value={highDisplay}
          hint={classifiedHint}
          accent
        />
      </section>

      <section
        aria-label="Geographic pressure"
        className="border-b border-[var(--border)] py-4"
      >
        <CountryCasesMapPanel rows={data.byCountry} />
      </section>

      <OverviewPulse
        threatBuckets={data.threatBuckets}
        ingest={data.ingest}
        classifiedEntityCount={data.classifiedEntityCount}
        unclassifiedEntityCount={data.unclassifiedEntityCount}
        archiveClassified={data.archiveClassified}
        archiveTotal={data.archiveTotal}
        attentionTotal={data.attention.total}
        initialAttention={data.attention}
        initialThreat={threat}
        initialSort={sort}
        initialDir={dir}
      />
    </>
  );
}

export default function OverviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="ol-scroll-pane flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="mx-auto w-full max-w-[96rem]">
      <OverviewHeader />

      <Suspense
        fallback={
          <p className="px-4 py-8 text-sm text-[var(--muted)] sm:px-6 lg:px-8">
            Loading archive pulse…
          </p>
        }
      >
        <OverviewBody searchParams={searchParams} />
      </Suspense>
      </div>
    </div>
  );
}
