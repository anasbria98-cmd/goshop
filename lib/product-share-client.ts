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

/** Instagram may be offered only by the OS; never promise a specific destination. */
export function instagramNativeShareData(name: string, slug: string, photo: File, device: {userAgent: string; maxTouchPoints: number}): ShareData {
  const ios = /iPhone|iPad|iPod/i.test(device.userAgent)
    || (/Macintosh|Mac OS X/i.test(device.userAgent) && device.maxTouchPoints > 1);
  // WebKit #251500: combining image and text can drop the image. Copy caption separately.
  return ios ? {files: [photo]} : {files: [photo], title: name, text: `${name}\n${canonicalProductUrl(slug)}`};
}

export const INSTAGRAM_DIRECT_INBOX = 'https://www.instagram.com/direct/inbox/';

/** Open the supported inbox UI during the click; no invented prefilled-DM parameters. */
export async function openInstagramDirect(slug: string, clipboard: Pick<Clipboard, 'writeText'> | undefined, open: (url: string) => void) {
  const text = canonicalProductUrl(slug);
  const copied = (async () => {
    try { if (!clipboard) return false; await clipboard.writeText(text); return true; }
    catch { return false; }
  })();
  // Do not await clipboard permission before opening: preserve popup user activation.
  open(INSTAGRAM_DIRECT_INBOX);
  return {copied: await copied, text};
}

export function shareInstagramPhoto(name: string, slug: string, photo: File,
  device: {userAgent: string; maxTouchPoints: number; canShare?: (data: ShareData) => boolean; share?: (data: ShareData) => Promise<void>}) {
  if (!device.share || !device.canShare || !device.canShare({files: [photo]})) return null;
  // Called directly in the original tap when the background-prepared File is ready.
  return device.share(instagramNativeShareData(name, slug, photo, device));
}
