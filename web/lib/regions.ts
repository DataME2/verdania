// Regional figures shown on /discover (map layers and table columns), with the unit each is formatted in.
export const LAYERS = [
  { code: "mean_income", unit: "V$" },
  { code: "poverty_relative", unit: "share" },
  { code: "unemployment", unit: "share" },
  { code: "health_access", unit: "index" },
  { code: "sector_share_agriculture", unit: "share" },
] as const;

export type Layer = (typeof LAYERS)[number]["code"];
