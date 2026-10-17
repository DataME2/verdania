import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { getT } from "@/lib/i18n-server";
import { AccountControl, SignInLink } from "./account-control";
import { Brand } from "./brand";
import { LanguageSwitch } from "./i18n";
import { MobileNav } from "./mobile-nav";

// No display utility here: callers add their own (`inline-flex`, or `hidden sm:inline-flex`), since two
// display classes on one element resolve by stylesheet order, not class order.
const pill =
  "min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-forest px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-leaf";

// Eight sections only fit on one row from 2xl (1536px); below that they live in the menu drawer.
export async function SiteHeader() {
  const t = await getT();
  return (
    <header className="sticky top-0 z-50 border-b border-forest/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between gap-4 px-5 lg:px-10">
        <Brand />
        <nav className="hidden items-center gap-x-4 2xl:flex" aria-label={t.cta.primaryNav}>
          {t.nav.map((item) =>
            "primary" in item ? (
              <Link key={item.href} href={item.href} className={`${pill} inline-flex`}>
                {item.label} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded text-[13px] font-semibold text-ink/70 transition hover:text-forest"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitch className="hidden rounded px-1 text-sm font-semibold text-ink/70 transition hover:text-forest sm:inline" />
          <Suspense fallback={<SignInLink label={t.cta.google} />}>
            <AccountControl />
          </Suspense>
          <Link href="/experiment" className={`${pill} hidden sm:inline-flex 2xl:hidden`}>
            {t.cta.experiment} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
