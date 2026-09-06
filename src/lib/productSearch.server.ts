/**
 * Live product search — best-effort real-time results from RapidAPI's
 * Real-Time Product Search API, cached into the `products` table so the
 * rest of the app (Deal-Hunter ranking, offers, orders) works unchanged.
 *
 * If RAPIDAPI_KEY isn't set, or the call fails for any reason (network,
 * quota, bad response), this silently does nothing and the app falls back
 * to whatever is already cached in Supabase for that category — a shopper
 * never sees a hard error here.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface RapidApiProduct {
  product_id?: string;
  product_title?: string;
  product_price?: string;
  typical_price_range?: [string, string];
  product_photos?: string[];
  product_photo?: string;
}

function parsePrice(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Fetches live products for `category` (optionally narrowed by
 * `preferenceQuery`, e.g. joined shopper preferences) and upserts them into
 * the products table. Never throws — callers should just proceed to their
 * normal DB query afterward regardless of outcome.
 */
export async function fetchLiveProducts(
  category: string,
  preferenceQuery: string,
): Promise<void> {
  const key = process.env["RAPIDAPI_KEY"];
  if (!key) return;

  const query = [category, preferenceQuery].filter(Boolean).join(" ").trim();
  if (!query) return;

  try {
    const url = new URL("https://real-time-product-search.p.rapidapi.com/search");
    url.searchParams.set("q", query);
    url.searchParams.set("country", "in");
    url.searchParams.set("language", "en");
    url.searchParams.set("limit", "6");

    const res = await fetch(url, {
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": "real-time-product-search.p.rapidapi.com",
      },
    });

        if (!res.ok) {
      console.error("[productSearch] RapidAPI returned non-ok status", res.status, await res.text());
      return;
    }

    const json = (await res.json()) as any;
    // Response shape isn't 100% guaranteed by the docs — handle the common variants defensively.
    const items: RapidApiProduct[] = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.data?.products)
        ? json.data.products
        : Array.isArray(json?.products)
          ? json.products
          : [];

    if (items.length === 0) {
      console.error("[productSearch] no usable items in response, raw shape:", JSON.stringify(json).slice(0, 500));
      return;
    }
    const rows = items
      .map((item) => {
        const price = parsePrice(item.product_price) ?? parsePrice(item.typical_price_range?.[0]);
        const image = item.product_photos?.[0] ?? item.product_photo;
        if (!item.product_id || !item.product_title || !price || !image) return null;

        return {
          external_id: item.product_id,
          name: item.product_title.slice(0, 200),
          category,
          price,
          tags: [category.toLowerCase()],
          image_url: image,
          stock_count: 25,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length === 0) return;

    // On conflict (already cached), leave the existing row untouched — we
    // only want to fill gaps, not churn prices shoppers may already be
    // negotiating against.
    await supabaseAdmin.from("products").upsert(rows, {
      onConflict: "external_id",
      ignoreDuplicates: true,
    });
  } catch (error) {
    console.error("[productSearch] live fetch failed, continuing with cache", error);
  }
}
