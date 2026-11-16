"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LazyActorMap } from "@/components/map/LazyActorMap";
import type { ActorMapPoint } from "@/components/map/types";
import { ActorDetail } from "@/components/public-data/ActorDetail";
import { ActorDirectory } from "@/components/public-data/ActorDirectory";
import { IpDetailPanel } from "@/components/public-data/IpDetailPanel";
import { IpTable } from "@/components/public-data/IpTable";
import { SearchBar } from "@/components/public-data/SearchBar";
import type {
  ActorSummary,
  IpDetailResponse,
  IpItem,
} from "@/components/public-data/types";
import {
  filterByCountry,
  mapPreferMalaysia,
  preferredCountryFilter,
  uniqueCountries,
} from "@/lib/public-data-ui";

const PAGE_SIZE = 100;

type IpsResponse = {
  actor: { id: number; username: string; forums: string[] };
  country: string | null;
  count: number;
  items: IpItem[];
};

export type PublicDataClientProps = {
  initialActors: ActorSummary[];
  initialTotal: number;
  initialHasMore: boolean;
  initialForums: string[];
  initialSelected?: ActorSummary | null;
  initialIps?: IpItem[];
  initialDetail?: IpDetailResponse | null;
  pageLimit?: number;
};

export function PublicDataClient({
  initialActors,
  initialTotal,
  initialHasMore,
  initialForums,
  initialSelected = null,
  initialIps = [],
  initialDetail = null,
  pageLimit = PAGE_SIZE,
}: PublicDataClientProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ActorSummary[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [browseActors, setBrowseActors] =
    useState<ActorSummary[]>(initialActors);
  const [browseTotal, setBrowseTotal] = useState(initialTotal);
  const [browseOffset, setBrowseOffset] = useState(initialActors.length);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseHasMore, setBrowseHasMore] = useState(initialHasMore);
  const [selected, setSelected] = useState<ActorSummary | null>(initialSelected);
  const [ips, setIps] = useState<IpItem[]>(initialIps);
  const [ipsLoading, setIpsLoading] = useState(false);
  const [ipsError, setIpsError] = useState<string | null>(null);
  const [country, setCountry] = useState<"ALL" | string>(() =>
    initialIps.length > 0 ? preferredCountryFilter(initialIps) : "ALL",
  );
  const [forum, setForum] = useState<"ALL" | string>("ALL");
  const [forums, setForums] = useState<string[]>(initialForums);
  const [detail, setDetail] = useState<IpDetailResponse | null>(initialDetail);
  const [detailLoading, setDetailLoading] = useState(false);
  const [focusIp, setFocusIp] = useState<string | null>(
    initialDetail?.ip ?? null,
  );
  const [focusKey, setFocusKey] = useState(0);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadIpsAbortRef = useRef<AbortController | null>(null);
  const loadIpsSeqRef = useRef(0);
  const suppressSearchOpenRef = useRef(false);
  const forumBooted = useRef(false);

  useEffect(() => {
    // SSR seeded ALL-forum directory; refetch only when forum filter changes.
    if (!forumBooted.current && forum === "ALL") {
      forumBooted.current = true;
      return;
    }
    forumBooted.current = true;
    setBrowseLoading(true);
    const forumQ =
      forum !== "ALL" ? `&forum=${encodeURIComponent(forum)}` : "";
    void (async () => {
      try {
        const res = await fetch(
          `/api/public-data/actors?limit=${PAGE_SIZE}&offset=0${forumQ}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          items: ActorSummary[];
          total: number;
          hasMore: boolean;
        };
        setBrowseTotal(Number(data.total) || 0);
        setBrowseHasMore(Boolean(data.hasMore));
        setBrowseOffset(data.items?.length ?? 0);
        setBrowseActors(data.items ?? []);
      } catch {
        setBrowseActors([]);
        setBrowseTotal(0);
        setBrowseHasMore(false);
        setBrowseOffset(0);
      } finally {
        setBrowseLoading(false);
      }
    })();
  }, [forum]);

  const loadBrowseMore = useCallback(async () => {
    setBrowseLoading(true);
    try {
      const forumQ =
        forum !== "ALL" ? `&forum=${encodeURIComponent(forum)}` : "";
      const res = await fetch(
        `/api/public-data/actors?limit=${PAGE_SIZE}&offset=${browseOffset}${forumQ}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        items: ActorSummary[];
        total: number;
        hasMore: boolean;
      };
      setBrowseTotal(Number(data.total) || 0);
      setBrowseHasMore(Boolean(data.hasMore));
      setBrowseOffset((o) => o + (data.items?.length ?? 0));
      setBrowseActors((prev) => [...prev, ...(data.items ?? [])]);
    } catch {
      /* keep existing rows */
    } finally {
      setBrowseLoading(false);
    }
  }, [forum, browseOffset]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 1) {
      setSuggestions([]);
      setSearchTotal(0);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const forumQ =
            forum !== "ALL" ? `&forum=${encodeURIComponent(forum)}` : "";
          const res = await fetch(
            `/api/public-data/search?q=${encodeURIComponent(q)}&limit=50${forumQ}`,
            { cache: "no-store" },
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as {
            items: ActorSummary[];
            total: number;
          };
          setSuggestions(data.items);
          setSearchTotal(data.total);
          if (!suppressSearchOpenRef.current) setSearchOpen(true);
          suppressSearchOpenRef.current = false;
        } catch {
          setSuggestions([]);
          setSearchTotal(0);
          suppressSearchOpenRef.current = false;
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, forum]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const loadIps = useCallback(async (actor: ActorSummary) => {
    loadIpsAbortRef.current?.abort();
    const controller = new AbortController();
    loadIpsAbortRef.current = controller;
    const requestId = actor.id;
    const seq = ++loadIpsSeqRef.current;

    setIpsLoading(true);
    setIpsError(null);
    try {
      const res = await fetch(
        `/api/public-data/ips?actorId=${actor.id}&map=1`,
        { cache: "no-store", signal: controller.signal },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as IpsResponse;
      if (
        controller.signal.aborted ||
        seq !== loadIpsSeqRef.current ||
        data.actor.id !== requestId
      ) {
        return;
      }
      setIps(data.items);
      setCountry(preferredCountryFilter(data.items));
      setFocusIp(null);
      setDetail(null);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setIps([]);
      setIpsError(e instanceof Error ? e.message : "Failed to load IPs");
    } finally {
      if (seq === loadIpsSeqRef.current) setIpsLoading(false);
    }
  }, []);

  const selectActor = useCallback(
    (actor: ActorSummary) => {
      suppressSearchOpenRef.current = true;
      setQuery("");
      setSearchOpen(false);
      setSuggestions([]);
      setSearchTotal(0);
      setSelected(actor);
      void loadIps(actor);
    },
    [loadIps],
  );

  const resetFilters = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    suppressSearchOpenRef.current = true;
    setQuery("");
    setSuggestions([]);
    setSearchTotal(0);
    setSearchOpen(false);
    setSearchLoading(false);
    setForum("ALL");
    setCountry("ALL");
    setDetail(null);
    setFocusIp(null);
    setDetailLoading(false);
  }, []);

  const filteredIps = useMemo(
    () => filterByCountry(ips, country),
    [ips, country],
  );

  const countries = useMemo(() => uniqueCountries(ips), [ips]);

  const mapPoints: ActorMapPoint[] = useMemo(
    () =>
      filteredIps
        .filter((r) => r.map)
        .map((r) => ({
          id: r.id,
          ip: r.ip,
          hostname: r.hostname,
          countryIso: r.countryIso,
          lat: r.map!.lat,
          lon: r.map!.lon,
        })),
    [filteredIps],
  );

  const loadDetail = useCallback(async (ip: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(
        `/api/public-data/ip-detail?ip=${encodeURIComponent(ip)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as IpDetailResponse;
      setDetail(data);
    } catch {
      setDetail({
        ip,
        dbUsers: [],
        ipinfo: null,
        ipinfoError: "Failed to load enrichment",
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const pinpoint = useCallback((ip: string) => {
    setFocusIp(ip);
    setFocusKey((k) => k + 1);
  }, []);

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-[96rem] flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-[var(--border)] px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight sm:text-lg">
              Public Data
            </h1>
            <p className="mt-0.5 max-w-2xl text-[0.7rem] text-[var(--muted)] sm:text-xs">
              Full archive map + directory — Malaysia-first when MY IPs exist.
            </p>
          </div>
        </div>
      </header>

      <SearchBar
        query={query}
        onQueryChange={(v) => {
          setQuery(v);
          setSearchOpen(true);
        }}
        forum={forum}
        forums={forums}
        onForumChange={setForum}
        country={country}
        countries={countries}
        onCountryChange={setCountry}
        suggestions={suggestions}
        searchOpen={searchOpen}
        searchLoading={searchLoading}
        searchTotal={searchTotal}
        searchWrapRef={searchWrapRef}
        onSelectActor={selectActor}
        onReset={resetFilters}
        loaded={browseActors.length}
        totalActors={browseTotal}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,55%)_minmax(0,45%)] gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_15.5rem] lg:grid-rows-1">
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-[1.2] basis-0 overflow-hidden">
            <LazyActorMap
              points={mapPoints}
              preferMalaysia={mapPreferMalaysia(
                country,
                filteredIps,
                mapPoints.length,
              )}
              actorName={selected?.username ?? null}
              focusIp={focusIp}
              focusKey={focusKey}
              onPinSelect={(ip) => {
                pinpoint(ip);
              }}
              onDetailRequest={(ip) => {
                pinpoint(ip);
                void loadDetail(ip);
              }}
              className="h-full"
            />
            <IpDetailPanel
              detail={detail}
              loading={detailLoading}
              closeHref={
                selected
                  ? `/public-data?actor=${encodeURIComponent(selected.username)}${
                      pageLimit > 100 ? `&limit=${pageLimit}` : ""
                    }`
                  : "/public-data"
              }
              onClose={() => setDetail(null)}
            />
          </div>
          <div className="min-h-0 flex-1 basis-0 overflow-hidden">
            <IpTable
              items={filteredIps}
              loading={ipsLoading}
              error={ipsError}
              focusIp={focusIp}
              actorUsername={selected?.username}
              pageLimit={pageLimit}
              onFocusIp={pinpoint}
              onDetail={(ip) => {
                pinpoint(ip);
                void loadDetail(ip);
              }}
            />
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden border-t border-[var(--border)] bg-[var(--surface)] lg:border-l lg:border-t-0">
          <div className="shrink-0 border-b border-[var(--border)]">
            <ActorDetail actor={selected} />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ActorDirectory
              actors={browseActors}
              selectedId={selected?.id ?? null}
              total={browseTotal}
              loading={browseLoading}
              hasMore={browseHasMore}
              pageLimit={pageLimit}
              onSelect={selectActor}
              onLoadMore={() => void loadBrowseMore()}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
