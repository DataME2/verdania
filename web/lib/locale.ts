export type Locale = "en" | "es";

/** Remembers the visitor's choice of language for a year. */
export const LOCALE_COOKIE = "lang";

/** Date and number conventions. Latin American Spanish writes numbers the way English does (20,899.5). */
export const INTL: Record<Locale, string> = { en: "en-GB", es: "es-419" };

/** The saved choice if there is one, else whichever of the two the browser ranks higher, else English. */
export function pickLocale(saved: string | undefined, acceptLanguage: string | null): Locale {
  if (saved === "en" || saved === "es") return saved;
  const ranked = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().toLowerCase().split(";q=");
      return { tag, q: q === undefined ? 1 : Number(q) || 0 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    if (tag.startsWith("es")) return "es";
    if (tag.startsWith("en")) return "en";
  }
  return "en";
}
