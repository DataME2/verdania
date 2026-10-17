import "server-only";
import { getMethodology } from "./data";
import { getT } from "./i18n-server";
import { localizeResult, localizeSensitivity } from "./localize";
import type { Sensitivity, SimResult } from "./sim-types";

/** The structural values a run used: each parameter's central value, with the run's overrides on top. */
async function runValues(r: SimResult): Promise<Record<string, number>> {
  const params = (await getMethodology(r.model_version))?.parameters ?? [];
  return { ...Object.fromEntries(params.filter((p) => p.kind === "structural").map((p) => [p.code, p.base])), ...r.inputs.structural_overrides };
}

/** An engine result in the visitor's language. English results pass through untouched. */
export async function localized<R extends SimResult | null>(r: R): Promise<R> {
  const t = await getT();
  if (!r || t.locale === "en") return r;
  return localizeResult(r, t, await runValues(r)) as R;
}

export async function localizedSensitivity(s: Sensitivity): Promise<Sensitivity> {
  const t = await getT();
  return t.locale === "en" ? s : localizeSensitivity(s, t);
}
