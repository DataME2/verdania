import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { getViewer } from "@/lib/auth";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountPage() {
  return (
    <section className="px-5 py-20">
      <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-8 shadow-soft sm:p-10">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-forest">{t.account.title}</h1>
        <Suspense fallback={<p className="mt-6 text-ink/60">Loading…</p>}>
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
  return (
    <>
      <dl className="mt-8 divide-y divide-forest/10 rounded-2xl border border-forest/10">
        <Row label="Name" value={viewer.displayName} />
        <Row
          label={t.account.since}
          value={viewer.createdAt ? new Date(viewer.createdAt).toLocaleDateString("en-GB", { dateStyle: "long" }) : "—"}
        />
        <Row label={t.account.visibility} value={viewer.isPublic ? t.account.public : t.account.private} />
      </dl>
      <p className="mt-6 text-sm text-ink/70">{t.account.next}</p>
      <form action={signOut} className="mt-8">
        <button
          type="submit"
          className="inline-flex min-h-12 items-center rounded-full border border-forest/20 px-6 font-bold text-forest hover:border-forest"
        >
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
