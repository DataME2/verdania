"use client";

import { RotateCcw } from "lucide-react";
import { t } from "@/lib/messages";

// Replaces Next's bare "Application error" page. The usual cause is a page left open while a new version
// of the site was deployed: its forms then call server actions the new version does not have.
export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  const outdated = /Server Action .* was not found/.test(error.message);
  return (
    <section className="px-5 py-20">
      <div role="alert" className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 shadow-soft">
        <h1 className="font-display text-3xl font-semibold text-forest">{outdated ? t.error.outdatedTitle : t.error.title}</h1>
        <p className="mt-3 text-ink/80">{outdated ? t.error.outdated : t.error.lead}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 font-bold text-white hover:bg-leaf"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> {t.error.reload}
        </button>
      </div>
    </section>
  );
}
