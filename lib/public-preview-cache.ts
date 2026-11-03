/** Bounded cache of public image responses; failures are never retained. */
export function createPublicPreviewCache<T>(limit = 32, ttl = 300000, now = Date.now) {
  const entries = new Map<string, {expires: number; value: Promise<T>; pending: boolean}>();
  return {
    async get(key: string, load: () => Promise<T>) {
      const cached = entries.get(key);
      if (cached && (cached.pending || cached.expires > now())) {
        const status = cached.pending ? 'coalesced' : 'hit';
        entries.delete(key); entries.set(key, cached);
        return {value: await cached.value, status};
      }
      entries.delete(key);
      const entry = {expires: now() + ttl, value: Promise.resolve().then(load), pending: true};
      entries.set(key, entry);
      while (entries.size > limit) entries.delete(entries.keys().next().value!);
      try {
        const value = await entry.value;
        entry.pending = false;
        entry.expires = now() + ttl;
        return {value, status: 'miss'};
      } catch (error) {
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      }
    },
  };
}

export function publicPreviewCacheKey(slug: string, revision: string | null) {
  return `${encodeURIComponent(slug)}:${revision && /^[a-f0-9]{16}$/.test(revision) ? revision : ''}`;
}
