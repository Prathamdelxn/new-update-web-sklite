// =============================================================================
// Construction — which currency to show for a project's amounts.
// Every project gets a currency when it is created (CreateProjectModal defaults
// to AED), so amounts and labels follow the project instead of a hard-coded '$'.
// =============================================================================

/** Same default the Create Project form uses. */
export const DEFAULT_PROJECT_CURRENCY = 'AED';

export function projectCurrency(project?: { currency?: string | null } | null): string {
  const c = typeof project?.currency === 'string' ? project.currency.trim() : '';
  return c || DEFAULT_PROJECT_CURRENCY;
}

/** Organisation-wide totals: the currency most projects use. */
export function dominantCurrency(projects: Array<{ currency?: string | null }> = []): string {
  const counts = new Map<string, number>();
  for (const p of projects) {
    const c = projectCurrency(p);
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  let best = DEFAULT_PROJECT_CURRENCY;
  let max = 0;
  for (const [c, n] of counts) if (n > max) { best = c; max = n; }
  return best;
}
