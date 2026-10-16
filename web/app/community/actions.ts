"use server";

import { headers } from "next/headers";
import { t } from "@/lib/messages";
import { clientIp, rateLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export type SuggestionState = { sent?: boolean; error?: string };

const TOPICS = Object.keys(t.contribute.topics);
const allowed = rateLimiter(5, 10 * 60_000); // five messages per sender every ten minutes

/** The database function validates again and caps the overall rate; this keeps the obvious cases off it. */
export async function submitSuggestion(_prev: SuggestionState, form: FormData): Promise<SuggestionState> {
  if (String(form.get("website") ?? "")) return { sent: true }; // honeypot: bots fill every field, people never see this one
  if (!allowed(clientIp(await headers()))) return { error: t.contribute.busy };

  const topic = String(form.get("topic") ?? "");
  const message = String(form.get("message") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  if (!TOPICS.includes(topic) || message.length < 10 || message.length > 4000 || name.length > 120) {
    return { error: t.contribute.invalid };
  }
  if (email && (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) return { error: t.contribute.invalid };

  // The visitor's own session: a signed-in sender is recorded, an anonymous one is not.
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_suggestion", { p_topic: topic, p_message: message, p_name: name, p_email: email });
  if (!error) return { sent: true };
  if (error.code === "54000") return { error: t.contribute.busy };
  if (error.code === "23514") return { error: t.contribute.invalid };
  return { error: t.contribute.error };
}
