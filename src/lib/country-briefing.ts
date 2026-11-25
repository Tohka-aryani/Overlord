import { desc, eq, or, sql, ilike } from "drizzle-orm";
import { db } from "@/db";
import { newsItems, ransomwareVictims } from "@/db/schema";
import { countryLabel, countrySearchTerms } from "@/lib/geo/country-names";
import { resolveOllamaModel, lastResolvedOllamaModel } from "@/lib/ollama";

export type CountryNewsItem = {
  id: number;
  title: string;
  link: string;
  source: string | null;
  summary: string | null;
  publishedAt: string | null;
};

export type CountryVictimHit = {
  id: number;
  victim: string;
  group: string;
  attackDate: string;
  claimUrl: string | null;
  source: string;
  sources: string[];
};

export type CountryBriefingResult = {
  country: string;
  countryName: string;
  news: CountryNewsItem[];
  victims: CountryVictimHit[];
  briefing: {
    headline: string;
    bullets: string[];
    outlook: string;
    model: string | null;
  } | null;
  error?: string;
};

function isoDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString();
}

export async function queryCountryNews(
  country: string,
  limit = 5,
): Promise<CountryNewsItem[]> {
  const terms = countrySearchTerms(country);
  const conditions = terms.flatMap((term) => [
    ilike(newsItems.title, `%${term}%`),
    ilike(newsItems.summary, `%${term}%`),
    ilike(newsItems.keywordHit, `%${term}%`),
  ]);

  const rows = await db
    .select({
      id: newsItems.id,
      title: newsItems.title,
      link: newsItems.link,
      source: newsItems.source,
      summary: newsItems.summary,
      publishedAt: newsItems.publishedAt,
    })
    .from(newsItems)
    .where(or(...conditions))
    .orderBy(desc(newsItems.publishedAt), desc(newsItems.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    link: r.link,
    source: r.source,
    summary: r.summary,
    publishedAt: isoDate(r.publishedAt),
  }));
}

export async function queryCountryVictims(
  country: string,
  limit = 8,
): Promise<CountryVictimHit[]> {
  const iso = country.trim().toUpperCase();
  const rows = await db
    .select({
      id: ransomwareVictims.id,
      victim: ransomwareVictims.victim,
      group: ransomwareVictims.group,
      attackDate: ransomwareVictims.attackDate,
      claimUrl: ransomwareVictims.claimUrl,
      source: ransomwareVictims.source,
      sources: ransomwareVictims.sources,
    })
    .from(ransomwareVictims)
    .where(eq(ransomwareVictims.country, iso))
    .orderBy(desc(ransomwareVictims.discoveredAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    victim: r.victim,
    group: r.group,
    attackDate: String(r.attackDate),
    claimUrl: r.claimUrl,
    source: r.source,
    sources: r.sources ?? [],
  }));
}

type BriefingJson = {
  headline?: string;
  bullets?: string[];
  outlook?: string;
};

function extractJson(text: string): BriefingJson | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as BriefingJson;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as BriefingJson;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function summarizeWithOllama(
  countryName: string,
  iso: string,
  news: CountryNewsItem[],
  victims: CountryVictimHit[],
): Promise<CountryBriefingResult["briefing"]> {
  const model = await resolveOllamaModel();
  if (!model) return null;

  const newsBlock = news
    .map(
      (n, i) =>
        `${i + 1}. ${n.title}${n.summary ? ` — ${n.summary.slice(0, 180)}` : ""}`,
    )
    .join("\n");
  const victimBlock = victims
    .slice(0, 5)
    .map((v) => `- ${v.victim} (${v.group}, ${v.attackDate})`)
    .join("\n");

  const system = `You are a professional CTI briefing officer for a Malaysia-first SOC console (Overlord).
Respond with a single JSON object only — no markdown fences.
Keys:
- headline: one short professional headline for this country briefing
- bullets: 3 to 5 concise bullet strings (facts / implications only)
- outlook: one short sentence on near-term watch posture
Be factual; if evidence is thin, say so. Do not invent incidents.`;

  const user = `Country: ${countryName} (${iso})
Top news (${news.length}):
${newsBlock || "(no matching news in archive)"}
Recent ransomware victims tagged ${iso}:
${victimBlock || "(none)"}
Write the briefing JSON.`;

  const base =
    process.env.OLLAMA_BASE_URL?.replace(/\/$/, "") ||
    "http://192.168.100.140:11434";

  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) return null;
  const payload = (await res.json()) as { message?: { content?: string } };
  const parsed = extractJson(payload.message?.content ?? "");
  if (!parsed) return null;

  const bullets = Array.isArray(parsed.bullets)
    ? parsed.bullets.map(String).filter(Boolean).slice(0, 5)
    : [];

  return {
    headline: String(parsed.headline ?? `${countryName} CTI briefing`).trim(),
    bullets,
    outlook: String(parsed.outlook ?? "").trim(),
    model: lastResolvedOllamaModel() || model,
  };
}

/** Top-5 country news + Ollama briefing (+ recent ransomware context). */
export async function getCountryBriefing(
  country: string,
): Promise<CountryBriefingResult> {
  const iso = country.trim().toUpperCase();
  const countryName = countryLabel(iso);

  const [news, victims] = await Promise.all([
    queryCountryNews(iso, 5),
    queryCountryVictims(iso, 8),
  ]);

  let briefing: CountryBriefingResult["briefing"] = null;
  let error: string | undefined;

  try {
    if (news.length > 0 || victims.length > 0) {
      briefing = await summarizeWithOllama(countryName, iso, news, victims);
      if (!briefing) {
        error = "Ollama briefing unavailable — showing source list only.";
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return {
    country: iso,
    countryName,
    news,
    victims,
    briefing,
    error,
  };
}

/** Lightweight count helper for UI chips. */
export async function countNewsMentioningCountry(
  country: string,
): Promise<number> {
  const terms = countrySearchTerms(country);
  const conditions = terms.flatMap((term) => [
    ilike(newsItems.title, `%${term}%`),
    ilike(newsItems.summary, `%${term}%`),
  ]);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(newsItems)
    .where(or(...conditions));
  return Number(row?.count ?? 0);
}
