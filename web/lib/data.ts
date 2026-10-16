import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";

export type Preset = { slug: string; name: string; family: string | null; levers: Record<string, number | string> };
export type Baseline = {
  modelVersion: string;
  population: number;
  indicators: Record<string, number>;
  presets: Preset[];
};

/**
 * Published reference data. Identical for every visitor, so it is cached server-side.
 * null until the reference-data migration is deployed: pages then show "—", never invented figures.
 */
export const getBaseline = unstable_cache(
  async (): Promise<Baseline | null> => {
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
  },
  ["baseline"],
  { revalidate: 3600 },
);

export type Lever = { code: string; label: string; unit: string | null; min: number; max: number; base: number };

/** Policy levers from the engine-generated parameter registry, so sliders can't drift from the model. */
export const getLevers = unstable_cache(
  async (modelVersion: string): Promise<Lever[]> => {
    const { data } = await createPublicClient()
      .from("simulation_parameters")
      .select("code, label, unit, min_value, max_value, default_value")
      .eq("kind", "lever")
      .eq("model_version", modelVersion);
    return (data ?? []).map((p) => ({
      code: p.code,
      label: p.label,
      unit: p.unit,
      min: Number(p.min_value),
      max: Number(p.max_value),
      base: Number(p.default_value),
    }));
  },
  ["levers"],
  { revalidate: 3600 },
);

export type Evidence = "empirical-range" | "contested" | "theoretical" | "synthetic";
export type Parameter = Lever & { kind: "lever" | "structural"; evidence: Evidence; source: string | null };
export type ModelVersion = { version: string; releasedAt: string; isCurrent: boolean; notes: string };
export type Methodology = { parameters: Parameter[]; versions: ModelVersion[]; empiricalRows: number };

/** The parameter registry and version history, read from the database so the page can't drift from the model. */
export const getMethodology = unstable_cache(
  async (modelVersion: string): Promise<Methodology> => {
    const db = createPublicClient();
    const [params, versions, empirical] = await Promise.all([
      db
        .from("simulation_parameters")
        .select("code, label, kind, unit, min_value, max_value, default_value, evidence, source")
        .eq("model_version", modelVersion)
        .order("id"),
      db.from("model_versions").select("version, released_at, is_current, notes").order("released_at", { ascending: false }),
      db.from("economic_indicators").select("id", { count: "exact", head: true }).neq("data_kind", "synthetic"),
    ]);
    return {
      parameters: (params.data ?? []).map((p) => ({
        code: p.code,
        label: p.label,
        kind: p.kind,
        unit: p.unit,
        min: Number(p.min_value),
        max: Number(p.max_value),
        base: Number(p.default_value),
        evidence: p.evidence,
        source: p.source,
      })),
      versions: (versions.data ?? []).map((v) => ({
        version: v.version,
        releasedAt: v.released_at,
        isCurrent: v.is_current,
        notes: v.notes,
      })),
      empiricalRows: empirical.count ?? 0,
    };
  },
  ["methodology"],
  { revalidate: 3600 },
);

export type ProjectTotal = { projectId: string; category: string; participants: number; units: number };

/** Participants' virtual allocations, public aggregate only: projects with fewer than 5 participants are absent. */
export const getPublicTotals = unstable_cache(
  async (): Promise<ProjectTotal[]> => {
    const { data } = await createPublicClient().rpc("public_allocation_totals");
    return (data ?? []).map((r: { project_id: string; category: string; participants: number; units: number }) => ({
      projectId: r.project_id,
      category: r.category,
      participants: Number(r.participants),
      units: Number(r.units),
    }));
  },
  ["public-totals"],
  { revalidate: 60 },
);

export async function getAllocatedTotal(): Promise<number> {
  return (await getPublicTotals()).reduce((sum, r) => sum + r.units, 0);
}

