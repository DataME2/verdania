"use client";

import { createContext, useContext } from "react";
import { messages } from "@/lib/i18n";
import { LOCALE_COOKIE, type Locale } from "@/lib/locale";

const LocaleContext = createContext<Locale>("en");

/** The request's language, chosen on the server (lib/i18n-server.ts), for client components. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export const useLocale = () => useContext(LocaleContext);
export const useT = () => messages[useLocale()];

/** Switches to the other language: remembered in a cookie, then the page reloads in it. */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useT();
  const other: Locale = useLocale() === "en" ? "es" : "en";
  return (
    <button
      type="button"
      lang={other}
      title={t.language.switchLabel}
      onClick={() => {
        const secure = window.location.protocol === "https:" ? "; secure" : "";
        document.cookie = `${LOCALE_COOKIE}=${other}; path=/; max-age=31536000; samesite=lax${secure}`;
        window.location.reload();
      }}
      className={className}
    >
      {t.language.switchTo}
    </button>
  );
}
