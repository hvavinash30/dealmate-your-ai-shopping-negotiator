/**
 * Server functions that drive the existing stage-2 engine
 * (src/lib/bulk-negotiation.server.ts) from the chat UI.
 *
 * This file owns NO negotiation logic of its own — it only loads session
 * context, calls runRound / computeFinalDeal, and persists the PUBLIC
 * result. Seller floors, bulk tiers, concession rates and the buyer's
 * walk-away limit stay inside bulk-negotiation.server.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Json } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AgentKind, ChatMessage } from "@/types";
import {
  HARD_MAX_QUANTITY,
  MAX_ROUNDS,
  computeFinalDeal,
  defaultShipping,
  runRound,
  type BuyerConstraints,
  type FinalDeal,
  type NegotiationMessage,
  type NegotiationMode,
  type NegotiationState,
  type Offer,
} from "./bulk-negotiation.server";
import { round2 } from "./negotiation.server";

export interface QuantityDealState {
  mode: NegotiationMode;
  round: number;
  state: NegotiationState;
  canContinue: boolean;
  history: NegotiationMessage[];
  bestOffer: Offer | null;
  projectedDeal: FinalDeal | null;
  finalDeal: FinalDeal | null;
  sellerAttempt: number;
}

const EMPTY_STATE: QuantityDealState = {
  mode: "best_overall",
  round: 0,
  state: "initialized",
  canContinue: false,
  history: [],
  bestOffer: null,
  projectedDeal: null,
  finalDeal: null,
  sellerAttempt: 0,
};

/** Normalizes a stored JSONB blob back into a state, or null if unstarted. */
export function normalizeQuantityDeal(raw: unknown): QuantityDealState | null {
  const state: QuantityDealState = { ...EMPTY_STATE, ...((raw as Partial<QuantityDealState>) ?? {}) };
  return state.round > 0 ? state : null;
}

function buildConstraints(
  mode: NegotiationMode,
  budgetMax: number | null,
  stock: number,
): BuyerConstraints {
  const maxQuantity = Math.max(1, Math.min(HARD_MAX_QUANTITY, 10, stock));
  const preferredQuantity = Math.min(maxQuantity, mode === "max_quantity" ? maxQuantity : 3);
  return { minQuantity: 1, maxQuantity, preferredQuantity, maxTotalBudget: budgetMax, mode };
}

function project(state: QuantityDealState, listPrice: number, agreedUnitPrice: number): FinalDeal | null {
  if (!state.bestOffer) return null;
  return computeFinalDeal(state.bestOffer, listPrice, agreedUnitPrice, state.round, defaultShipping(listPrice));
}

async function loadContext(supabase: any, sessionId: string) {
  const { data: session, error } = await supabase
    .from("negotiation_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (error || !session) throw new Error("Session not found.");
  if (!session.product_id || !session.final_price) {
    throw new Error("Negotiate a price for a product before starting quantity negotiation.");
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", session.product_id)
    .single();
  if (productError || !product) throw new Error("Product unavailable.");

  const state = normalizeQuantityDeal(session.quantity_negotiation) ?? EMPTY_STATE;
  return { session, product, state };
}

async function persist(
  supabase: any,
  sessionId: string,
  state: QuantityDealState,
  extra: Record<string, unknown> = {},
) {
  await supabase
    .from("negotiation_sessions")
    .update({ quantity_negotiation: state as unknown as Json, ...extra })
    .eq("id", sessionId);
}

async function logMessages(supabase: any, sessionId: string, messages: NegotiationMessage[]) {
  const inserted: ChatMessage[] = [];
  for (const m of messages) {
    const label = m.sender === "buyer" ? "Buyer Agent" : "Seller Agent";
    const { data: row } = await supabase
      .from("conversation_messages")
      .insert({
        session_id: sessionId,
        role: "agent",
        agent: "negotiation" satisfies AgentKind,
        content: `${label}: ${m.text}`,
      })
      .select("*")
      .single();
    if (row) inserted.push(row as ChatMessage);
  }
  return inserted;
}

const sessionOnlyInput = z.object({ sessionId: z.string().uuid() });

const startInput = z.object({
  sessionId: z.string().uuid(),
  mode: z.enum(["best_price", "bulk_deal", "max_quantity", "best_overall"]),
});

/** Kicks off stage 2 (quantity / bulk / shipping) on the currently agreed product+price. */
export const startQuantityNegotiation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startInput.parse(input))
  .handler(async ({ data, context }): Promise<{ messages: ChatMessage[]; deal: QuantityDealState }> => {
    const supabase = context.supabase;
    const { session, product } = await loadContext(supabase, data.sessionId);

    const listPrice = Number(product.price);
    const agreedUnitPrice = Number(session.final_price);
    const budgetMax = session.budget_max ? Number(session.budget_max) : null;
    const constraints = buildConstraints(data.mode, budgetMax, product.stock_count);

    const output = runRound({
      negotiationId: session.id,
      productName: product.name,
      listPrice,
      agreedUnitPrice,
      stock: product.stock_count,
      constraints,
      round: 1,
      history: [],
    });

    const state: QuantityDealState = {
      mode: data.mode,
      round: 1,
      state: output.state,
      canContinue: output.canContinue,
      history: output.messages,
      bestOffer: output.bestOffer,
      projectedDeal: null,
      finalDeal: null,
      sellerAttempt: 0,
    };
    state.projectedDeal = project(state, listPrice, agreedUnitPrice);

    await persist(supabase, data.sessionId, state);
    const messages = await logMessages(supabase, data.sessionId, output.messages);
    return { messages, deal: state };
  });

/** Runs exactly one more round. Rejects if canContinue is false — the UI must not offer this otherwise. */
export const continueNegotiation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sessionOnlyInput.parse(input))
  .handler(async ({ data, context }): Promise<{ messages: ChatMessage[]; deal: QuantityDealState }> => {
    const supabase = context.supabase;
    const { session, product, state } = await loadContext(supabase, data.sessionId);

    if (!state.canContinue || state.state !== "quantity_negotiating") {
      throw new Error("No further negotiation round is possible for this deal.");
    }

    const listPrice = Number(product.price);
    const agreedUnitPrice = Number(session.final_price);
    const budgetMax = session.budget_max ? Number(session.budget_max) : null;
    const constraints = buildConstraints(state.mode, budgetMax, product.stock_count);
    const nextRound = state.round + 1;

    const output = runRound({
      negotiationId: session.id,
      productName: product.name,
      listPrice,
      agreedUnitPrice,
      stock: product.stock_count,
      constraints,
      round: nextRound,
      history: state.history,
    });

    const nextState: QuantityDealState = {
      ...state,
      round: nextRound,
      state: output.state,
      canContinue: output.canContinue && nextRound < MAX_ROUNDS,
      history: [...state.history, ...output.messages],
      bestOffer: output.bestOffer ?? state.bestOffer,
    };
    nextState.projectedDeal = project(nextState, listPrice, agreedUnitPrice);

    await persist(supabase, data.sessionId, nextState);
    const messages = await logMessages(supabase, data.sessionId, output.messages);
    return { messages, deal: nextState };
  });

