/** Display helper for attack dates and archive timestamps. */
export function formatWhen(iso: string | Date | null | undefined): string {
  if (iso == null) return "—";
  const raw = typeof iso === "string" ? iso : iso.toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
}
