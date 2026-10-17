import AxeBuilder from "@axe-core/playwright";
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

test("Challenges: Challenge 2 brings its own question and suggestions; results show where they land", async ({ page }) => {
  const clean = watchConsole(page);
  await page.goto("/experiment");
  await page.getByRole("button", { name: "Challenge 2" }).click();
  await expect(page.getByRole("heading", { name: "Who pays for better public services?" })).toBeVisible();
  await expect(page).toHaveURL(/challenge=who-pays/);
  await page.getByRole("button", { name: "Services + VAT" }).click();
  await expect(page).toHaveURL(/tau_v=0\.18/);
  await expect(page.getByText("Accounting identities hold")).toBeVisible();
  const regions = page.getByRole("table", { name: /Regional results/ });
  await expect(regions.getByRole("row")).toHaveCount(7);
  await expect(regions.getByRole("row", { name: /Campovera/ })).not.toContainText("—");
  clean();
});

test("Sensitivity: opening the panel ranks the assumptions that move a minimum-wage rise", async ({ page }) => {
  const clean = watchConsole(page);
  await page.goto("/experiment?bite=0.6");
  await expect(page.getByText("Accounting identities hold")).toBeVisible();
  await page.getByText("Which assumptions drive this result?").click();
  const panel = page.locator("details", { hasText: "Which assumptions drive this result?" });
  await expect(panel.getByRole("listitem").first()).toContainText("Low end");
  await expect(panel.getByRole("listitem")).toHaveCount(8);
  await expect(panel).toContainText("Unemployment response to minimum-wage bite");
  await panel.getByRole("button", { name: "Public debt (gross)" }).click();
  await expect(panel).toContainText("Change in your policy's effect on Public debt (gross)");
  clean(); // before axe, whose own stylesheet fetch the CSP blocks
  const { violations } = await new AxeBuilder({ page }).include("details").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
});

test("Challenge this result: an assumption override shows as a chip, travels in the URL and can be undone", async ({ page }) => {
  const clean = watchConsole(page);
  await page.goto("/experiment");
  await page.getByText("Challenge this result").click();
  await page.getByLabel("Unemployment response to minimum-wage bite", { exact: true }).focus();
  await page.keyboard.press("End");
  const chips = page.getByRole("region", { name: "Assumptions you changed" });
  await expect(chips).toContainText("Unemployment response to minimum-wage bite: 0.2 (central 0.05)");
  await expect(page).toHaveURL(/eta_mw=0\.2/);
  await expect(page.getByText("Accounting identities hold")).toBeVisible(); // the engine accepted the override
  await chips.getByRole("button", { name: /to its central value/ }).click();
  await expect(chips).toHaveCount(0);

  await page.goto("/experiment?psi=0.8"); // a shared link reopens the challenge with its override
  await expect(page.getByRole("region", { name: "Assumptions you changed" })).toContainText("deficits: 0.8");
  await expect(page.getByLabel("Crowding-out of private investment by deficits", { exact: true })).toBeVisible();
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

test("Contribute: the footer link reaches the form and its server action answers (honeypot path, nothing stored)", async ({ page }) => {
  const clean = watchConsole(page);
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Share an idea" }).click();
  await expect(page).toHaveURL(/\/community#contribute$/);
  const form = page.locator("#contribute");
  await form.getByLabel("Your message").fill("An end-to-end test message.");
  await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => (el.value = "bot"));
  await form.getByRole("button", { name: "Send" }).click();
  await expect(form.getByText("Thank you. Your message has been received.")).toBeVisible();
  clean();
});

test("Privacy: the footer link reaches the notice, which points to the account page for deletion", async ({ page }) => {
  const clean = watchConsole(page);
  await page.goto("/methodology");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0); // the "account deleted" note only follows a deletion
  const choices = page.getByRole("region", { name: "Your choices" });
  await expect(choices).toContainText("Delete your account from your account page");
  await expect(choices.getByRole("link", { name: "Your account" })).toHaveAttribute("href", "/account");
  await page.goto("/sign-in");
  await expect(page.getByRole("link", { name: "Read the privacy notice" })).toHaveAttribute("href", "/privacy");
  clean();
});

test("People and Society: the synthetic population adds up to two million, by age, sex and region", async ({ page }) => {
  const clean = watchConsole(page);
  await page.goto("/people");
  const ages = page.getByRole("table", { name: "People by age group and sex" });
  const cells = await ages.locator("tbody td:nth-child(2), tbody td:nth-child(3)").allInnerTexts();
  expect(cells.reduce((s, x) => s + Number(x.replace(/,/g, "")), 0)).toBe(2_000_000);
  await expect(page.getByRole("table", { name: "The synthetic population of each region" }).getByRole("row")).toHaveCount(7);
  clean();
});

test("Economic Systems: every policy compared with today, and the ten-year results from the engine", async ({ page }) => {
  const clean = watchConsole(page);
  await page.goto("/systems");
  const rules = page.getByRole("table", { name: /Policy settings/ });
  await expect(rules.getByRole("row", { name: /Top income-tax rate/ })).toContainText("higher than today");
  const outcomes = page.getByRole("table", { name: /The economy after ten years/ });
  await expect(outcomes.getByRole("link", { name: /Open in the Lab/ })).toHaveCount(4);
  await expect(outcomes.getByRole("row", { name: /Public debt \(gross\)/ })).not.toContainText("—");
  clean();
});

test("private pages send anonymous visitors to sign-in and back", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Faccount$/);
  await page.goto("/admin"); // staff-only beyond that: checked by the database (supabase/checks)
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fadmin$/);
});

test("reduced motion stops the animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const sway = page.locator(".animate-sway").first();
  await expect.poll(async () => parseFloat(await sway.evaluate((el) => getComputedStyle(el).animationDuration))).toBeLessThan(0.001);
});
