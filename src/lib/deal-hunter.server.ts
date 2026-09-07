/**
 * Deal-Hunter — deterministic ranking, no LLM involved.
 *
 * Products are filtered by category and a ±15% budget window, cross-referenced
 * with active, unexpired live offers, then scored.
 */
import type { LiveOffer, Product, RankedProduct } from "@/types";
import { categoriesMatch } from "./categories.server";
import { round2 } from "./negotiation.server";

const BUDGET_TOLERANCE = 0.15;

export function budgetWindow(min: number | null, max: number | null) {
  const low = min ?? 0;
  const high = max ?? Number.MAX_SAFE_INTEGER;
  return {
    low: Math.max(0, low * (1 - BUDGET_TOLERANCE)),
    high: high === Number.MAX_SAFE_INTEGER ? high : high * (1 + BUDGET_TOLERANCE),
  };
}

export function effectivePrice(product: Product, offer: LiveOffer | null): number {
  if (!offer) return round2(product.price);
  return round2(product.price * (1 - offer.discount_pct / 100));
}

export function bestActiveOffer(offers: LiveOffer[], productId: string): LiveOffer | null {
  const now = Date.now();
  return (
    offers
      .filter(
        (o) => o.product_id === productId && o.active && new Date(o.expires_at).getTime() > now,
      )
      .sort((a, b) => b.discount_pct - a.discount_pct)[0] ?? null
  );
}

export function rankProducts(
  products: Product[],
  offers: LiveOffer[],
  input: { category: string | null; budgetMin: number | null; budgetMax: number | null; preferences: string[] },
): RankedProduct[] {
  const { low, high } = budgetWindow(input.budgetMin, input.budgetMax);
  const wanted = input.preferences.map((p) => p.toLowerCase().trim()).filter(Boolean);
  const target = input.budgetMax ?? input.budgetMin ?? null;

  return products
    .filter((p) => !input.category || categoriesMatch(p.category, input.category))
    .map<RankedProduct>((product) => {
      const offer = bestActiveOffer(offers, product.id);
      const price = effectivePrice(product, offer);

      // Budget fit: full marks inside the stated range, tapering outside it.
      let budgetScore = 0;
      if (price >= low && price <= high) {
        budgetScore = target ? 1 - Math.min(1, Math.abs(target - price) / Math.max(target, 1)) : 1;
      }

      const tagHits = wanted.filter((w) =>
        product.tags.some((tag) => tag.toLowerCase().includes(w) || w.includes(tag.toLowerCase())),
      ).length;
      const tagScore = wanted.length ? tagHits / wanted.length : 0.5;

      const offerScore = offer ? Math.min(1, offer.discount_pct / 15) : 0;
      const stockScore = product.stock_count > 0 ? 1 : 0;
      const inBudget = price >= low && price <= high ? 1 : 0;

      const score =
        inBudget * 3 + budgetScore * 1.5 + tagScore * 2.5 + offerScore * 1.2 + stockScore * 0.8;

      return { ...product, offer, effective_price: price, score: round2(score) };
    })
    .sort((a, b) => b.score - a.score || a.effective_price - b.effective_price)
    .slice(0, 3);
}
