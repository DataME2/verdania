"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getScenario, scenarioRequest } from "@/lib/account-data";
import { getCountryId } from "@/lib/data";
import { getT } from "@/lib/i18n-server";
import { simulateFresh } from "@/lib/sim";
import { parseSimRequest } from "@/lib/sim-request";
import { createClient } from "@/lib/supabase/server";

const MAX_SCENARIOS = 100;

export type SaveState = { id?: string; error?: string };

/** Save the Lab's current scenario. The engine runs it fresh so the stored fingerprints are authoritative. */
export async function saveScenario(_prev: SaveState, form: FormData): Promise<SaveState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  const t = await getT();
  const e = t.scenarios.errors;
  if (!uid) return { error: e.signIn };

  let parsed;
  try {
    parsed = parseSimRequest(JSON.parse(String(form.get("request") ?? "")));
  } catch {
    return { error: e.unreadable };
  }
  if ("error" in parsed) return { error: parsed.error };
  const title = String(form.get("title") ?? "").trim().slice(0, 120) || t.scenarios.untitled;
  const description = String(form.get("description") ?? "").trim().slice(0, 4000) || null;
  const visibility = form.get("publish") === "on" ? "public" : "private";

  const { count } = await supabase.from("simulation_scenarios").select("id", { count: "exact", head: true }).eq("owner_id", uid);
  if ((count ?? 0) >= MAX_SCENARIOS) return { error: e.limit(MAX_SCENARIOS) };

  // The full lever set and any assumption overrides define the scenario; the starting preset is not
  // stored, so re-runs match exactly.
  const run = { levers: parsed.levers, horizon: parsed.horizon, ...(parsed.structural ? { structural: parsed.structural } : {}) };
  const outcome = await simulateFresh(run).catch(() => null);
  if (!outcome) return { error: e.engine };
  if (!outcome.ok) return { error: outcome.error };
  if (!outcome.data.output_hash) return { error: e.engineUpdate };

  const countryId = await getCountryId();
  const { data, error } = await supabase
    .from("simulation_scenarios")
    .insert({
      country_id: countryId,
      title,
      description,
      challenge_slug: t.experiment.challenges.find((c) => c.slug === form.get("challenge"))?.slug ?? t.experiment.challenges[0].slug,
      levers: outcome.data.inputs.levers,
      structural_overrides: outcome.data.inputs.structural_overrides ?? {},
      horizon: parsed.horizon,
      model_version: outcome.data.model_version,
      visibility,
      input_hash: outcome.data.input_hash,
      output_hash: outcome.data.output_hash,
    })
    .select("id")
    .single();
  if (error || !data) return { error: e.save };

  revalidatePath("/account");
  if (visibility === "public") revalidateTag("published-scenarios");
  return { id: data.id };
}

export type VerifyState = { status?: "match" | "differs" | "error"; detail?: string };

/** Re-run a saved scenario now and compare the engine's output fingerprint with the stored one. */
export async function verifyScenario(_prev: VerifyState, form: FormData): Promise<VerifyState> {
  const [scenario, t] = await Promise.all([getScenario(String(form.get("id") ?? "")), getT()]);
  const e = t.scenarios.errors;
  if (!scenario) return { status: "error", detail: e.notFound };
  const outcome = await simulateFresh(scenarioRequest(scenario)).catch(() => null);
  if (!outcome || !outcome.ok) return { status: "error", detail: e.rerun };
  if (outcome.data.model_version !== scenario.modelVersion) {
    return { status: "differs", detail: e.version(scenario.modelVersion, outcome.data.model_version) };
  }
  return outcome.data.output_hash === scenario.outputHash
    ? { status: "match", detail: outcome.data.output_hash }
    : { status: "differs", detail: e.differs };
}

export async function setVisibility(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  const visibility = form.get("visibility") === "public" ? "public" : "private";
  const supabase = await createClient();
  await supabase.from("simulation_scenarios").update({ visibility }).eq("id", id); // RLS: owner only
  revalidatePath(`/scenarios/${id}`);
  revalidatePath("/account");
  revalidateTag("published-scenarios");
}

export async function deleteScenario(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("simulation_scenarios").delete().eq("id", id); // RLS: owner only
  revalidatePath("/account");
  revalidateTag("published-scenarios");
  redirect("/account");
}
