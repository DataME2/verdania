// Run: node --experimental-strip-types --test lib/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSimRequest } from "./sim-request.ts";

test("accepts a well-formed request and normalises it", () => {
  assert.deepEqual(parseSimRequest({ levers: { tau_top: 0.5, bite: 0.5 }, horizon: 10 }), {
    levers: { bite: 0.5, tau_top: 0.5 },
    horizon: 10,
  });
  assert.deepEqual(parseSimRequest({ preset: "C", levers: { closure: "adjust_other" }, horizon: 20 }), {
    preset: "C",
    levers: { closure: "adjust_other" },
    horizon: 20,
  });
  assert.deepEqual(parseSimRequest({ preset: "baseline", horizon: 5 }), { levers: {}, horizon: 5 });
});

test("rejects anything else", () => {
  for (const bad of [
    null,
    [],
    "x",
    { horizon: 7 },
    { preset: "Z" },
    { levers: [] },
    { levers: { tau_top: "0.5" } },
    { levers: { tau_top: Infinity } },
    { levers: { closure: "print_money" } },
    { levers: { "__proto__x": 1 } },
    { levers: { "DROP TABLE": 1 } },
    { levers: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`l${"a".repeat(i % 5)}`, i])) , mode: "full" },
    { mode: "full" }, // full mode is for saved scenarios, never from a browser
    { structural: { psi: 1 } },
  ]) {
    assert.ok("error" in parseSimRequest(bad), `accepted ${JSON.stringify(bad)}`);
  }
});
