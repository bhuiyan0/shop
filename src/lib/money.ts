// Money is stored as integer poisha (1 BDT = 100 poisha) to avoid float errors.

export function toPoisha(taka: number): number {
  return Math.round(taka * 100);
}

export function toTaka(poisha: number): number {
  return poisha / 100;
}

/** Format poisha as a Bangladeshi Taka string, e.g. ৳1,250.00 */
export function formatBDT(
  poisha: number,
  opts: { locale?: "en" | "bn"; withSymbol?: boolean } = {},
): string {
  const { locale = "en", withSymbol = true } = opts;
  const taka = toTaka(poisha);
  const formatted = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(taka);
  return withSymbol ? `৳${formatted}` : formatted;
}
