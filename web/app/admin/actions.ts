"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// The database functions check the caller's role and write the audit log; these only forward the form.

export async function setSuggestionStatus(form: FormData): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("set_suggestion_status", { p_id: String(form.get("id") ?? ""), p_status: String(form.get("status") ?? "") });
  revalidatePath("/admin");
}

export async function moderateScenario(form: FormData): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("moderate_scenario", {
    p_id: String(form.get("id") ?? ""),
    p_status: String(form.get("status") ?? ""),
    p_reason: String(form.get("reason") ?? ""),
  });
  revalidatePath("/admin");
  revalidateTag("published-scenarios");
}
