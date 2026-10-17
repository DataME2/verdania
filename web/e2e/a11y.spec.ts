import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// WCAG 2.2 AA (axe) on every public page, and no sideways scrolling at 360 px (PRD §6).
const PAGES = ["/", "/experiment", "/experiment?bite=0.6&eta_mw=0.2", "/market", "/methodology", "/community", "/sign-in", "/discover", "/justice", "/people", "/systems", "/privacy?deleted=1"];
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const path of PAGES) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle"); // let lab results replace their skeletons
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    const summary = violations.flatMap((v) =>
      v.nodes.map((n) => `${v.id} (${v.impact}) ${n.target.join(" ")}: ${n.failureSummary?.split("\n").pop()?.trim()} | ${n.html.slice(0, 100)}`),
    );
    expect(summary, summary.join("\n")).toEqual([]);
  });

  test(`360 px: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("360 px: the navigation drawer opens and closes", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("link", { name: "Research and Methodology" }).last()).toBeVisible();
  await page.getByRole("button", { name: "Close navigation" }).first().click();
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
});
