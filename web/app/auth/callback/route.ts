import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

// Google -> Supabase -> here with a one-time code. Exchange it for a session cookie, then go on.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const site = process.env.SITE_URL!;
  const code = params.get("code");

  if (!code) {
    // e.g. the visitor cancelled on Google's screen
    return NextResponse.redirect(new URL("/auth/error?reason=cancelled", site));
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/auth/error?reason=exchange", site));
  }
  return NextResponse.redirect(new URL(safeNext(params.get("next")), site));
}
