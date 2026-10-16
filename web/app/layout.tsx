import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getBaseline } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Verdania: Can an economy serve humanity?", template: "%s · Verdania" },
  description:
    "An interactive economic laboratory: experiment with economic models, public policies and virtual investment in Verdania, a fictional country of 2,000,000 synthetic people.",
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const baseline = await getBaseline(); // cached public data, not a session read
  return (
    <html lang="en" className="h-full antialiased">
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
          Skip to content
        </a>
        <SiteHeader />
        <main id="content" className="flex-1">
          {children}
        </main>
        <SiteFooter modelVersion={baseline?.modelVersion ?? "0.1.0"} />
      </body>
    </html>
  );
}
