"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { en } from "@/lib/messages";
import { es } from "@/lib/messages.es";
import { createClient } from "@/lib/supabase/server";

/** Delete the signed-in account. The database removes everything that belongs to it (delete_my_account). */
export async function deleteAccount(form: FormData) {
  // The confirmation word is typed in the page's language; either language's word is accepted.
  const word = String(form.get("confirm") ?? "").trim();
  if (word !== en.account.deleteWord && word !== es.account.deleteWord) redirect("/account");
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) redirect("/account?error=delete");
  await supabase.auth.signOut(); // the session went with the account; this clears its cookies
  revalidateTag("published-scenarios");
  redirect("/privacy?deleted=1");
}
