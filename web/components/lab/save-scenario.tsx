"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Save } from "lucide-react";
import { saveScenario, type SaveState } from "@/app/scenarios/actions";
import { GoogleIcon } from "@/components/icons";
import { t } from "@/lib/messages";
import type { SimRequest } from "@/lib/sim-request";

export function SaveScenario({
  challenge,
  request,
  signedIn,
  next,
}: {
  challenge: string;
  request: SimRequest;
  signedIn: boolean;
  next: string;
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveScenario, {});

  if (!signedIn) {
    // `next` is this exact scenario's lab URL, so sign-in returns here with every lever intact.
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(next)}`}
        className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-white px-4 py-2 text-sm font-bold text-forest hover:border-forest"
      >
        <GoogleIcon /> {t.scenarios.signIn}
      </Link>
    );
  }

  return (
    <details className="rounded-[2rem] bg-white p-5 shadow-soft">
      <summary className="flex cursor-pointer items-center gap-2 font-bold text-forest">
        <Save className="h-4 w-4" aria-hidden="true" /> {t.scenarios.save}
      </summary>
      <p className="mt-2 text-sm text-ink/70">{t.scenarios.saveLead}</p>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="request" value={JSON.stringify(request)} />
        <input type="hidden" name="challenge" value={challenge} />
        <label className="block text-sm font-semibold text-ink/80">
          {t.scenarios.titleLabel}
          <input name="title" maxLength={120} defaultValue={t.scenarios.titleDefault} required
            className="mt-1 w-full rounded-xl border border-forest/20 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="block text-sm font-semibold text-ink/80">
          {t.scenarios.descriptionLabel}
          <textarea name="description" maxLength={4000} rows={3}
            className="mt-1 w-full rounded-xl border border-forest/20 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input type="checkbox" name="publish" className="h-4 w-4 accent-forest" /> {t.scenarios.publish}
        </label>
        <button type="submit" disabled={pending}
          className="rounded-full bg-forest px-5 py-2 text-sm font-bold text-white hover:bg-leaf disabled:opacity-40">
          {pending ? t.scenarios.saving : t.scenarios.save}
        </button>
        <p aria-live="polite" className="text-sm">
          {state.error && <span className="font-semibold text-loss">{state.error}</span>}
          {state.id && (
            <>
              <span className="font-semibold text-leaf">{t.scenarios.saved}</span>{" "}
              <Link href={`/scenarios/${state.id}`} className="font-bold text-forest underline">{t.scenarios.open}</Link>
            </>
          )}
        </p>
      </form>
    </details>
  );
}
