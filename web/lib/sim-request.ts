// Shape check for simulation requests coming from browsers. Ranges are the engine's job (it answers 422);
// this only makes sure nothing but a small, well-formed request is ever forwarded.

export const HORIZONS = [1, 5, 10, 20] as const;
export const PRESETS = ["baseline", "A", "B", "C", "D"] as const;
const CLOSURES = ["borrow", "adjust_other"];

export type SimRequest = {
  preset?: (typeof PRESETS)[number];
  levers: Record<string, number | string>;
  horizon: (typeof HORIZONS)[number];
};

export function parseSimRequest(body: unknown): SimRequest | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "expected a JSON object" };
  const { preset, levers = {}, horizon = 10, ...rest } = body as Record<string, unknown>;
  if (Object.keys(rest).length) return { error: `unexpected field ${Object.keys(rest)[0]}` };
  if (!HORIZONS.includes(horizon as never)) return { error: "horizon must be 1, 5, 10 or 20" };
  if (preset !== undefined && !PRESETS.includes(preset as never)) return { error: "unknown preset" };
  if (!levers || typeof levers !== "object" || Array.isArray(levers)) return { error: "levers must be an object" };
  const entries = Object.entries(levers as Record<string, unknown>);
  if (entries.length > 20) return { error: "too many levers" };
  for (const [code, value] of entries) {
    if (!/^[a-z][a-z_]{0,15}$/.test(code)) return { error: "bad lever name" };
    const ok = code === "closure" ? CLOSURES.includes(value as string) : typeof value === "number" && Number.isFinite(value);
    if (!ok) return { error: `bad value for ${code}` };
  }
  return {
    ...(preset && preset !== "baseline" ? { preset: preset as SimRequest["preset"] } : {}),
    levers: Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))) as SimRequest["levers"],
    horizon: horizon as SimRequest["horizon"],
  };
}
