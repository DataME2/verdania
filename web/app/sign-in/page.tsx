import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { signInWithGoogle } from "@/app/auth/actions";
import { GoogleIcon } from "@/components/icons";
import { safeNext } from "@/lib/safe-next";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).signIn.meta, robots: { index: false } };
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const t = await getT();
  return (
    <section className="px-5 py-20 lg:py-28">
      <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 shadow-soft sm:p-10">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-forest">{t.signIn.title}</h1>
        <p className="mt-3 text-ink/70">{t.signIn.lead}</p>

        <div className="mt-8 rounded-2xl bg-cream p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-forest">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> {t.signIn.storeTitle}
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink/80">
            {t.signIn.store.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <Suspense fallback={<GoogleButton next="/" label={t.cta.google} />}>
          <SignInForm searchParams={searchParams} label={t.cta.google} />
        </Suspense>
        <p className="mt-3 text-center text-xs text-ink/70">
          {t.signIn.consent}{" "}
          <Link href="/privacy" className="font-semibold text-forest underline hover:text-leaf">{t.signIn.privacyLink}</Link>
        </p>
        <Link href="/" className="mt-6 block text-center text-sm font-semibold text-forest hover:text-leaf">
          {t.signIn.noAccount}
        </Link>
      </div>
    </section>
  );
}

async function SignInForm({ searchParams, label }: Pick<PageProps<"/sign-in">, "searchParams"> & { label: string }) {
  const next = safeNext([(await searchParams).next].flat()[0]);
  return <GoogleButton next={next} label={label} />;
}

function GoogleButton({ next, label }: { next: string; label: string }) {
  return (
    <form action={signInWithGoogle} className="mt-8">
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full border border-forest/20 bg-white px-6 font-bold text-ink shadow-sm transition hover:border-forest hover:shadow-soft"
      >
        <GoogleIcon className="h-5 w-5" /> {label}
      </button>
    </form>
  );
}
