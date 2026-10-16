"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { t } from "@/lib/messages";
import { GoogleIcon } from "./icons";

// Native <dialog>: focus trap, Escape to close and inert background come from the browser.
export function MobileNav() {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="grid h-11 w-11 place-items-center rounded-full border border-forest/20 2xl:hidden"
        aria-label={t.cta.menu}
        aria-haspopup="dialog"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && close()}
        className="m-0 ml-auto h-full max-h-none w-[85%] max-w-sm bg-cream p-6 text-ink shadow-lift backdrop:bg-ink/40"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-semibold text-forest">Menu</span>
          <button
            type="button"
            onClick={close}
            className="grid h-11 w-11 place-items-center rounded-full border border-forest/20"
            aria-label={t.cta.closeMenu}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile navigation">
          {t.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={`rounded-xl px-4 py-3 text-base font-semibold hover:bg-white ${
                "primary" in item ? "text-forest" : "text-ink/80 hover:text-forest"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 flex flex-col gap-3 border-t border-forest/10 pt-6">
          <Link
            href="/experiment"
            onClick={close}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-5 font-bold text-white"
          >
            {t.cta.experiment} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/sign-in"
            onClick={close}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-forest/20 px-5 font-bold text-forest"
          >
            <GoogleIcon /> {t.cta.google}
          </Link>
        </div>
      </dialog>
    </>
  );
}
