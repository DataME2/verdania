// Run: node --experimental-strip-types --test lib/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtDelta, tone } from "./format.ts";

test("a change too small to display says so and stays neutral", () => {
  assert.equal(fmtDelta(0.0004, "share"), "+<0.1 pts");
  assert.equal(fmtDelta(-0.0004, "share"), "−<0.1 pts");
  assert.equal(fmtDelta(0.3, "V$"), "+<V$ 1");
  assert.equal(fmtDelta(0, "share"), "no change");
  assert.equal(tone(0.0004, "down", "share"), "neutral");
});

test("a visible change is formatted and coloured by the desirable direction", () => {
  assert.equal(fmtDelta(0.012, "share"), "+1.2 pts");
  assert.equal(fmtDelta(-288.4, "V$"), "−V$ 288");
  assert.equal(tone(0.012, "down", "share"), "bad");
  assert.equal(tone(-288.4, "up", "V$"), "bad");
  assert.equal(tone(0.012, null, "share"), "neutral");
});
