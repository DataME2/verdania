"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MoveState = { ok?: string; error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Messages raised by the database functions (supabase/migrations/20261016000000_core_schema.sql).
const FRIENDLY: [RegExp, string][] = [
  [/not enough unallocated/, "You don't have that many unallocated virtual units."],
  [/not enough virtual units in the source/, "That project doesn't hold that many of your units."],
  [/join the virtual market first/, "Join the virtual market first."],
  [/sign-in required/, "Sign in to use the virtual market."],
  [/unknown project/, "That project isn't available."],
];

async function signedInClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ? supabase : null;
}

export async function joinMarket(): Promise<void> {
  const supabase = await signedInClient();
  if (!supabase) return;
  await supabase.rpc("join_virtual_market"); // grants once per account; repeat calls change nothing
  revalidatePath("/market");
  revalidatePath("/account");
}

/**
 * Allocate (from empty), withdraw (to empty) or reallocate between projects. The database function
 * checks balances under a row lock; `requestId` makes a repeated submission (double click, retry) a no-op.
 */
export async function moveUnits(_prev: MoveState, form: FormData): Promise<MoveState> {
  const supabase = await signedInClient();
  if (!supabase) return { error: "Sign in to use the virtual market." };

  const from = String(form.get("from") ?? "") || null;
  const to = String(form.get("to") ?? "") || null;
  const requestId = String(form.get("requestId") ?? "");
  const units = Number(form.get("units"));
  if (!Number.isInteger(units) || units < 1 || units > 1_000_000) return { error: "Enter a whole number of units." };
  if ((from && !UUID.test(from)) || (to && !UUID.test(to)) || !UUID.test(requestId) || (!from && !to) || from === to) {
    return { error: "Choose a project." };
  }

  const { error } = await supabase.rpc("move_virtual_units", { p_from: from, p_to: to, p_units: units, p_request_id: requestId });
  if (error) {
    return { error: FRIENDLY.find(([re]) => re.test(error.message))?.[1] ?? "That didn't work. Nothing was changed." };
  }
  revalidatePath("/market");
  revalidatePath("/account");
  return { ok: `${units.toLocaleString("en")} virtual units moved.` };
}
