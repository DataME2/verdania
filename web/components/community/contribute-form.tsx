"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { submitSuggestion, type SuggestionState } from "@/app/community/actions";
import { useT } from "../i18n";

const field = "mt-1 w-full rounded-xl border border-forest/20 bg-white px-3 py-2 text-sm font-normal";

export function ContributeForm() {
  const c = useT().contribute;
  const [state, action, pending] = useActionState<SuggestionState, FormData>(submitSuggestion, {});

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-semibold text-ink/80">
        {c.topic}
        <select name="topic" required defaultValue="model" className={field}>
          {Object.entries(c.topics).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold text-ink/80">
        {c.message}
        <textarea name="message" required minLength={10} maxLength={4000} rows={6} aria-describedby="message-hint" className={field} />
        <span id="message-hint" className="mt-1 block text-xs font-normal text-ink/70">{c.messageHint}</span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-ink/80">
          {c.name}
          <input name="name" maxLength={120} autoComplete="name" className={field} />
        </label>
        <label className="block text-sm font-semibold text-ink/80">
          {c.email}
          <input name="email" type="email" maxLength={254} autoComplete="email" className={field} />
        </label>
      </div>
      {/* honeypot: hidden from people and assistive technology; bots fill it */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="text-xs text-ink/70">{c.privacy}</p>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf disabled:opacity-40"
      >
        <Send className="h-4 w-4" aria-hidden="true" /> {pending ? c.sending : c.send}
      </button>
      <p aria-live="polite" className="text-sm font-semibold">
        {state.sent && <span className="text-forest">{c.thanks}</span>}
        {state.error && <span className="text-loss">{state.error}</span>}
      </p>
    </form>
  );
}
