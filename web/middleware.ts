import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that need an account. Each page also re-checks the session itself; this is the friendly redirect.
const PRIVATE = ["/account"];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Scripts run only with this request's nonce (Next.js stamps it on its own scripts). Every page reads the
 * session, so pages render per request and the nonce is always fresh. Inline styles stay allowed: the
 * animation library sets them, and they cannot run code. Sign-in posts to the site, which then redirects
 * to Supabase and Google, so those two origins are allowed as form targets.
 */
function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
    "font-src 'self' https://cdn.fontshare.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    `form-action 'self' ${new URL(supabaseUrl).origin} https://accounts.google.com`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");
}

export async function middleware(request: NextRequest) {
  const refreshed: { name: string; value: string; options: CookieOptions }[] = [];
  const noCache: Record<string, string> = {};

  const supabase = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value)); // updates request.headers too
        refreshed.push(...cookiesToSet);
        Object.assign(noCache, headers); // never cache auth cookies
      },
    },
  });

  // Refreshes an expiring session; the new cookies are written onto the response below.
  const { data } = await supabase.auth.getClaims();

  const { pathname, search } = request.nextUrl;
  if (!data?.claims && PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", pathname + search);
    return NextResponse.redirect(signIn);
  }

  const csp = contentSecurityPolicy(btoa(crypto.randomUUID()));
  const headers = new Headers(request.headers);
  headers.set("content-security-policy", csp); // Next.js reads the nonce from here
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", csp);
  refreshed.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  Object.entries(noCache).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|icon.png|favicon.ico|robots.txt|sitemap.xml).*)"],
};
