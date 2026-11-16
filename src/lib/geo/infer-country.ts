/** Common multi-part / country TLDs → ISO2. */
const TLD_ISO: Record<string, string> = {
  "com.my": "MY",
  "gov.my": "MY",
  "edu.my": "MY",
  "org.my": "MY",
  "co.uk": "GB",
  "org.uk": "GB",
  "ac.uk": "GB",
  "com.au": "AU",
  "com.br": "BR",
  "com.sg": "SG",
  "com.hk": "HK",
  "co.jp": "JP",
  "co.in": "IN",
  "com.in": "IN",
  "co.za": "ZA",
  "com.mx": "MX",
  "com.tr": "TR",
  "com.ph": "PH",
  "com.tw": "TW",
  "com.ar": "AR",
  "co.id": "ID",
  "com.cn": "CN",
  "co.kr": "KR",
  "com.ng": "NG",
  "com.pk": "PK",
  de: "DE",
  fr: "FR",
  it: "IT",
  es: "ES",
  nl: "NL",
  be: "BE",
  ch: "CH",
  at: "AT",
  se: "SE",
  no: "NO",
  dk: "DK",
  fi: "FI",
  pl: "PL",
  pt: "PT",
  ie: "IE",
  cz: "CZ",
  ro: "RO",
  hu: "HU",
  gr: "GR",
  ua: "UA",
  ru: "RU",
  jp: "JP",
  kr: "KR",
  cn: "CN",
  in: "IN",
  sg: "SG",
  my: "MY",
  id: "ID",
  th: "TH",
  vn: "VN",
  ph: "PH",
  au: "AU",
  nz: "NZ",
  ca: "CA",
  mx: "MX",
  br: "BR",
  ar: "AR",
  cl: "CL",
  za: "ZA",
  ng: "NG",
  ke: "KE",
  eg: "EG",
  il: "IL",
  ae: "AE",
  sa: "SA",
  tr: "TR",
  tw: "TW",
  hk: "HK",
  uk: "GB",
};

const NAME_HINTS: [RegExp, string][] = [
  [/\bmalaysi[a]?\b/i, "MY"],
  [/\bsingapore\b/i, "SG"],
  [/\bindonesia\b/i, "ID"],
  [/\bthailand\b/i, "TH"],
  [/\bvietnam\b/i, "VN"],
  [/\bphilippines?\b/i, "PH"],
  [/\bjapan\b/i, "JP"],
  [/\bindia\b/i, "IN"],
  [/\baustralia\b/i, "AU"],
  [/\bcanada\b/i, "CA"],
  [/\bgermany\b/i, "DE"],
  [/\bfrance\b/i, "FR"],
  [/\bunited kingdom\b|\bbritain\b/i, "GB"],
  [/\bunited states\b|\b\bUSA\b/i, "US"],
];

/**
 * Infer ISO2 from victim label / description (domain in parens, TLD, name hints).
 * Conservative — returns null when unsure.
 */
export function inferCountryFromText(
  ...parts: Array<string | null | undefined>
): string | null {
  const text = parts.filter(Boolean).join(" \n ");
  if (!text.trim()) return null;

  for (const [re, iso] of NAME_HINTS) {
    if (re.test(text)) return iso;
  }

  // Prefer domain inside parentheses: "Acme Corp (acme.com.my)"
  const paren = text.match(/\(([a-z0-9.-]+\.[a-z.]{2,})\)/i);
  const domain =
    paren?.[1]?.toLowerCase() ??
    text.match(/\b([a-z0-9-]+(?:\.[a-z0-9-]+)+)\b/i)?.[1]?.toLowerCase();
  if (!domain) return null;

  const labels = domain.split(".").filter(Boolean);
  if (labels.length < 2) return null;

  const dual = labels.slice(-2).join(".");
  if (TLD_ISO[dual]) return TLD_ISO[dual]!;
  const single = labels[labels.length - 1]!;
  if (single.length === 2 && TLD_ISO[single]) return TLD_ISO[single]!;
  return null;
}
