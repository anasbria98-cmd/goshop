import { canonicalProductUrl } from './product-url.js';

export async function copyProductShare(name: string, slug: string, clipboard?: Pick<Clipboard, 'writeText'>) {
  const text = `${name}\n${canonicalProductUrl(slug)}`;
  try {
    if (!clipboard) return {copied: false, text};
    await clipboard.writeText(text);
    return {copied: true, text};
  } catch { return {copied: false, text}; }
}

export function mobilePhotoSharingAvailable(device: {userAgent: string; maxTouchPoints: number; share?: unknown; canShare?: unknown}) {
  const mobile = /Android|iPhone|iPad|iPod/i.test(device.userAgent)
    || (/Macintosh|Mac OS X/i.test(device.userAgent) && device.maxTouchPoints > 1);
  return mobile && typeof device.share === 'function' && typeof device.canShare === 'function';
}

export function nativeProductShareData(name: string, slug: string, photo: File): ShareData {
  const url = canonicalProductUrl(slug);
  return {title: name, text: `${name}\n${url}`, url, files: [photo]};
}

/** Prepare on interaction intent, not page load; keep files scoped to one product. */
export function createProductSharePhoto(slug: string, request: typeof fetch = fetch) {
  let file: File | null = null;
  let pending: Promise<File | null> | null = null;
  let settled = false;
  return {
    peek: () => file,
    settled: () => settled,
    prepare() {
      if (file) return Promise.resolve(file);
      if (pending) return pending;
      pending = (async () => {
        try {
          const response = await request(`/produit/${encodeURIComponent(slug)}/partage.jpg`, {
            credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15000),
          });
          if (!response.ok || response.headers.get('content-type') !== 'image/jpeg') return null;
          const blob = await response.blob();
          if (!blob.size || blob.size > 8 * 1024 * 1024) return null;
          const signature = new Uint8Array(await blob.slice(0, 3).arrayBuffer());
          if (signature[0] !== 0xff || signature[1] !== 0xd8 || signature[2] !== 0xff) return null;
          file = new File([blob], `${slug}.jpg`, {type: 'image/jpeg'});
          return file;
        } catch { return null; }
        finally { pending = null; settled = true; }
      })();
      return pending;
    },
  };
}
