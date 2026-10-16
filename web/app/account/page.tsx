import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { ScenarioList } from "@/components/scenario/scenario-list";
import { getMyScenarios, getPortfolio } from "@/lib/account-data";
import { getViewer } from "@/lib/auth";
import { fmtValue } from "@/lib/format";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountPage() {
  return (
    <section className="px-5 py-20">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-forest">{t.account.title}</h1>
        <Suspense fallback={<p className="text-ink/70">Loading…</p>}>
          <Account />
        </Suspense>
      </div>
    </section>
  );
}

async function Account() {
  // The page checks the session itself; middleware.ts only provides the friendly redirect.
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/account");
  const [portfolio, scenarios] = await Promise.all([getPortfolio(), getMyScenarios()]);
  const allocated = portfolio?.allocations.reduce((s, a) => s + a.units, 0) ?? 0;

  return (
    <>
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
