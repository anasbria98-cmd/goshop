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

/** Prepare the existing JPEG before the gesture; desktop retains URL-preview warming. */
export function createWhatsappPreviewWarmup(slug: string, readImage: () => string | null, request: typeof fetch = fetch, prepareFile: () => boolean = () => false) {
  let readyPath = '', readyUntil = 0;
  let file: File | null = null;
  let current: {path: string; work: Promise<boolean>; controller: AbortController} | null = null;
  return {
    peekFile() { return readyPath === whatsappPreviewPath(slug, readImage()) && readyUntil > Date.now() ? file : null; },
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
          if (prepareFile()) {
            const signature = new Uint8Array(bytes);
            if (signature[0] !== 255 || signature[1] !== 216 || signature[2] !== 255) return false;
            file = new File([bytes], `${slug}.jpg`, {type: 'image/jpeg'});
          }
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

/** Must run synchronously inside the click, with the already prepared File. */
export function startWhatsappShare(name: string, slug: string, file: File | null,
  device: {userAgent: string; maxTouchPoints: number; share?: (data: ShareData) => Promise<void>; canShare?: (data: ShareData) => boolean},
  openLink: () => void,
): {kind: 'prepare'} | {kind: 'link'} | {kind: 'native'; completion: Promise<void>} {
  const mobile = /Android|iPhone|iPad|iPod/i.test(device.userAgent)
    || (/Macintosh|Mac OS X/.test(device.userAgent) && device.maxTouchPoints > 1);
  if (!mobile || typeof device.share !== 'function' || typeof device.canShare !== 'function') {
    openLink(); return {kind: 'link'};
  }
  if (!file) return {kind: 'prepare'};
  let supported = false;
  try { supported = device.canShare({files: [file]}); } catch { /* Unsupported file sharing. */ }
  if (!supported) { openLink(); return {kind: 'link'}; }
  // WebKit can discard the image when text is included (WebKit #251500).
  // Prioritize actual media on iOS; the UI offers a separate caption-copy action.
  const ios = /iPhone|iPad|iPod/i.test(device.userAgent)
    || (/Macintosh|Mac OS X/.test(device.userAgent) && device.maxTouchPoints > 1);
  const payload: ShareData = ios ? {files: [file]}
    : {files: [file], title: name, text: `${name}\n${canonicalProductUrl(slug)}`};
  return {kind: 'native', completion: device.share(payload)};
}
