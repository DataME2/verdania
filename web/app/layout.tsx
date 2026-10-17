import type { Metadata } from "next";
import { LocaleProvider } from "@/components/i18n";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getBaseline } from "@/lib/data";
import { getLocale, getT } from "@/lib/i18n-server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: t.meta.title, template: "%s · Verdania" },
    description: t.meta.description,
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [baseline, locale, t] = await Promise.all([getBaseline(), getLocale(), getT()]); // cached public data, not a session read
  return (
    <html lang={locale} className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,600,700,800&f[]=satoshi@400,500,600,700&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col overflow-x-hidden">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-white"
        >
          {t.cta.skip}
        </a>
        <LocaleProvider locale={locale}>
          <SiteHeader />
          <main id="content" className="flex-1">
            {children}
          </main>
          <SiteFooter modelVersion={baseline?.modelVersion ?? "0.1.0"} />
        </LocaleProvider>
      </body>
    </html>
  );
}
