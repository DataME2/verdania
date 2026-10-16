"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NEXT_COOKIE, safeNext } from "@/lib/safe-next";

export async function signInWithGoogle(formData: FormData) {
  // Where to land after sign-in travels in a short-lived cookie, not in redirectTo: Supabase matches
  // redirectTo against its allow-list including the query string, and the list stays an exact URL.
  (await cookies()).set(NEXT_COOKIE, safeNext(formData.get("next")?.toString()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SITE_URL?.startsWith("https://"),
    path: "/auth/callback",
    maxAge: 600,
  });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    // Fixed origin from config, never from request headers. Must equal an entry in Supabase's Redirect URLs.
    options: { redirectTo: `${process.env.SITE_URL}/auth/callback` },
  });
  if (error || !data.url) redirect("/auth/error?reason=start");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
