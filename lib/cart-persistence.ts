import type { CatalogProduct } from './catalog-model';
export type CartLine = { product: CatalogProduct; quantity: number };
export type CartSnapshot = Record<string, CartLine>;
export type CartPersistence = { cartCleared: boolean; cartDirty: boolean };
export const CART_STORAGE_KEY = 'goshop-store';

export function mayRestoreRemoteCart(metadata: CartPersistence, startedRevision: number, currentRevision: number) {
  return !metadata.cartCleared && !metadata.cartDirty && startedRevision === currentRevision;
}

/** The clear marker remains until an intentional add. Empty is an authoritative
 * user choice, even if the server is offline or an old request finishes later. */
export function persistCartSnapshot(storage: Pick<Storage, 'getItem'|'setItem'>, cart: CartSnapshot, metadata: CartPersistence, favorites?: string[]) {
  let previous: {version?:number;favorites?:string[]} = {};
  try { previous = JSON.parse(storage.getItem(CART_STORAGE_KEY) || '{}') ?? {}; } catch {}
  storage.setItem(CART_STORAGE_KEY, JSON.stringify({version:2,cart,favorites:favorites ?? (previous.version === 2 && Array.isArray(previous.favorites) ? previous.favorites : []),...metadata}));
}

/** Serialize writes: an older in-flight non-empty PUT must finish before the
 * clear PUT. Skip queued snapshots that were superseded before being sent. */
export function createCartWriteQueue(send: (cart: CartSnapshot) => Promise<boolean>) {
  let tail = Promise.resolve();
  return (cart: CartSnapshot, isCurrent: () => boolean, acknowledge: () => void) => {
    tail = tail.catch(() => {}).then(async () => {
      if (!isCurrent()) return;
      try { if (await send(cart) && isCurrent()) acknowledge(); } catch { /* Keep the durable dirty marker for retry. */ }
    });
    return tail;
  };
}
