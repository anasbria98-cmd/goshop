import 'server-only';
import { createHash } from 'node:crypto';
import { createProductPhotoLoader, makeProductSocialJpeg } from './product-social-image';
import { DEFAULT_PRODUCT_SHARE_IMAGE, PRODUCT_SHARE_HEIGHT, PRODUCT_SHARE_WIDTH, STOREFRONT_ORIGIN } from './product-sharing';

// Bounded, public-image-only cache. Failed responses are never cached.
const images = new Map<string, {expires: number; image: Promise<Buffer>}>();
export async function getProductSocialJpeg(productId: string, sources: string[]) {
  const key = createHash('sha256').update(JSON.stringify([productId, sources])).digest('hex');
  const cached = images.get(key);
  if (cached && cached.expires > Date.now()) return cached.image;
  const storageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : null;
  const image = makeProductSocialJpeg(sources, DEFAULT_PRODUCT_SHARE_IMAGE, createProductPhotoLoader(storageOrigin, STOREFRONT_ORIGIN), PRODUCT_SHARE_WIDTH, PRODUCT_SHARE_HEIGHT);
  const entry = {expires: Date.now() + 60 * 60 * 1000, image};
  images.set(key, entry);
  while (images.size > 32) images.delete(images.keys().next().value!);
  try { return await image; }
  catch (error) { if (images.get(key) === entry) images.delete(key); throw error; }
}
