import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const p = (await getT()).privacy;
  return { title: p.title, description: p.lead };
}

const link = "font-semibold text-forest underline hover:text-leaf";

export default async function PrivacyPage({ searchParams }: PageProps<"/privacy">) {
  const [params, t] = await Promise.all([searchParams, getT()]);
  const p = t.privacy;
  const deleted = params.deleted === "1";
  return (
    <section className="px-5 py-12 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        {deleted && <p role="status" className="rounded-2xl bg-vivid/20 p-5 font-semibold text-forest">{p.deleted}</p>}
        <header>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-forest">{p.title}</h1>
          <p className="mt-3 text-lg text-ink/80">{p.lead}</p>
          <p className="mt-2 text-sm text-ink/70">{p.updated}</p>
        </header>

        {p.sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`}>
            <h2 id={`${s.id}-title`} className="font-display text-2xl font-semibold text-forest">{s.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-ink/80">
              {s.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}

        <section id="choices" aria-labelledby="choices-title" className="rounded-[2rem] bg-white p-8 shadow-soft">
          <h2 id="choices-title" className="font-display text-2xl font-semibold text-forest">{p.choicesTitle}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink/80">
            <li>{p.choices.account} <Link href="/account" className={link}>{p.accountLink}</Link></li>
            <li>{p.choices.manage}</li>
            <li>{p.choices.delete}</li>
            <li>{p.choices.contact} <Link href="/community#contribute" className={link}>{p.contactLink}</Link></li>
          </ul>
        </section>
      </div>
    </section>
  );
}
