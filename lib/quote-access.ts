/** Fail closed while a verified Auth lookup is pending; ignore stale/logout results. */
export function createQuoteAccess(readAuthenticated: () => Promise<boolean>, update: (allowed: boolean) => void) {
  let active = true, generation = 0;
  return {
    hide() { generation++; if (active) update(false); },
    async check() {
      const current = ++generation;
      if (active) update(false);
      let allowed = false;
      try { allowed = await readAuthenticated(); } catch { /* Auth unavailable means hidden. */ }
      if (active && current === generation) update(allowed);
    },
    dispose() { active = false; generation++; },
  };
}
