import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Viewer = { id: string; displayName: string; createdAt: string; isPublic: boolean };

/** The signed-in visitor, or null. Validates the session server-side; never trusts client state. */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  // RLS returns only the caller's own profile row.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, created_at, is_public")
    .eq("id", id)
    .maybeSingle();
  return {
    id,
    displayName: profile?.display_name ?? "Verdanian",
    createdAt: profile?.created_at ?? "",
    isPublic: profile?.is_public ?? false,
  };
}

/** Staff (admin or moderator) and admin flags for the signed-in visitor; the database decides. */
export async function getStaff(): Promise<{ moderator: boolean; admin: boolean }> {
  const supabase = await createClient();
  const [mod, admin] = await Promise.all([supabase.rpc("is_moderator"), supabase.rpc("has_role", { p_role: "admin" })]);
  return { moderator: mod.data === true, admin: admin.data === true };
}
