import test from 'node:test';
import assert from 'node:assert/strict';
import { productImageSources, retryProductImageUrl } from '../lib/product-image-loading.ts';

test('failed storage request gets a fresh URL without changing the object path', () => {
  const source='https://example.supabase.co/storage/v1/object/public/product-images/variants/white.png';
  const retry=new URL(retryProductImageUrl(source));
  assert.equal(retry.pathname,new URL(source).pathname);
  assert.equal(retry.searchParams.get('goelec_image_retry'),'1');
  assert.equal(retryProductImageUrl('/photo.png?version=2#detail'),'/photo.png?version=2&goelec_image_retry=1#detail');
});
test('main/selected image remains first, real gallery alternatives are deduplicated', () => {
  assert.deepEqual(productImageSources('/variant.png',['/main.png','/variant.png','/gallery.png']),['/variant.png','/main.png','/gallery.png']);
  assert.deepEqual(productImageSources(null,['',' ','/gallery.png']),['/gallery.png']);
  assert.deepEqual(productImageSources(null),[]);
});
