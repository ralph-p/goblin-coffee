export function formatGrams(g: number) {
  const sign = g < 0 ? "−" : "";
  const abs = Math.abs(g);
  return abs >= 1000 ? `${sign}${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 2)} kg` : `${sign}${abs} g`;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  return new Date(iso).toLocaleDateString("en-CA", opts);
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "21", "21.5", "$21.50" → 2150. Returns NaN for junk. */
export function parseDollars(input: string): number {
  const v = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return Number.NaN;
  return Math.round(Number(v) * 100);
}

export function centsToInput(cents: number | null) {
  return cents === null ? "" : (cents / 100).toFixed(2);
}
