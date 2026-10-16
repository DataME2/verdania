import Image from "next/image";
import Link from "next/link";
import { t } from "@/lib/messages";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-full" aria-label={t.brand.home}>
      <span className={`grid h-11 w-11 place-items-center rounded-full ${inverse ? "bg-cream" : "bg-white"} shadow-sm`}>
        <Image src="/brand/verdania-mark.png" alt="" width={30} height={30} priority />
      </span>
      <span>
        <strong className="block font-display text-xl tracking-tight">{t.brand.name}</strong>
        <span
          className={`block text-[10px] font-bold uppercase tracking-[.22em] ${inverse ? "text-sage" : "text-leaf"}`}
        >
          {t.brand.tagline}
        </span>
      </span>
    </Link>
  );
}
