// Run: node --experimental-strip-types --test lib/safe-next.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "./safe-next.ts";

test("keeps same-site paths", () => {
  assert.equal(safeNext("/account"), "/account");
  assert.equal(safeNext("/experiment?preset=C#results"), "/experiment?preset=C#results");
});

test("rejects anything that could leave the site", () => {
  for (const bad of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\\/evil.example",
    "javascript:alert(1)",
    "account",
    "/%0d%0aLocation:%20https://evil.example".replace(/%0d%0a/, "\r\n"),
    "\t//evil.example",
    "",
    null,
    undefined,
    "/" + "a".repeat(600),
  ]) {
    assert.equal(safeNext(bad as string), "/", `accepted ${JSON.stringify(bad)}`);
  }
});

test("uses the given fallback", () => {
  assert.equal(safeNext("https://evil.example", "/account"), "/account");
});
