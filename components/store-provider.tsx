"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { products } from "@/data/catalog";
type Store = {
  cart: Record<string, number>;
  favorites: string[];
  add: (id: string, n: number) => void;
  setQuantity: (id: string, n: number) => void;
  toggleFavorite: (id: string) => void;
  count: number;
  total: number;
  notice: string;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("goshop-store") || "{}");
      const safe: Record<string, number> = {};
      for (const p of products) {
        const n = saved.cart?.[p.id];
        if (Number.isInteger(n) && n > 0 && p.stock > 0)
          safe[p.id] = Math.min(n, p.stock);
      }
      setCart(safe);
      setFavorites(
        Array.isArray(saved.favorites)
          ? saved.favorites.filter((id: unknown) =>
              products.some((p) => p.id === id),
            )
          : [],
      );
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          "goshop-store",
          JSON.stringify({ cart, favorites }),
        );
      } catch {}
  }, [cart, favorites, ready]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  const setQuantity = useCallback((id: string, n: number) => {
    const p = products.find((p) => p.id === id);
    if (!p) return;
    setCart((c) => {
      const next = { ...c };
      const quantity = Math.max(0, Math.min(p.stock, Math.floor(n)));
      if (quantity) next[id] = quantity;
      else delete next[id];
      return next;
    });
  }, []);
  const add = useCallback((id: string, n: number) => {
    const p = products.find((p) => p.id === id);
    if (!p || !p.stock) return;
    setCart((c) => ({
      ...c,
      [id]: Math.min(p.stock, (c[id] || 0) + Math.max(1, Math.floor(n))),
    }));
    setNotice("Votre panier a été mis à jour");
  }, []);
  const toggleFavorite = useCallback(
    (id: string) =>
      setFavorites((f) =>
        f.includes(id) ? f.filter((x) => x !== id) : [...f, id],
      ),
    [],
  );
  return (
    <Context.Provider
      value={{
        cart,
        favorites,
        add,
        setQuantity,
        toggleFavorite,
        count: Object.values(cart).reduce((a, b) => a + b, 0),
        total: products.reduce(
          (sum, p) => sum + p.price * (cart[p.id] || 0),
          0,
        ),
        notice,
      }}
    >
      {children}
      <div className={`toast ${notice ? "visible" : ""}`} role="status">
        {notice}
      </div>
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("StoreProvider missing");
  return store;
}
