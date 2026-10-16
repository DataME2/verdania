import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lib/messages";

// Sections in the navigation that are not built yet: an honest page instead of a 404 or a fake.
const label = (href: string) => t.nav.find((n) => n.href === href)!.label;

export const comingSoonMetadata = (href: string): Metadata => ({ title: label(href) });

export function ComingSoon({ href }: { href: string }) {
  return (
    <section className="px-5 py-24 lg:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">{t.soon.eyebrow}</span>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-forest">{label(href)}</h1>
        <p className="mt-4 text-ink/70">{t.soon.lead}</p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 items-center rounded-full bg-forest px-6 font-bold text-white hover:bg-leaf"
        >
          {t.soon.back}
        </Link>
      </div>
    </section>
  );
}
