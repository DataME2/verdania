import { test } from "node:test";
import assert from "node:assert/strict";
import { projectPortfolio } from "./portfolio-math.ts";

const terms = {
  farm: { low: 0.03, central: 0.06, high: 0.09, years: 8, jobsPerMillion: 22 },
  tech: { low: -0.05, central: 0.07, high: 0.2, years: 6, jobsPerMillion: 9 },
};
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test("compounds each allocation over its own horizon", () => {
  const p = projectPortfolio([{ projectId: "farm", units: 10_000 }], terms);
  assert.equal(p.invested, 10_000);
  close(p.value.central, 10_000 * 1.06 ** 8);
  close(p.value.low, 10_000 * 1.03 ** 8);
  close(p.jobs, 0.22);
});

test("sums projects and allows losses", () => {
  const p = projectPortfolio([{ projectId: "farm", units: 10_000 }, { projectId: "tech", units: 5_000 }], terms);
  assert.equal(p.invested, 15_000);
  close(p.value.low, 10_000 * 1.03 ** 8 + 5_000 * 0.95 ** 6);
  assert.ok(5_000 * 0.95 ** 6 < 5_000); // the low case of a risky project loses virtual value
});

test("ignores unknown projects and empty allocations", () => {
  const p = projectPortfolio([{ projectId: "gone", units: 1 }, { projectId: "farm", units: 0 }], terms);
  assert.deepEqual(p, { invested: 0, value: { low: 0, central: 0, high: 0 }, jobs: 0 });
});
