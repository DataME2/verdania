// Number formatting by unit, shared by server and client components. Numbers are written the same way in
// both languages (Latin American Spanish uses 20,899.5 too); only the few words below change.
import type { Locale } from "./locale";

const EPS = 1e-9;
const WORDS = {
  en: { none: "no change", pts: "pts", borrow: "Borrow", cut: "Cut other spending", ofOutput: " of output" },
  es: { none: "sin cambio", pts: "pp", borrow: "Endeudarse", cut: "Recortar otro gasto", ofOutput: " del PIB" },
};

export function fmtValue(v: number | null | undefined, unit: string): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (unit === "V$") return `V$ ${Math.round(v).toLocaleString("en")}`;
  if (unit.startsWith("share")) return `${(v * 100).toFixed(1)}%`;
  if (unit === "ratio") return v.toFixed(2);
  return v.toFixed(3); // index
}

/** The smallest change each unit's display can show, and how to write "less than that". */
function precision(unit: string, l: Locale = "en"): [number, string] {
  if (unit === "V$") return [0.5, "V$ 1"];
  if (unit.startsWith("share")) return [0.0005, `0.1 ${WORDS[l].pts}`];
  if (unit === "ratio") return [0.005, "0.01"];
  return [0.0005, "0.001"]; // index
}

export function fmtDelta(d: number | null | undefined, unit: string, l: Locale = "en"): string {
  if (d == null || !Number.isFinite(d)) return "—";
  if (Math.abs(d) < EPS) return WORDS[l].none;
  const sign = d > 0 ? "+" : "−";
  const a = Math.abs(d);
  const [step, smallest] = precision(unit, l);
  if (a < step) return `${sign}<${smallest}`; // never "+0.0 pts"
  if (unit === "V$") return `${sign}V$ ${Math.round(a).toLocaleString("en")}`;
  if (unit.startsWith("share")) return `${sign}${(a * 100).toFixed(1)} ${WORDS[l].pts}`;
  if (unit === "ratio") return `${sign}${a.toFixed(2)}`;
  return `${sign}${a.toFixed(3)}`;
}

/** Lever values are shares: 0.35 -> "35%", 0.045 -> "4.5%". */
export function fmtLever(v: number | string, unit: string | null, l: Locale = "en"): string {
  if (typeof v === "string") return v === "borrow" ? WORDS[l].borrow : WORDS[l].cut;
  const pct = v * 100;
  return `${Number.isInteger(Math.round(pct * 10) / 10) ? Math.round(pct) : pct.toFixed(1)}%${unit === "share of output" ? WORDS[l].ofOutput : ""}`;
}

/** Structural parameters are plain coefficients: 0.0125, −0.05. */
export function fmtParam(v: number): string {
  return v.toLocaleString("en", { maximumFractionDigits: 4 }).replace("-", "−");
}

export type Tone = "good" | "bad" | "neutral";

/**
 * Colour only follows a direction the engine marks as desirable; contested measures stay neutral, and so
 * does a change too small to show.
 */
export function tone(d: number | null | undefined, desirable: "up" | "down" | null, unit: string): Tone {
  if (d == null || !desirable || Math.abs(d) < precision(unit)[0]) return "neutral";
  return (d > 0) === (desirable === "up") ? "good" : "bad";
}
