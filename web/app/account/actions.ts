"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

/** Delete the signed-in account. The database removes everything that belongs to it (delete_my_account). */
export async function deleteAccount(form: FormData) {
  if (String(form.get("confirm") ?? "").trim() !== t.account.deleteWord) redirect("/account");
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) redirect("/account?error=delete");
  await supabase.auth.signOut(); // the session went with the account; this clears its cookies
  revalidateTag("published-scenarios");
  redirect("/privacy?deleted=1");
}
