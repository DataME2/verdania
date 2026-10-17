import Link from "next/link";
import { t } from "@/lib/messages";
import { Brand } from "./brand";

export function SiteFooter({ modelVersion }: { modelVersion: string }) {
  return (
    <footer className="bg-deeper px-5 py-14 text-white lg:px-10">
      <div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-8 md:flex-row">
        <div>
          <Brand inverse />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">{t.footer.blurb(modelVersion)}</p>
        </div>
        <nav className="flex flex-wrap content-start gap-x-6 gap-y-3 text-sm font-semibold text-white/70" aria-label="Footer">
          <Link href="/methodology" className="hover:text-white">Research and Methodology</Link>
          <Link href="/discover" className="hover:text-white">Discover Verdania</Link>
          <Link href="/methodology#data" className="hover:text-white">Synthetic data</Link>
          <Link href="/community" className="hover:text-white">Community</Link>
          <Link href="/community#contribute" className="hover:text-white">{t.contribute.footer}</Link>
          <Link href="/privacy" className="hover:text-white">{t.privacy.footer}</Link>
        </nav>
      </div>
    </footer>
  );
}
