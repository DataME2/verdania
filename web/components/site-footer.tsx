import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { Brand } from "./brand";

export async function SiteFooter({ modelVersion }: { modelVersion: string }) {
  const t = await getT();
  const nav = (href: string) => t.nav.find((item) => item.href === href)?.label;
  return (
    <footer className="bg-deeper px-5 py-14 text-white lg:px-10">
      <div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-8 md:flex-row">
        <div>
          <Brand inverse />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">{t.footer.blurb(modelVersion)}</p>
        </div>
        <nav className="flex flex-wrap content-start gap-x-6 gap-y-3 text-sm font-semibold text-white/70" aria-label={t.cta.footerNav}>
          <Link href="/methodology" className="hover:text-white">{nav("/methodology")}</Link>
          <Link href="/discover" className="hover:text-white">{nav("/discover")}</Link>
          <Link href="/methodology#data" className="hover:text-white">{t.badges.synthetic}</Link>
          <Link href="/community" className="hover:text-white">{nav("/community")}</Link>
          <Link href="/community#contribute" className="hover:text-white">{t.contribute.footer}</Link>
          <Link href="/privacy" className="hover:text-white">{t.privacy.footer}</Link>
        </nav>
      </div>
    </footer>
  );
}
