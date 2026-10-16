import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: "Sign-in problem", robots: { index: false } };

const REASONS = { cancelled: t.authError.cancelled, exchange: t.authError.exchange, start: t.authError.start };

export default function AuthErrorPage({ searchParams }: PageProps<"/auth/error">) {
  return (
    <section className="px-5 py-24">
      <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-soft sm:p-10" role="alert">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-forest">{t.authError.title}</h1>
        <Suspense fallback={<p className="mt-3 text-ink/70">{t.authError.start}</p>}>
          <Reason searchParams={searchParams} />
        </Suspense>
        <Link
          href="/sign-in"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-forest px-6 font-bold text-white hover:bg-leaf"
        >
          {t.authError.retry}
        </Link>
      </div>
    </section>
  );
}

async function Reason({ searchParams }: Pick<PageProps<"/auth/error">, "searchParams">) {
  const reason = [(await searchParams).reason].flat()[0] as keyof typeof REASONS | undefined;
  // only fixed messages are ever shown; the query string can't inject text
  return <p className="mt-3 text-ink/70">{(reason && REASONS[reason]) || t.authError.start}</p>;
}
