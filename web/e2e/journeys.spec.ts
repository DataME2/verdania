import { expect, test, type Page } from "@playwright/test";

// The main journeys, anonymously (PRD §5). Signing in needs a real Google account, so J3's database side
// is covered by supabase/checks instead.

/** Fails the test on any Content-Security-Policy violation or uncaught error. */
function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
  page.on("pageerror", (e) => problems.push(e.message));
  return () => expect(problems, problems.join("\n")).toEqual([]);
}

test("J1: the homepage mini-experiment recalculates from the engine", async ({ page }) => {
  const clean = watchConsole(page);
  const res = await page.goto("/");
  expect(res?.headers()["content-security-policy"]).toContain("'strict-dynamic'");
  const lab = page.locator("#lab");
  await expect(lab.getByText(/Model v\d+\.\d+\.\d+ · year 10/)).toBeVisible();

  await lab.getByLabel("Top income-tax rate").focus();
  await page.keyboard.press("End");
  await expect(lab.getByRole("link", { name: /Open the full lab/ })).toHaveAttribute("href", /tau_top=0\.7/);
  await lab.getByText("Why did this change?").click();
  await expect(lab.locator("details li").first()).toBeVisible();
  clean();
});

test("J2: switching to a preset runs the lab with accounting checks", async ({ page }) => {
  const clean = watchConsole(page);
  await page.goto("/experiment");
  const preset = page.getByRole("button", { name: /^C · / });
  await preset.click();
  await expect(preset).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/preset=C/);
  await expect(page.getByText("Accounting identities hold")).toBeVisible();
  await expect(page.getByText("Show data table").first()).toBeVisible();
  // Output and distribution side by side (PRD §8, criterion 5).
  await expect(page.getByRole("heading", { name: "Over time" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Who gains?" })).toBeVisible();
  clean();
});

test("keyboard: the first Tab reaches the skip link, which moves to the content", async ({ page }) => {
  await page.goto("/methodology");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#content$/);
});

test("J4: market cards keep private returns apart from social effects", async ({ page }) => {
  const clean = watchConsole(page);
  await page.goto("/market");
  const cards = page.locator("article");
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  await expect(page.getByRole("region", { name: "Private financial return (to investors)" })).toHaveCount(n);
  await expect(page.getByRole("region", { name: "Social and environmental effects" })).toHaveCount(n);
  await expect(page.locator("#content").getByRole("link", { name: /Continue with Google/ })).toHaveAttribute("href", "/sign-in?next=/market");
  clean();
});

test("J5: the methodology page renders the parameter registry", async ({ page }) => {
  const clean = watchConsole(page);
  await page.goto("/methodology");
  const structural = page.getByRole("table", { name: /Structural parameters/ });
  await expect(structural.getByRole("row", { name: /Unemployment response to minimum-wage bite/ })).toContainText("range crosses zero");
  await expect(page.getByRole("table", { name: /Policy levers/ }).getByRole("row")).not.toHaveCount(0);
  await expect(page.locator("#versions")).toContainText("current");
  clean();
});

test("Discover: a region chosen by keyboard fills the panel; the map recolours by layer", async ({ page }) => {
  const clean = watchConsole(page);
  await page.goto("/discover");
  const campovera = page.getByRole("button", { name: /^Campovera:/ });
  await campovera.focus();
  await page.keyboard.press("Enter");
  await expect(campovera).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 2, name: "Campovera" })).toBeVisible();
  const before = await campovera.getAttribute("fill");
  await page.getByRole("button", { name: "Farm jobs" }).click();
  await expect(campovera).not.toHaveAttribute("fill", before!);
  await expect(page.getByRole("table", { name: /six regions/ }).getByRole("row")).toHaveCount(7);
  clean();
});

test("Justice: today's measures, redistribution and the four systems come from the engine", async ({ page }) => {
  const clean = watchConsole(page);
  await page.goto("/justice");
  await expect(page.getByText("Inequality of disposable income (Gini)").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Before and after taxes and transfers" })).toBeVisible();
  const systems = page.getByRole("table", { name: /Four economic systems/ });
  await expect(systems.getByRole("link", { name: /Open in the Lab/ })).toHaveCount(4);
  await expect(systems.getByRole("row", { name: /Anchored poverty/ })).not.toContainText("—");
  clean();
});

test("private pages send anonymous visitors to sign-in and back", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Faccount$/);
});

test("reduced motion stops the animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const sway = page.locator(".animate-sway").first();
  await expect.poll(async () => parseFloat(await sway.evaluate((el) => getComputedStyle(el).animationDuration))).toBeLessThan(0.001);
});
