// Illustrative projection of a virtual portfolio from each project's own stated assumptions.
// This is plain compounding arithmetic, not a model result and not a promise of anything.

export type Terms = { low: number; central: number; high: number; years: number; jobsPerMillion: number };

export type Projection = {
  invested: number;
  value: { low: number; central: number; high: number }; // at each project's own horizon
  jobs: number; // direct jobs during the build phase
};

export function projectPortfolio(allocations: { projectId: string; units: number }[], terms: Record<string, Terms>): Projection {
  const out: Projection = { invested: 0, value: { low: 0, central: 0, high: 0 }, jobs: 0 };
  for (const { projectId, units } of allocations) {
    const t = terms[projectId];
    if (!t || !(units > 0)) continue;
    out.invested += units;
    out.value.low += units * (1 + t.low) ** t.years;
    out.value.central += units * (1 + t.central) ** t.years;
    out.value.high += units * (1 + t.high) ** t.years;
    out.jobs += (units / 1_000_000) * t.jobsPerMillion;
  }
  return out;
}
