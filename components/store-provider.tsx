"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { StoreText } from "./storefront-language";
import type { CatalogProduct } from "@/lib/catalog-model";
import { cartLineKey } from "@/lib/product-variants";
type CartLine = { product: CatalogProduct; quantity: number };
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
  useEffect(() => {
    const restoredCart: Record<string, CartLine> = {};
    let restoredFavorites: string[] = [];
    try {
      const raw = JSON.parse(localStorage.getItem("goshop-store") || "{}");
      const saved = raw.version === 2 ? raw : {};
      for (const [id, line] of Object.entries(saved.cart ?? {})) {
        const candidate = line as Partial<CartLine>;
        const product = candidate.product;
        const n = candidate.quantity;
        if (product && cartLineKey(product) === id && (!product.hasColorVariants || product.selectedVariant) && Number.isInteger(n) && Number(n) > 0)
          restoredCart[id] = {
            product,
            quantity: Math.min(Number(n), product.stock || (product.allowBackorder ? 999 : 0)),
          };
      }
      restoredFavorites = Array.isArray(saved.favorites) ? saved.favorites.filter((id: unknown) => typeof id === "string") : [];
    } catch {}
    const timer = window.setTimeout(() => {
      setCart(restoredCart);
      setFavorites(restoredFavorites);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    fetch("/api/cart", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { lines?: CartLine[]; unavailableLineKeys?: string[] }) => {
        if (payload.lines?.length) setCart(Object.fromEntries(payload.lines.map((line) => [cartLineKey(line.product), line])));
        else if (payload.unavailableLineKeys?.length) setCart((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !payload.unavailableLineKeys!.includes(key))));
      })
      .catch(() => {})
      .finally(() => setRemoteReady(true));
    return () => controller.abort();
  }, [ready]);
  useEffect(() => {
    if (!ready) return;
    fetch("/api/favorites")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { ids?: string[] }) => setFavorites((current) => [...new Set([...current, ...(payload.ids ?? [])])]))
      .then(() => setFavoriteRemoteReady(true))
      .catch(() => {});
  }, [ready]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          "goshop-store",
          JSON.stringify({ version: 2, cart, favorites }),
        );
      } catch {}
  }, [cart, favorites, ready]);
  useEffect(() => {
    if (!remoteReady) return;
    const timer = setTimeout(() => {
      void fetch("/api/cart", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines: Object.values(cart).map(({ product, quantity }) => ({ product_id: product.id, variant_id: product.selectedVariant?.id ?? null, quantity })) }) });
    }, 350);
    return () => clearTimeout(timer);
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
    setCart((c) => {
      const line = c[id];
      if (!line) return c;
      const next = { ...c };
      const max = line.product.allowBackorder ? 999 : line.product.stock;
      const quantity = Math.max(0, Math.min(max, Math.floor(n)));
      if (quantity) next[id] = { ...line, quantity };
      else delete next[id];
      return next;
    });
  }, []);
  const add = useCallback((product: CatalogProduct, n: number) => {
    if (product.hasColorVariants && !product.selectedVariant) return;
    if (!product.stock && !product.allowBackorder) return;
    setCart((c) => {
      const max = product.allowBackorder ? 999 : product.stock;
      return {
        ...c,
        [cartLineKey(product)]: {
          product,
          quantity: Math.min(max, (c[cartLineKey(product)]?.quantity || 0) + Math.max(1, Math.floor(n))),
        },
      };
    });
    setNotice("Votre panier a été mis à jour");
  }, []);
  const toggleFavorite = useCallback(
    (id: string) =>
      setFavorites((f) =>
        f.includes(id) ? f.filter((x) => x !== id) : [...f, id],
      ),
    [],
  );
  const clearCart = useCallback(() => setCart({}), []);
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
