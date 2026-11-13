export const PROVINCES = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
} as const;

export type ProvinceCode = keyof typeof PROVINCES;
export const PROVINCE_CODES = Object.keys(PROVINCES) as ProvinceCode[];

export function isProvince(v: string): v is ProvinceCode {
  return v in PROVINCES;
}

const POSTAL_RE = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/i;

/** "k1a0b1" → "K1A 0B1", or null if not a valid Canadian postal code. */
export function normalizePostalCode(input: string): string | null {
  const v = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!POSTAL_RE.test(v)) return null;
  return `${v.slice(0, 3)} ${v.slice(3)}`;
}

/** Forward sortation area: the first 3 characters, used for local delivery. */
export function fsaOf(postalCode: string) {
  return postalCode.replace(/\s+/g, "").slice(0, 3).toUpperCase();
}
