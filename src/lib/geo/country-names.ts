/** ISO2 → English display name + search aliases for news matching. */
export const COUNTRY_NAMES: Record<string, { name: string; aliases: string[] }> =
  {
    MY: { name: "Malaysia", aliases: ["Malaysian", "Kuala Lumpur", "Putrajaya"] },
    SG: { name: "Singapore", aliases: ["Singaporean"] },
    ID: { name: "Indonesia", aliases: ["Indonesian", "Jakarta"] },
    TH: { name: "Thailand", aliases: ["Thai", "Bangkok"] },
    VN: { name: "Vietnam", aliases: ["Vietnamese", "Hanoi"] },
    PH: { name: "Philippines", aliases: ["Philippine", "Filipino", "Manila"] },
    US: { name: "United States", aliases: ["USA", "U.S.", "American"] },
    GB: { name: "United Kingdom", aliases: ["UK", "Britain", "British", "England"] },
    AU: { name: "Australia", aliases: ["Australian"] },
    CA: { name: "Canada", aliases: ["Canadian"] },
    DE: { name: "Germany", aliases: ["German", "Deutschland"] },
    FR: { name: "France", aliases: ["French"] },
    IT: { name: "Italy", aliases: ["Italian"] },
    ES: { name: "Spain", aliases: ["Spanish"] },
    NL: { name: "Netherlands", aliases: ["Dutch"] },
    BE: { name: "Belgium", aliases: ["Belgian"] },
    CH: { name: "Switzerland", aliases: ["Swiss"] },
    AT: { name: "Austria", aliases: ["Austrian"] },
    SE: { name: "Sweden", aliases: ["Swedish"] },
    NO: { name: "Norway", aliases: ["Norwegian"] },
    DK: { name: "Denmark", aliases: ["Danish"] },
    FI: { name: "Finland", aliases: ["Finnish"] },
    PL: { name: "Poland", aliases: ["Polish"] },
    PT: { name: "Portugal", aliases: ["Portuguese"] },
    IE: { name: "Ireland", aliases: ["Irish"] },
    JP: { name: "Japan", aliases: ["Japanese"] },
    KR: { name: "South Korea", aliases: ["Korea", "Korean"] },
    CN: { name: "China", aliases: ["Chinese"] },
    HK: { name: "Hong Kong", aliases: [] },
    TW: { name: "Taiwan", aliases: ["Taiwanese"] },
    IN: { name: "India", aliases: ["Indian"] },
    PK: { name: "Pakistan", aliases: ["Pakistani"] },
    BD: { name: "Bangladesh", aliases: ["Bangladeshi"] },
    BR: { name: "Brazil", aliases: ["Brazilian"] },
    MX: { name: "Mexico", aliases: ["Mexican"] },
    AR: { name: "Argentina", aliases: ["Argentine"] },
    CL: { name: "Chile", aliases: ["Chilean"] },
    CO: { name: "Colombia", aliases: ["Colombian"] },
    ZA: { name: "South Africa", aliases: ["South African"] },
    NG: { name: "Nigeria", aliases: ["Nigerian"] },
    EG: { name: "Egypt", aliases: ["Egyptian"] },
    AE: { name: "United Arab Emirates", aliases: ["UAE", "Emirati", "Dubai"] },
    SA: { name: "Saudi Arabia", aliases: ["Saudi"] },
    TR: { name: "Turkey", aliases: ["Turkish", "Türkiye"] },
    IL: { name: "Israel", aliases: ["Israeli"] },
    RU: { name: "Russia", aliases: ["Russian"] },
    UA: { name: "Ukraine", aliases: ["Ukrainian"] },
    NZ: { name: "New Zealand", aliases: ["Kiwi"] },
  };

export function countryLabel(iso: string): string {
  const key = iso.trim().toUpperCase();
  return COUNTRY_NAMES[key]?.name ?? key;
}

export function countrySearchTerms(iso: string): string[] {
  const key = iso.trim().toUpperCase();
  const entry = COUNTRY_NAMES[key];
  if (!entry) return [key];
  return [entry.name, key, ...entry.aliases];
}
