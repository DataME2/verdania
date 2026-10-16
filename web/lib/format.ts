// Number formatting by unit, shared by server and client components.
const EPS = 1e-9;

export function fmtValue(v: number | null | undefined, unit: string): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (unit === "V$") return `V$ ${Math.round(v).toLocaleString("en")}`;
  if (unit.startsWith("share")) return `${(v * 100).toFixed(1)}%`;
  if (unit === "ratio") return v.toFixed(2);
  return v.toFixed(3); // index
}

export function fmtDelta(d: number | null | undefined, unit: string): string {
  if (d == null || !Number.isFinite(d)) return "—";
  if (Math.abs(d) < EPS) return "no change";
  const sign = d > 0 ? "+" : "−";
  const a = Math.abs(d);
  if (unit === "V$") return `${sign}V$ ${Math.round(a).toLocaleString("en")}`;
  if (unit.startsWith("share")) return `${sign}${(a * 100).toFixed(1)} pts`;
  if (unit === "ratio") return `${sign}${a.toFixed(2)}`;
  return `${sign}${a.toFixed(3)}`;
}

/** Lever values are shares: 0.35 -> "35%", 0.045 -> "4.5%". */
export function fmtLever(v: number | string, unit: string | null): string {
  if (typeof v === "string") return v === "borrow" ? "Borrow" : "Cut other spending";
  const pct = v * 100;
  return `${Number.isInteger(Math.round(pct * 10) / 10) ? Math.round(pct) : pct.toFixed(1)}%${unit === "share of output" ? " of output" : ""}`;
}

export type Tone = "good" | "bad" | "neutral";

/** Colour only follows a direction the engine marks as desirable; contested measures stay neutral. */
export function tone(d: number | null | undefined, desirable: "up" | "down" | null): Tone {
  if (d == null || !desirable || Math.abs(d) < EPS) return "neutral";
  return (d > 0) === (desirable === "up") ? "good" : "bad";
}
