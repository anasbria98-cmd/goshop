/** Normalize display/filter comparisons without changing stored names or slugs. */
export function catalogBrandName(name: string): string {
  return name.trim();
}
