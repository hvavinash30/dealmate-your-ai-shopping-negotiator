/**
 * Seller dashboard operations.
 *
 * Seller access is granted by a code held only on the server; the role itself
 * lives in the `user_roles` table and is what RLS checks. Nothing here trusts
 * a client-supplied role.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSeller(supabase: {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
}, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "seller" });
  if (data !== true) throw new Error("Seller access required.");
}

export const getSellerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "seller",
    });
    return { isSeller: data === true };
  });

export const claimSellerAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data, context }) => {
    const expected = process.env["SELLER_ACCESS_CODE"];
    if (!expected) throw new Error("Seller access is not configured.");
    if (data.code.trim() !== expected) throw new Error("That access code isn't valid.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "seller" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { isSeller: true };
  });

export const getSellerData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSeller(context.supabase, context.userId);

    const [products, offers, orders] = await Promise.all([
      context.supabase.from("products").select("*").order("category").order("name"),
      context.supabase.from("live_offers").select("*").order("created_at", { ascending: false }),
      context.supabase
        .from("orders")
        .select("id, quantity, negotiated_price, status, created_at, products(name)")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    return {
      products: products.data ?? [],
      offers: offers.data ?? [],
      orders: orders.data ?? [],
    };
  });

export const updateStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ productId: z.string().uuid(), stock: z.number().int().min(0).max(999) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSeller(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("products")
      .update({ stock_count: data.stock })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        offerId: z.string().uuid().optional(),
        productId: z.string().uuid(),
        discountPct: z.number().min(1).max(40),
        minutes: z.number().int().min(1).max(1440),
        active: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSeller(context.supabase, context.userId);
    const expiresAt = new Date(Date.now() + data.minutes * 60_000).toISOString();

    if (data.offerId) {
      const { error } = await context.supabase
        .from("live_offers")
        .update({ discount_pct: data.discountPct, expires_at: expiresAt, active: data.active })
        .eq("id", data.offerId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("live_offers").insert({
        product_id: data.productId,
        discount_pct: data.discountPct,
        expires_at: expiresAt,
        active: data.active,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setOfferActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ offerId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSeller(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("live_offers")
      .update({ active: data.active })
      .eq("id", data.offerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
