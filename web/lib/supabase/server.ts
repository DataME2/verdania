import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Per-request client carrying the visitor's session. Create a new one for every request. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, which cannot set cookies. middleware.ts refreshes sessions.
        }
      },
    },
  });
}

/** Session-less client for public, published data. Safe inside `unstable_cache` (reads no cookies). */
export function createPublicClient() {
  return createPlainClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
