// Run: node --experimental-strip-types --test lib/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickLocale } from "./locale.ts";

test("a saved choice wins over the browser", () => {
  assert.equal(pickLocale("es", "en-US,en;q=0.9"), "es");
  assert.equal(pickLocale("en", "es-CO,es;q=0.9"), "en");
});

test("otherwise the browser's higher-ranked language of the two", () => {
  assert.equal(pickLocale(undefined, "es-CO,es;q=0.9,en;q=0.8"), "es");
  assert.equal(pickLocale(undefined, "en-AU,en;q=0.9,es;q=0.8"), "en");
  assert.equal(pickLocale(undefined, "fr-FR,fr;q=0.9,es;q=0.7,en;q=0.5"), "es");
  assert.equal(pickLocale(undefined, "en;q=0.4,es-MX;q=0.8"), "es");
});

test("English when nothing matches, or the cookie is junk", () => {
  assert.equal(pickLocale(undefined, null), "en");
  assert.equal(pickLocale("fr", "de-DE"), "en");
  assert.equal(pickLocale(undefined, "es;q=abc,en"), "en");
});
