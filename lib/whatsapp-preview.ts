import { canonicalProductUrl } from './product-url.js';

export function whatsappPreviewPath(slug: string, metadataImage: string | null) {
  const path = `/produit/${encodeURIComponent(slug)}/partage.jpg`;
  try {
    const image = new URL(metadataImage || '', canonicalProductUrl(slug));
    if (image.origin === new URL(canonicalProductUrl(slug)).origin && image.pathname === path) {
      const revision = image.searchParams.get('v');
      if (revision && /^[a-f0-9]{16}$/.test(revision)) return `${path}?v=${revision}`;
    }
  } catch { /* Only warm this product's existing same-origin JPEG endpoint. */ }
  return path;
}

/** Warm the exact OG JPEG without Blob/File conversion or awaiting it during the click. */
export function createWhatsappPreviewWarmup(slug: string, readImage: () => string | null, request: typeof fetch = fetch) {
  let readyPath = '', readyUntil = 0;
  let current: {path: string; work: Promise<boolean>; controller: AbortController} | null = null;
  return {
    prepare() {
      const path = whatsappPreviewPath(slug, readImage());
      if (readyPath === path && readyUntil > Date.now()) return Promise.resolve(true);
      if (current?.path === path) return current.work;
      current?.controller.abort();
      const controller = new AbortController();
      const entry = {path, controller, work: Promise.resolve(false)};
      current = entry;
      const timeout = setTimeout(() => controller.abort(), 15000);
      entry.work = Promise.resolve().then(async () => {
        try {
          const response = await request(path, {credentials: 'omit', cache: 'force-cache', redirect: 'error', priority: 'low', signal: controller.signal});
          if (!response.ok || response.headers.get('content-type') !== 'image/jpeg') { await response.body?.cancel(); return false; }
          const bytes = await response.arrayBuffer();
          if (!bytes.byteLength || controller.signal.aborted) return false;
          readyPath = path; readyUntil = Date.now() + 300000;
          return true;
        } catch { return false; }
        finally { clearTimeout(timeout); if (current === entry) current = null; }
      });
      return entry.work;
    },
    cancel() { current?.controller.abort(); },
  };
}