export type Project = {
  id: string;
  title: string;
  summary: string;
  category: string;
  region: string | null;
  fundingTarget: number;
  publicContribution: number;
  returnLow: number;
  returnCentral: number;
  returnHigh: number;
  jobsPerMillion: number;
  socialNote: string;
  environmentalNote: string;
  risk: "low" | "medium" | "high";
  years: number;
  assumptions: string[];
};

/** Published investment projects (synthetic). Figures are project assumptions, not model outputs. */
export const getProjects = unstable_cache(
  async (): Promise<Project[]> => {
    const { data } = await createPublicClient()
      .from("investment_projects")
      .select(
        "id, title, summary, category, funding_target, public_contribution, private_return_low, private_return_central, private_return_high, jobs_per_million, social_return_note, environmental_note, risk_level, horizon_years, assumptions, administrative_regions(name)",
      )
      .order("category");
    return (data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      category: p.category,
      region: (p.administrative_regions as unknown as { name: string } | null)?.name ?? null,
      fundingTarget: Number(p.funding_target),
      publicContribution: Number(p.public_contribution),
      returnLow: Number(p.private_return_low),
      returnCentral: Number(p.private_return_central),
      returnHigh: Number(p.private_return_high),
      jobsPerMillion: Number(p.jobs_per_million),
      socialNote: p.social_return_note,
      environmentalNote: p.environmental_note,
      risk: p.risk_level,
      years: p.horizon_years,
      assumptions: (p.assumptions as string[]) ?? [],
    }));
  },
  ["projects"],
  { revalidate: 3600 },
);

export type Region = {
  code: string;
  name: string;
  description: string;
  population: number;
  areaKm2: number;
  /** Baseline indicators from the engine-generated seed: mean_income, poverty_relative, unemployment, health_access, sector_share_*. */
  stats: Record<string, number>;
};

/** The six regions with their synthetic baseline indicators, largest population first. */
export const getRegions = unstable_cache(
  async (): Promise<Region[]> => {
    const db = createPublicClient();
    const [regions, indicators] = await Promise.all([
      db.from("administrative_regions").select("id, code, name, description, population, area_km2").order("population", { ascending: false }),
      db.from("economic_indicators").select("region_id, code, value").not("region_id", "is", null),
    ]);
    return (regions.data ?? []).map((r) => ({
      code: r.code,
      name: r.name,
      description: r.description,
      population: r.population,
      areaKm2: Number(r.area_km2),
      stats: Object.fromEntries((indicators.data ?? []).filter((i) => i.region_id === r.id).map((i) => [i.code, Number(i.value)])),
    }));
  },
  ["regions"],
  { revalidate: 3600 },
);

export const getCountryId = unstable_cache(
  async (): Promise<string | null> => {
    const { data } = await createPublicClient().from("country_configurations").select("id").eq("slug", "verdania").maybeSingle();
    return data?.id ?? null;
  },
  ["country-id"],
  { revalidate: 86_400 },
);

export type ScenarioSummary = {
  id: string;
  title: string;
  description: string | null;
  horizon: number;
  visibility: "private" | "public";
  createdAt: string;
  publishedAt: string | null;
};

/** Scenarios participants chose to publish (public, newest first). */
export const getPublishedScenarios = unstable_cache(
  async (): Promise<ScenarioSummary[]> => {
    const { data } = await createPublicClient()
      .from("simulation_scenarios")
      .select("id, title, description, horizon, visibility, created_at, published_at")
      .eq("visibility", "public")
      .order("published_at", { ascending: false })
      .limit(50);
    return (data ?? []).map(toSummary);
  },
  ["published-scenarios"],
  { revalidate: 60, tags: ["published-scenarios"] },
);

export function toSummary(r: {
  id: string;
  title: string;
  description: string | null;
  horizon: number;
  visibility: "private" | "public";
  created_at: string;
  published_at: string | null;
}): ScenarioSummary {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    horizon: r.horizon,
    visibility: r.visibility,
    createdAt: r.created_at,
    publishedAt: r.published_at,
  };
}
