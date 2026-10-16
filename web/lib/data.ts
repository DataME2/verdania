import "server-only";
import { cacheLife } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";

export type Preset = { slug: string; name: string; family: string | null; levers: Record<string, number | string> };
export type Baseline = {
  modelVersion: string;
  population: number;
  indicators: Record<string, number>;
  presets: Preset[];
};

/**
 * Published reference data. Identical for every visitor, so it is cached and prerendered.
 * null until the reference-data migration is deployed: pages then show "—", never invented figures.
 */
export async function getBaseline(): Promise<Baseline | null> {
  "use cache";
  cacheLife("hours");
  const db = createPublicClient();
  const [country, indicators, presets] = await Promise.all([
    db.from("country_configurations").select("population, model_version").eq("slug", "verdania").maybeSingle(),
    db.from("economic_indicators").select("code, value").is("region_id", null),
    db.from("public_policy_configurations").select("slug, name, model_family, levers").order("slug"),
  ]);
  if (!country.data) return null;
  return {
    modelVersion: country.data.model_version,
    population: country.data.population,
    indicators: Object.fromEntries((indicators.data ?? []).map((r) => [r.code, Number(r.value)])),
    presets: (presets.data ?? []).map((p) => ({ slug: p.slug, name: p.name, family: p.model_family, levers: p.levers })),
  };
}

/** Total virtual units allocated by participants (public aggregate only). */
export async function getAllocatedTotal(): Promise<number> {
  "use cache";
  cacheLife("minutes");
  const { data } = await createPublicClient().rpc("public_allocation_totals");
  return (data ?? []).reduce((sum: number, row: { units: number }) => sum + Number(row.units), 0);
}
