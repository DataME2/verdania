import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toSummary, type ScenarioSummary } from "@/lib/data";
import type { SimRequest } from "@/lib/sim-request";

// Reads with the visitor's own session: row-level security decides what comes back.

export type Portfolio = {
  initial: number;
  unallocated: number;
  allocations: { projectId: string; units: number }[];
  ledger: { id: number; type: "grant" | "allocate" | "withdraw"; projectId: string | null; units: number; at: string }[];
};

/** The signed-in visitor's virtual portfolio, or null if they haven't joined (or aren't signed in). */
export async function getPortfolio(): Promise<Portfolio | null> {
  const supabase = await createClient();
  const { data: p } = await supabase.from("virtual_portfolios").select("id, initial_units, unallocated_units").maybeSingle();
  if (!p) return null;
  const [allocations, ledger] = await Promise.all([
    supabase.from("virtual_portfolio_allocations").select("project_id, units").eq("portfolio_id", p.id).gt("units", 0),
    supabase
      .from("virtual_ledger_entries")
      .select("id, entry_type, project_id, units, created_at")
      .eq("portfolio_id", p.id)
      .order("id", { ascending: false })
      .limit(12),
  ]);
  return {
    initial: Number(p.initial_units),
    unallocated: Number(p.unallocated_units),
    allocations: (allocations.data ?? []).map((a) => ({ projectId: a.project_id, units: Number(a.units) })),
    ledger: (ledger.data ?? []).map((e) => ({
      id: e.id,
      type: e.entry_type,
      projectId: e.project_id,
      units: Number(e.units),
      at: e.created_at,
    })),
  };
}

/** The signed-in visitor's own scenarios, newest first. */
export async function getMyScenarios(): Promise<ScenarioSummary[]> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return [];
  const { data } = await supabase
    .from("simulation_scenarios")
    .select("id, title, description, horizon, visibility, created_at, published_at")
    .eq("owner_id", claims.claims.sub)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map(toSummary);
}

export type Scenario = ScenarioSummary & {
  levers: Record<string, number | string>;
  structural: Record<string, number>;
  challenge: string | null;
  hidden: boolean;
  modelVersion: string;
  outputHash: string | null;
  inputHash: string | null;
  isOwner: boolean;
};

/** One scenario if the visitor may see it (public, or their own); otherwise null. */
export async function getScenario(id: string): Promise<Scenario | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const [{ data }, { data: claims }] = await Promise.all([
    supabase
      .from("simulation_scenarios")
      .select("id, owner_id, title, description, horizon, visibility, created_at, published_at, levers, structural_overrides, challenge_slug, moderation_status, model_version, input_hash, output_hash")
      .eq("id", id)
      .maybeSingle(),
    supabase.auth.getClaims(),
  ]);
  if (!data) return null;
  return {
    ...toSummary(data),
    levers: data.levers,
    structural: data.structural_overrides ?? {},
    challenge: data.challenge_slug,
    hidden: data.moderation_status === "hidden",
    modelVersion: data.model_version,
    inputHash: data.input_hash,
    outputHash: data.output_hash,
    isOwner: !!claims?.claims?.sub && claims.claims.sub === data.owner_id,
  };
}

/** The engine request that reproduces a saved scenario (shown on its page and re-run by "verify"). */
export function scenarioRequest(s: Scenario): SimRequest {
  return {
    levers: s.levers,
    horizon: s.horizon as SimRequest["horizon"],
    ...(Object.keys(s.structural).length ? { structural: s.structural } : {}),
  };
}
