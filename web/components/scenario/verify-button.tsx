"use client";

import { useActionState } from "react";
import { BadgeCheck, CircleAlert, RefreshCw } from "lucide-react";
import { verifyScenario, type VerifyState } from "@/app/scenarios/actions";
import { t } from "@/lib/messages";

export function VerifyButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<VerifyState, FormData>(verifyScenario, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending}
        className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-white px-4 py-2 text-sm font-bold text-forest hover:border-forest disabled:opacity-50">
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />
        {pending ? t.scenarios.verifying : t.scenarios.verify}
      </button>
      <div aria-live="polite">
        {state.status === "match" && (
          <p className="flex items-start gap-2 text-sm font-semibold text-leaf">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {t.scenarios.match}
          </p>
        )}
        {(state.status === "differs" || state.status === "error") && (
          <p className="flex items-start gap-2 text-sm font-semibold text-loss">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {state.detail}
          </p>
        )}
      </div>
    </form>
  );
}