/** Locks in the current best offer as the final deal. */
export const acceptQuantityDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sessionOnlyInput.parse(input))
  .handler(async ({ data, context }): Promise<{ deal: QuantityDealState }> => {
    const supabase = context.supabase;
    const { session, product, state } = await loadContext(supabase, data.sessionId);
    if (!state.bestOffer) throw new Error("There's no offer on the table yet.");

    const listPrice = Number(product.price);
    const agreedUnitPrice = Number(session.final_price);
    const finalDeal = computeFinalDeal(
      state.bestOffer,
      listPrice,
      agreedUnitPrice,
      state.round,
      defaultShipping(listPrice),
    );

    const nextState: QuantityDealState = {
      ...state,
      state: "deal_accepted",
      canContinue: false,
      finalDeal,
      projectedDeal: finalDeal,
    };

    // The accepted per-unit price becomes the session's negotiated price so
    // ordering (orders.functions.ts) and DealPanel keep working unmodified.
    await persist(supabase, data.sessionId, nextState, {
      final_price: nextState.bestOffer!.unitPrice,
      final_deal: finalDeal as unknown as Json,
    });

    return { deal: nextState };
  });

/** Restarts stage 2 against a freshly-simulated seller stance, from round one. */
export const tryAnotherSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sessionOnlyInput.parse(input))
  .handler(async ({ data, context }): Promise<{ messages: ChatMessage[]; deal: QuantityDealState }> => {
    const supabase = context.supabase;
    const { session, product, state } = await loadContext(supabase, data.sessionId);

    const listPrice = Number(product.price);
    // Simulate switching seller: a new opening stance near the previously
    // agreed price. Seller floor rules are still fully enforced inside
    // bulk-negotiation.server.ts regardless of this anchor.
    const jitter = 0.97 + Math.random() * 0.06;
    const agreedUnitPrice = round2(Number(session.final_price) * jitter);
    const budgetMax = session.budget_max ? Number(session.budget_max) : null;
    const constraints = buildConstraints(state.mode, budgetMax, product.stock_count);

    const output = runRound({
      negotiationId: `${session.id}-seller-${state.sellerAttempt + 1}`,
      productName: product.name,
      listPrice,
      agreedUnitPrice,
      stock: product.stock_count,
      constraints,
      round: 1,
      history: [],
    });

    const nextState: QuantityDealState = {
      mode: state.mode,
      round: 1,
      state: output.state,
      canContinue: output.canContinue,
      history: output.messages,
      bestOffer: output.bestOffer,
      projectedDeal: null,
      finalDeal: null,
      sellerAttempt: state.sellerAttempt + 1,
    };
    nextState.projectedDeal = project(nextState, listPrice, agreedUnitPrice);

    await persist(supabase, data.sessionId, nextState, {
      final_price: agreedUnitPrice,
      final_deal: null,
    });

    const switchNote: NegotiationMessage = {
      negotiation_id: session.id,
      round: 0,
      sender: "seller",
      type: "price_offer",
      unit_price: null,
      quantity: null,
      total_price: null,
      shipping_cost: null,
      free_shipping: false,
      conditions: [],
      text: `Switching you to another seller for ${product.name}. Restarting negotiation from round one.`,
      timestamp: new Date().toISOString(),
    };
    const messages = await logMessages(supabase, data.sessionId, [switchNote, ...output.messages]);
    return { messages, deal: nextState };
  });
