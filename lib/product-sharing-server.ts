import 'server-only';
import type { ImageAvailability } from './product-sharing';
import { STOREFRONT_ORIGIN } from './product-sharing';

/** Probe only this store's public assets; never follow catalogue URLs into arbitrary servers. */
export function productShareImageChecker() {
  const storageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : null;
  const signal = AbortSignal.timeout(2500);
  return async (value: string): Promise<ImageAvailability> => {
    const url = new URL(value);
    const ownStorage = url.origin === storageOrigin && url.pathname.startsWith('/storage/v1/object/public/');
    if (!ownStorage && url.origin !== STOREFRONT_ORIGIN) return 'unknown';
    try {
      const response = await fetch(url, {method: 'HEAD', redirect: 'manual', signal, next: {revalidate: 300}});
      if ([400, 403, 404, 410].includes(response.status)) return 'missing';
      const type = response.headers.get('content-type') || '';
      if (response.ok && type.startsWith('image/')) return response.headers.get('content-length') === '0' ? 'missing' : 'available';
      if (response.ok && /^(text\/html|application\/json)/.test(type)) return 'missing';
    } catch { /* Preserve a genuine product URL on timeouts/rate limits/transient failures. */ }
    return 'unknown';
  };
}
