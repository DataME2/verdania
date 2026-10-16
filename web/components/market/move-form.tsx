"use client";

import { useActionState } from "react";
import { moveUnits, type MoveState } from "@/app/market/actions";
import { t } from "@/lib/messages";

type Option = { value: string; label: string };

/**
 * One form for allocate (from = ""), withdraw (to = "") and reallocate (both). `requestId` is minted by
 * the server for each render, so a double click or retry of the same submission is applied only once.
 */
export function MoveForm({
  requestId,
  from = "",
  to = "",
  fromOptions,
  toOptions,
  max,
  label,
  idPrefix,
}: {
  requestId: string;
  from?: string;
  to?: string;
  fromOptions?: Option[];
  toOptions?: Option[];
  max: number;
  label: string;
  idPrefix: string;
}) {
  const [state, action, pending] = useActionState<MoveState, FormData>(moveUnits, {});
  const select = (name: "from" | "to", options: Option[], text: string) => (
    <label className="block text-xs font-semibold text-ink/70">
      {text}
      <select name={name} required className="mt-1 w-full rounded-xl border border-forest/20 bg-white px-2 py-2 text-sm text-ink">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="requestId" value={requestId} />
      {fromOptions ? select("from", fromOptions, t.market.from) : <input type="hidden" name="from" value={from} />}
      {toOptions ? select("to", toOptions, t.market.to) : <input type="hidden" name="to" value={to} />}
      <div className="flex items-end gap-2">
        <label htmlFor={`${idPrefix}-units`} className="sr-only">{t.market.units}</label>
        <input
          id={`${idPrefix}-units`}
          name="units"
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          step={1}
          required
          placeholder={t.market.units}
          className="w-full min-w-0 rounded-xl border border-forest/20 bg-white px-3 py-2 text-sm tabular-nums"
        />
        <button
          type="submit"
          disabled={pending || max < 1}
          className="shrink-0 rounded-full bg-forest px-4 py-2 text-sm font-bold text-white hover:bg-leaf disabled:opacity-40"
        >
          {pending ? "…" : label}
        </button>
      </div>
      <p aria-live="polite" className={`min-h-4 text-xs font-semibold ${state.error ? "text-loss" : "text-leaf"}`}>
        {state.error ?? state.ok}
      </p>
    </form>
  );
}
