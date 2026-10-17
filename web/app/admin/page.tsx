import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { moderateScenario, setSuggestionStatus } from "@/app/admin/actions";
import { getStaff, getViewer } from "@/lib/auth";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Moderation", robots: { index: false } };

const a = t.admin;
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";

type Suggestion = { id: string; topic: string; message: string; name: string | null; email: string | null; user_id: string | null; status: string; created_at: string };
type Published = { id: string; title: string; description: string | null; published_at: string | null; moderation_status: string };
type Audit = { id: number; action: string; entity: string; entity_id: string | null; details: Record<string, unknown>; created_at: string };

export default async function AdminPage() {
  // Middleware only redirects anonymous visitors; the role check is here and, for every action, in the database.
  if (!(await getViewer())) redirect("/sign-in?next=/admin");
  const staff = await getStaff();
  if (!staff.moderator) notFound();

  const supabase = await createClient();
  const [suggestions, published, audit] = await Promise.all([
    supabase.rpc("list_suggestions", { p_limit: 200 }),
    supabase.rpc("list_published_scenarios", { p_limit: 200 }),
    staff.admin ? supabase.from("audit_logs").select("id, action, entity, entity_id, details, created_at").order("created_at", { ascending: false }).limit(50) : null,
  ]);
  const items = (suggestions.data ?? []) as Suggestion[];
  const scenarios = (published.data ?? []) as Published[];
  const log = (audit?.data ?? []) as Audit[];

  return (
    <section className="px-5 py-12 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-5xl space-y-12">
        <header>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-forest">{a.title}</h1>
          <p className="mt-3 text-ink/70">{a.lead}</p>
        </header>

        <section aria-labelledby="suggestions">
          <h2 id="suggestions" className="font-display text-3xl font-semibold text-forest">
            {a.suggestions} <span className="text-lg text-ink/70">({items.filter((s) => s.status === "new").length} {a.status.new.toLowerCase()})</span>
          </h2>
          {items.length === 0 ? (
            <p className="mt-4 text-ink/70">{a.noSuggestions}</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {items.map((s) => (
                <li key={s.id} className={`rounded-2xl border p-5 ${s.status === "new" ? "border-sun bg-white" : "border-forest/10 bg-white/60"}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-ink/70">
                    <span>
                      <strong className="text-forest">{t.contribute.topics[s.topic as keyof typeof t.contribute.topics] ?? s.topic}</strong> · {when(s.created_at)} ·{" "}
                      {a.status[s.status] ?? s.status}
                    </span>
                    <span>
                      {s.name ?? a.anonymous}
                      {s.user_id && ` (${a.signedIn})`}
                      {s.email && (
                        <>
                          {" · "}
                          <a href={`mailto:${s.email}`} className="font-semibold text-forest underline">{s.email}</a>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm text-ink">{s.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.keys(a.mark).filter((st) => st !== s.status).map((st) => (
                      <form key={st} action={setSuggestionStatus}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="status" value={st} />
                        <button type="submit" className="rounded-full border border-forest/20 px-3 py-1 text-xs font-bold text-forest hover:border-forest">
                          {a.mark[st]}
                        </button>
                      </form>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="published">
          <h2 id="published" className="font-display text-3xl font-semibold text-forest">{a.scenarios}</h2>
          {scenarios.length === 0 ? (
            <p className="mt-4 text-ink/70">{a.noScenarios}</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {scenarios.map((s) => {
                const hidden = s.moderation_status === "hidden";
                return (
                  <li key={s.id} className="rounded-2xl border border-forest/10 bg-white p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      {hidden ? (
                        <strong className="text-ink/80">{s.title}</strong>
                      ) : (
                        <Link href={`/scenarios/${s.id}`} className="font-bold text-forest underline">{s.title}</Link>
                      )}
                      <span className="text-xs text-ink/70">
                        {s.published_at && when(s.published_at)} · <strong>{hidden ? a.hidden : a.visible}</strong>
                      </span>
                    </div>
                    {s.description && <p className="mt-2 whitespace-pre-line text-sm text-ink/80">{s.description}</p>}
                    <form action={moderateScenario} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="status" value={hidden ? "visible" : "hidden"} />
                      <label className="flex-1 text-xs font-semibold text-ink/80">
                        {a.reason}
                        <input name="reason" required minLength={3} maxLength={500} className="mt-1 w-full rounded-xl border border-forest/20 px-3 py-2 text-sm font-normal" />
                      </label>
                      <button
                        type="submit"
                        className={`rounded-full px-4 py-2 text-sm font-bold ${hidden ? "bg-forest text-white hover:bg-leaf" : "border border-loss/40 text-loss hover:bg-loss/10"}`}
                      >
                        {hidden ? a.restore : a.hide}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {staff.admin && (
          <section aria-labelledby="audit">
            <h2 id="audit" className="font-display text-3xl font-semibold text-forest">{a.audit}</h2>
            <div className="relative mt-5 overflow-x-auto rounded-2xl border border-forest/10 bg-white" role="region" aria-labelledby="audit" tabIndex={0}>
              <table className="w-full min-w-[640px] text-left text-xs">
                <caption className="sr-only">{a.audit}</caption>
                <thead>
                  <tr className="border-b border-forest/15 text-ink/70">
                    {Object.values(a.auditCols).map((h) => <th key={h} scope="col" className="px-3 py-2 font-bold">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest/10">
                  {log.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-3 py-2">{when(e.created_at)}</td>
                      <td className="px-3 py-2 font-semibold text-forest">{e.action}</td>
                      <td className="px-3 py-2">{e.entity}{e.entity_id && ` · ${e.entity_id.slice(0, 8)}`}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink/80">{JSON.stringify(e.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
