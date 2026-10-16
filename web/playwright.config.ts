import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

// End-to-end checks against a running site: `npm start` locally (default), or BASE_URL=https://… for production.
export default defineConfig({
  testDir: "e2e",
  outputDir: join(tmpdir(), "verdania-e2e"), // outside the repo: OneDrive locks folders it syncs
  timeout: 45_000,
  expect: { timeout: 15_000 }, // the engine's first run after a cold start takes a few seconds
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { ...devices["Desktop Chrome"], baseURL: process.env.BASE_URL ?? "http://localhost:3000" },
});
