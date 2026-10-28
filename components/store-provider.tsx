"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { StoreText } from "./storefront-language";
import type { CatalogProduct } from "@/lib/catalog-model";
import { cartLineKey } from "@/lib/product-variants";
import { CART_STORAGE_KEY, createCartWriteQueue, mayRestoreRemoteCart, persistCartSnapshot, type CartLine, type CartPersistence, type CartSnapshot } from "@/lib/cart-persistence";
type Store = {
  cart: Record<string, CartLine>;
  favorites: string[];
  add: (product: CatalogProduct, n: number) => void;
  setQuantity: (id: string, n: number) => void;
  toggleFavorite: (id: string) => void;
  clearCart: () => void;
  count: number;
  total: number;
  notice: string;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [favoriteRemoteReady, setFavoriteRemoteReady] = useState(false);
  const [notice, setNotice] = useState("");
  const cartRef = useRef<CartSnapshot>({});
  const favoritesRef = useRef<string[]>([]);
  const readyRef = useRef(false);
  const revisionRef = useRef(0);
  const persistenceRef = useRef<CartPersistence>({cartCleared:false,cartDirty:false});
  const writeQueueRef = useRef<ReturnType<typeof createCartWriteQueue> | null>(null);
  const changeCart = useCallback((next: CartSnapshot) => {
    revisionRef.current += 1;
    cartRef.current = next;
    persistenceRef.current = {cartCleared:Object.keys(next).length === 0,cartDirty:true};
    // Synchronous storage survives a refresh/close before React effects or PUT.
    try { persistCartSnapshot(localStorage,next,persistenceRef.current,readyRef.current ? favoritesRef.current : undefined); } catch {}
    setCart(next);
  }, []);
  useEffect(() => {
    const restoredCart: Record<string, CartLine> = {};
    let restoredFavorites: string[] = [];
    let restoredPersistence: CartPersistence = {cartCleared:false,cartDirty:false};
    try {
      const raw = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "{}");
      const saved = raw.version === 2 ? raw : {};
      restoredPersistence = {cartCleared:saved.cartCleared === true,cartDirty:saved.cartDirty === true};
      for (const [id, line] of Object.entries(restoredPersistence.cartCleared ? {} : saved.cart ?? {})) {
        const candidate = line as Partial<CartLine>;
        const product = candidate.product;
        const n = candidate.quantity;
        if (product && cartLineKey(product) === id && (!(product.hasColorVariants || product.hasGeneralVariants) || product.selectedVariant) && Number.isInteger(n) && Number(n) > 0)
          restoredCart[id] = {
            product,
            quantity: Math.min(Number(n), product.stock || (product.allowBackorder ? 999 : 0)),
          };
      }
      restoredFavorites = Array.isArray(saved.favorites) ? saved.favorites.filter((id: unknown) => typeof id === "string") : [];
    } catch {}
    const timer = window.setTimeout(() => {
      // A child (e.g. order confirmation) may clear before hydration completes.
      if (revisionRef.current === 0) {
        cartRef.current = restoredCart;
        persistenceRef.current = restoredPersistence;
        setCart(restoredCart);
      }
      favoritesRef.current = restoredFavorites;
      setFavorites(restoredFavorites);
      readyRef.current = true;
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const receiveClear = (event: StorageEvent) => {
      if (event.key !== CART_STORAGE_KEY || !event.newValue) return;
      try {
        const saved = JSON.parse(event.newValue);
        if (saved.version !== 2 || saved.cartCleared !== true || Object.keys(saved.cart ?? {}).length || persistenceRef.current.cartCleared) return;
        revisionRef.current += 1;
        const empty = {};
        cartRef.current = empty;
        persistenceRef.current = {cartCleared:true,cartDirty:true};
        setCart(empty);
      } catch {}
    };
    window.addEventListener("storage",receiveClear);
    return () => window.removeEventListener("storage",receiveClear);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const startedRevision = revisionRef.current;
    fetch("/api/cart", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { lines?: CartLine[]; unavailableLineKeys?: string[] }) => {
        if (controller.signal.aborted || persistenceRef.current.cartCleared || startedRevision !== revisionRef.current) return;
        if (!mayRestoreRemoteCart(persistenceRef.current,startedRevision,revisionRef.current)) {
          // Preserve the existing disabled/deleted-variant cleanup without
          // allowing a server snapshot to replace unsynced local selections.
          if (payload.unavailableLineKeys?.length) {
            const next = Object.fromEntries(Object.entries(cartRef.current).filter(([key]) => !payload.unavailableLineKeys!.includes(key)));
            if (Object.keys(next).length !== Object.keys(cartRef.current).length) changeCart(next);
          }
          return;
        }
        const next = payload.lines?.length ? Object.fromEntries(payload.lines.map((line) => [cartLineKey(line.product), line]))
          : payload.unavailableLineKeys?.length ? Object.fromEntries(Object.entries(cartRef.current).filter(([key]) => !payload.unavailableLineKeys!.includes(key))) : cartRef.current;
        cartRef.current = next;
        setCart(next);
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setRemoteReady(true); });
    return () => controller.abort();
  }, [ready, changeCart]);
  useEffect(() => {
    if (!ready) return;
    fetch("/api/favorites")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { ids?: string[] }) => setFavorites((current) => [...new Set([...current, ...(payload.ids ?? [])])]))
      .then(() => setFavoriteRemoteReady(true))
      .catch(() => {});
  }, [ready]);
  useEffect(() => {
    favoritesRef.current = favorites;
    if (ready) try { persistCartSnapshot(localStorage,cartRef.current,persistenceRef.current,favorites); } catch {}
  }, [cart, favorites, ready]);
  useEffect(() => {
    if (!remoteReady) return;
    if (!writeQueueRef.current) writeQueueRef.current = createCartWriteQueue(async (snapshot) => {
      const response = await fetch("/api/cart", { method: "PUT", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({lines:Object.values(snapshot).map(({product,quantity})=>({product_id:product.id,variant_id:product.selectedVariant?.id ?? null,quantity}))}) });
      return response.ok;
    });
    let active = true;
    const revision = revisionRef.current;
    const sync = () => {
      void writeQueueRef.current!(cart, () => active && revision === revisionRef.current && cart === cartRef.current, () => {
        persistenceRef.current = {...persistenceRef.current,cartDirty:false};
        try { persistCartSnapshot(localStorage,cartRef.current,persistenceRef.current,favoritesRef.current); } catch {}
      });
    };
    // Clears are not debounced. An explicit empty marker survives even a failed
    // PUT and wins over stale server data on the next hydration.
    const timer = setTimeout(sync,persistenceRef.current.cartCleared ? 0 : 350);
    window.addEventListener("online",sync);
    return () => { active = false; clearTimeout(timer); window.removeEventListener("online",sync); };
  }, [cart, remoteReady]);
  useEffect(() => {
    if (!favoriteRemoteReady) return;
    const timer = setTimeout(() => { void fetch("/api/favorites", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: favorites }) }); }, 350);
    return () => clearTimeout(timer);
  }, [favorites, favoriteRemoteReady]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  const setQuantity = useCallback((id: string, n: number) => {
    const line = cartRef.current[id];
    if (!line) return;
    const next = { ...cartRef.current };
    const max = line.product.allowBackorder ? 999 : line.product.stock;
    const quantity = Math.max(0, Math.min(max, Math.floor(n)));
    if (quantity) next[id] = { ...line, quantity };
    else delete next[id];
    changeCart(next);
  }, [changeCart]);
  const add = useCallback((product: CatalogProduct, n: number) => {
    if ((product.hasColorVariants || product.hasGeneralVariants) && !product.selectedVariant) return;
    if (!product.stock && !product.allowBackorder) return;
    const max = product.allowBackorder ? 999 : product.stock;
    changeCart({
      ...cartRef.current,
      [cartLineKey(product)]: {
        product,
        quantity: Math.min(max, (cartRef.current[cartLineKey(product)]?.quantity || 0) + Math.max(1, Math.floor(n))),
      },
    });
    setNotice("Votre panier a été mis à jour");
  }, [changeCart]);
  const toggleFavorite = useCallback(
    (id: string) =>
      setFavorites((f) =>
        f.includes(id) ? f.filter((x) => x !== id) : [...f, id],
      ),
    [],
  );
  const clearCart = useCallback(() => changeCart({}), [changeCart]);
  return (
    <Context.Provider
      value={{
        cart,
        favorites,
        add,
        setQuantity,
        toggleFavorite,
        clearCart,
        count: Object.values(cart).reduce((sum, line) => sum + line.quantity, 0),
        total: Object.values(cart).reduce(
          (sum, line) => sum + line.product.price * line.quantity,
          0,
        ),
        notice,
      }}
    >
      {children}
      <div className={`toast ${notice ? "visible" : ""}`} role="status">
        <StoreText>{notice}</StoreText>
      </div>
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("StoreProvider missing");
  return store;
}
