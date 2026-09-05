/** Order placement and history. Price and stock are validated server-side. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { priceFloor } from "./negotiation.server";

export interface PlacedOrder {
  id: string;
  product_id: string;
  quantity: number;
  negotiated_price: number;
  delivery_address: string;
  created_at: string;
  status: string;
}

const placeOrderInput = z.object({
  sessionId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
  deliveryAddress: z.string().trim().min(10).max(300),
});

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => placeOrderInput.parse(input))
  .handler(async ({ data, context }): Promise<PlacedOrder> => {
    // The negotiated price comes from the stored session, never from the client.
    const { data: session } = await context.supabase
      .from("negotiation_sessions")
      .select("id, product_id, final_price")
      .eq("id", data.sessionId)
      .single();

    if (!session || session.product_id !== data.productId || !session.final_price) {
      throw new Error("No negotiated deal found for this product.");
    }

    const { data: product } = await context.supabase
      .from("products")
      .select("price, stock_count")
      .eq("id", data.productId)
      .single();
    if (!product) throw new Error("This product is no longer available.");

    const listPrice = Number(product.price);
    const negotiated = Number(session.final_price);
    if (negotiated < priceFloor(listPrice, data.quantity) - 0.01 || negotiated > listPrice) {
      throw new Error("The negotiated price is outside the seller's limits.");
    }
    if (product.stock_count < data.quantity) {
      throw new Error("Not enough stock left for that quantity.");
    }

    // Atomic: the database routine re-checks price and stock, decrements stock
    // and inserts the order in one transaction.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin.rpc("place_order", {
      _user_id: context.userId,
      _product_id: data.productId,
      _quantity: data.quantity,
      _negotiated_price: negotiated,
      _delivery_address: data.deliveryAddress,
    });

    if (error) {
      const map: Record<string, string> = {
        INSUFFICIENT_STOCK: "That quantity just sold out. Try a smaller quantity.",
        PRICE_OUT_OF_BOUNDS: "The negotiated price is outside the seller's limits.",
        PRODUCT_NOT_FOUND: "This product is no longer available.",
        INVALID_QUANTITY: "Choose a quantity between 1 and 10.",
      };
      const key = Object.keys(map).find((k) => error.message.includes(k));
      throw new Error(key ? map[key]! : "We couldn't place that order. Please try again.");
    }

    await context.supabase
      .from("negotiation_sessions")
      .update({ stage: "ordered" })
      .eq("id", data.sessionId);

    const row = order as unknown as PlacedOrder;
    return { ...row, negotiated_price: Number(row.negotiated_price) };
  });

export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("*, products(name, image_url, category, price)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("negotiation_sessions")
      .select("id, created_at, category, budget_min, budget_max, preferences, stage, final_price")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
