import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { LiveOffer, Product } from "@/types";

interface Catalog {
  products: Product[];
  offers: LiveOffer[];
  loading: boolean;
}

function normalise(rows: Record<string, unknown>[]): Product[] {
  return rows.map((r) => ({
    id: String(r["id"]),
    name: String(r["name"]),
    category: String(r["category"]),
    price: Number(r["price"]),
    tags: (r["tags"] as string[]) ?? [],
    image_url: String(r["image_url"]),
    stock_count: Number(r["stock_count"]),
  }));
}

/**
 * Catalogue state driven by Postgres realtime — stock counts and live deals
 * update in place with no polling.
 */
export function useLiveCatalog(): Catalog {
  const [state, setState] = useState<Catalog>({ products: [], offers: [], loading: true });

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [{ data: products }, { data: offers }] = await Promise.all([
        supabase.from("products").select("*").order("category").order("price"),
        supabase.from("live_offers").select("*"),
      ]);
      if (!active) return;
      setState({
        products: normalise((products ?? []) as Record<string, unknown>[]),
        offers: ((offers ?? []) as Record<string, unknown>[]).map((o) => ({
          id: String(o["id"]),
          product_id: String(o["product_id"]),
          discount_pct: Number(o["discount_pct"]),
          expires_at: String(o["expires_at"]),
          active: Boolean(o["active"]),
        })),
        loading: false,
      });
    };

    void load();

    const channel = supabase
      .channel("dealmate-catalog")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        void load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_offers" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return state;
}

/** The strongest offer currently running on a product, if any. */
export function activeOfferFor(offers: LiveOffer[], productId: string): LiveOffer | null {
  const now = Date.now();
  return (
    offers
      .filter((o) => o.product_id === productId && o.active && Date.parse(o.expires_at) > now)
      .sort((a, b) => b.discount_pct - a.discount_pct)[0] ?? null
  );
}
