import Link from "next/link";
import { Globe, Lock } from "lucide-react";
import type { ScenarioSummary } from "@/lib/data";
import { getLocale, getT } from "@/lib/i18n-server";
import { INTL } from "@/lib/locale";

export async function ScenarioList({ scenarios, empty, showVisibility = false }: { scenarios: ScenarioSummary[]; empty: string; showVisibility?: boolean }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  if (scenarios.length === 0) return <p className="text-sm text-ink/70">{empty}</p>;
  return (
    <ul className="divide-y divide-forest/10">
      {scenarios.map((s) => (
        <li key={s.id} className="py-3">
          <Link href={`/scenarios/${s.id}`} className="font-semibold text-forest hover:text-leaf">{s.title}</Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink/70">
            {showVisibility && (
              <span className="inline-flex items-center gap-1">
                {s.visibility === "public" ? <Globe className="h-3 w-3" aria-hidden="true" /> : <Lock className="h-3 w-3" aria-hidden="true" />}
                {s.visibility === "public" ? t.scenarios.public : t.scenarios.private}
              </span>
            )}
            <span>{t.scenarios.horizon(s.horizon)}</span>
            <span>{new Date(s.publishedAt ?? s.createdAt).toLocaleDateString(INTL[locale], { dateStyle: "medium" })}</span>
          </p>
          {s.description && <p className="mt-1 line-clamp-2 text-sm text-ink/70">{s.description}</p>}
        </li>
      ))}
    </ul>
  );
}
