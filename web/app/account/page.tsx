import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { deleteAccount } from "@/app/account/actions";
import { signOut } from "@/app/auth/actions";
import { ScenarioList } from "@/components/scenario/scenario-list";
import { getMyScenarios, getPortfolio } from "@/lib/account-data";
import { getStaff, getViewer } from "@/lib/auth";
import { fmtValue } from "@/lib/format";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <section className="px-5 py-20">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-forest">{t.account.title}</h1>
        <Suspense fallback={<p className="text-ink/70">Loading…</p>}>
          <Account searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function Account({ searchParams }: Pick<PageProps<"/account">, "searchParams">) {
  // The page checks the session itself; middleware.ts only provides the friendly redirect.
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/account");
  const [portfolio, scenarios, staff] = await Promise.all([getPortfolio(), getMyScenarios(), getStaff()]);
  const allocated = portfolio?.allocations.reduce((s, a) => s + a.units, 0) ?? 0;
  const deleteFailed = (await searchParams).error === "delete";

  return (
    <>
      {staff.moderator && (
        <Link href="/admin" className="inline-flex rounded-full bg-forest px-5 py-2 text-sm font-bold text-white hover:bg-leaf">
          {t.admin.title}
        </Link>
      )}
      <div className="rounded-[2rem] bg-white p-8 shadow-soft">
        <dl className="divide-y divide-forest/10 rounded-2xl border border-forest/10">
          <Row label="Name" value={viewer.displayName} />
          <Row
            label={t.account.since}
            value={viewer.createdAt ? new Date(viewer.createdAt).toLocaleDateString("en-GB", { dateStyle: "long" }) : "—"}
          />
          <Row label={t.account.visibility} value={viewer.isPublic ? t.account.public : t.account.private} />
        </dl>
      </div>

      <section className="rounded-[2rem] bg-white p-8 shadow-soft" aria-labelledby="acct-portfolio">
        <h2 id="acct-portfolio" className="font-display text-2xl font-semibold text-forest">{t.account.portfolio}</h2>
        {portfolio ? (
          <p className="mt-2 text-sm text-ink/80">
            {fmtValue(allocated, "V$")} {t.market.allocated.toLowerCase()} across {portfolio.allocations.length} projects ·{" "}
            {fmtValue(portfolio.unallocated, "V$")} {t.market.unallocated.toLowerCase()}
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink/70">{t.account.notJoined}</p>
        )}
        <Link href="/market" className="mt-3 inline-block font-bold text-forest hover:text-leaf">{t.account.goMarket}</Link>
      </section>

      <section className="rounded-[2rem] bg-white p-8 shadow-soft" aria-labelledby="acct-scenarios">
        <h2 id="acct-scenarios" className="font-display text-2xl font-semibold text-forest">{t.scenarios.mine}</h2>
        <div className="mt-4">
          <ScenarioList scenarios={scenarios} empty={t.scenarios.none} showVisibility />
        </div>
      </section>

      <form action={signOut}>
        <button type="submit" className="inline-flex min-h-12 items-center rounded-full border border-forest/20 px-6 font-bold text-forest hover:border-forest">
          {t.account.signOut}
        </button>
      </form>

      <section className="rounded-[2rem] border border-loss/30 bg-white p-8" aria-labelledby="acct-delete">
        <h2 id="acct-delete" className="font-display text-2xl font-semibold text-forest">{t.account.deleteTitle}</h2>
        <p className="mt-2 text-sm text-ink/80">
          {t.account.deleteLead}{" "}
          <Link href="/privacy#choices" className="font-semibold text-forest underline hover:text-leaf">{t.scenarios.privacyLink}</Link>
        </p>
        {deleteFailed && <p role="alert" className="mt-3 text-sm font-semibold text-loss">{t.account.deleteError}</p>}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-bold text-loss">{t.account.deleteOpen}</summary>
          <form action={deleteAccount} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm font-semibold text-ink/80">
              {t.account.deleteConfirm(t.account.deleteWord)}
              <input name="confirm" required pattern={t.account.deleteWord} title={t.account.deleteConfirm(t.account.deleteWord)} autoComplete="off"
                className="mt-1 w-full rounded-xl border border-forest/20 px-3 py-2 text-sm font-normal" />
            </label>
            <button type="submit" className="min-h-11 rounded-full bg-loss px-5 py-2 text-sm font-bold text-white hover:bg-loss/90">
              {t.account.deleteButton}
            </button>
          </form>
        </details>
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-5 py-4 text-sm">
      <dt className="text-ink/70">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}
