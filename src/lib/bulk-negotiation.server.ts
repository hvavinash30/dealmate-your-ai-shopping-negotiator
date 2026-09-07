/**
 * Stage-2 negotiation engine: quantity, bulk discount and shipping.
 *
 * EVERYTHING in this module is server-only. The seller's inventory, minimum
 * price, margins, maximum discount, bulk tiers and concession strategy never
 * leave this file — only the resulting public offers do. The buyer agent's
 * walk-away limit and the shopper's maximum budget are likewise never written
 * into any message text that reaches the seller agent or the browser.
 */

import { priceFloor, round2 } from "./negotiation.server";

export type NegotiationMode = "best_price" | "bulk_deal" | "max_quantity" | "best_overall";

export type NegotiationState =
  | "initialized"
  | "price_negotiating"
  | "price_accepted"
  | "quantity_negotiating"
  | "final_offer"
  | "deal_accepted"
  | "rejected"
  | "walked_away"
  | "expired";

export type MessageType =
  | "price_offer"
  | "price_counteroffer"
  | "quantity_request"
  | "quantity_offer"
  | "bulk_offer"
  | "shipping_request"
  | "shipping_offer"
  | "final_offer"
  | "accept"
  | "reject"
  | "walk_away";

export interface NegotiationMessage {
  negotiation_id: string;
  round: number;
  sender: "buyer" | "seller";
  type: MessageType;
  unit_price: number | null;
  quantity: number | null;
  total_price: number | null;
  shipping_cost: number | null;
  free_shipping: boolean;
  conditions: string[];
  text: string;
  timestamp: string;
}

export interface BuyerConstraints {
  minQuantity: number;
  maxQuantity: number;
  preferredQuantity: number;
  maxTotalBudget: number | null;
  mode: NegotiationMode;
}

export interface FinalDeal {
  quantity: number;
  unit_price: number;
  base_total: number;
  bulk_discount: number;
  shipping_cost: number;
  shipping_savings: number;
  total_price: number;
  total_savings: number;
  effective_unit_price: number;
  discount_pct: number;
  rounds: number;
}

/** A concrete, validated offer on the table. */
export interface Offer {
  quantity: number;
  unitPrice: number;
  shippingCost: number;
  freeShipping: boolean;
  total: number;
}

export const MAX_ROUNDS = 4;
export const HARD_MAX_QUANTITY = 10;

/* -------------------------------------------------------------------------
 * PRIVATE seller policy. Never serialised, never returned to a caller.
 * ---------------------------------------------------------------------- */

interface SellerPolicy {
  inventory: number;
  minOrderQuantity: number;
  /** Absolute per-unit minimum for a given quantity — the seller's margin wall. */
  floorFor: (quantity: number) => number;
  /** Extra bulk concession the seller is internally willing to give. */
  bulkDiscountFor: (quantity: number) => number;
  baseShipping: number;
  /** Quantity from which the seller privately accepts waiving shipping. */
  freeShippingFrom: number;
  /** How much of the remaining gap the seller concedes each round. */
  concessionRate: number;
}

function sellerPolicy(listPrice: number, agreedUnitPrice: number, stock: number): SellerPolicy {
  return {
    inventory: Math.max(0, stock),
    minOrderQuantity: 1,
    floorFor: (quantity: number) => priceFloor(listPrice, quantity),
    bulkDiscountFor: (quantity: number) => {
      if (quantity >= 8) return 0.06;
      if (quantity >= 5) return 0.04;
      if (quantity >= 3) return 0.025;
      if (quantity >= 2) return 0.012;
      return 0;
    },
    baseShipping: round2(Math.min(1200, Math.max(199, listPrice * 0.02))),
    freeShippingFrom: 3,
    concessionRate: 0.45,
  };
}

/** The best unit price the seller would ever reach for a quantity (private). */
function sellerBestUnit(policy: SellerPolicy, agreedUnitPrice: number, quantity: number): number {
  const bulk = agreedUnitPrice * (1 - policy.bulkDiscountFor(quantity));
  return round2(Math.max(policy.floorFor(quantity), bulk));
}

/** The seller's opening ask for a quantity (private strategy). */
function sellerOpeningUnit(policy: SellerPolicy, agreedUnitPrice: number, quantity: number): number {
  const best = sellerBestUnit(policy, agreedUnitPrice, quantity);
  return round2(Math.max(best, agreedUnitPrice - (agreedUnitPrice - best) * 0.35));
}

function sellerShipping(policy: SellerPolicy, quantity: number, requested: boolean): {
  cost: number;
  free: boolean;
} {
  const free = quantity >= policy.freeShippingFrom || (requested && quantity >= 2);
  return { cost: free ? 0 : policy.baseShipping, free };
}

/* -------------------------------------------------------------------------
 * PRIVATE buyer strategy.
 * ---------------------------------------------------------------------- */

/** Highest per-unit price the buyer may accept for a quantity, budget-safe. */
function buyerCeiling(
  constraints: BuyerConstraints,
  quantity: number,
  shipping: number,
): number | null {
  if (constraints.maxTotalBudget === null) return null;
  const room = constraints.maxTotalBudget - shipping;
  if (room <= 0) return 0;
  return round2(room / quantity);
}

/** Buyer's ask for a round — aggressive first, converging afterwards. */
function buyerAsk(
  agreedUnitPrice: number,
  sellerAsk: number,
  round: number,
  mode: NegotiationMode,
): number {
  const opening = agreedUnitPrice * (mode === "max_quantity" ? 0.86 : 0.9);
  if (round <= 1) return round2(Math.min(opening, sellerAsk));
  // Converge: give up 35% of the remaining gap each round.
  const previous = buyerAsk(agreedUnitPrice, sellerAsk, round - 1, mode);
  return round2(previous + (sellerAsk - previous) * 0.35);
}

/* -------------------------------------------------------------------------
 * Validation — every offer passes through here before it can be accepted.
 * ---------------------------------------------------------------------- */

export interface ValidationResult {
  ok: boolean;
  reason: string | null;
}

export function validateOffer(offer: Offer, constraints: BuyerConstraints): ValidationResult {
  if (offer.quantity > constraints.maxQuantity) {
    return { ok: false, reason: "quantity above the shopper's maximum" };
  }
  if (offer.quantity < constraints.minQuantity) {
    return { ok: false, reason: "quantity below the shopper's minimum" };
  }
  if (offer.quantity < 1) return { ok: false, reason: "quantity must be at least one" };
  if (
    constraints.maxTotalBudget !== null &&
    round2(offer.unitPrice * offer.quantity + offer.shippingCost) >
      constraints.maxTotalBudget + 0.01
  ) {
    return { ok: false, reason: "total including shipping exceeds the budget" };
  }
  return { ok: true, reason: null };
}

/* -------------------------------------------------------------------------
 * Best-overall evaluation — total cost of ownership, not lowest unit price.
 * ---------------------------------------------------------------------- */

export function scoreOffer(offer: Offer, constraints: BuyerConstraints): number {
  const effectiveUnit = (offer.unitPrice * offer.quantity + offer.shippingCost) / offer.quantity;
  switch (constraints.mode) {
    case "max_quantity":
      // Quantity dominates; effective unit price breaks ties.
      return offer.quantity * 1_000_000 - effectiveUnit;
    case "best_price":
      return -offer.unitPrice;
    case "bulk_deal":
      return offer.quantity * 1000 - effectiveUnit;
    case "best_overall":
    default:
      return -effectiveUnit;
  }
}

/** Picks the best of several valid offers using total-cost logic. */
export function bestOffer(offers: Offer[], constraints: BuyerConstraints): Offer | null {
  const valid = offers.filter((o) => validateOffer(o, constraints).ok);
  if (valid.length === 0) return null;
  return valid.reduce((best, o) =>
    scoreOffer(o, constraints) > scoreOffer(best, constraints) ? o : best,
  );
}

/* -------------------------------------------------------------------------
 * The round engine.
 * ---------------------------------------------------------------------- */

export interface RoundInput {
  negotiationId: string;
  productName: string;
  listPrice: number;
  agreedUnitPrice: number;
  stock: number;
  constraints: BuyerConstraints;
  round: number;
  history: NegotiationMessage[];
}

export interface RoundOutput {
  messages: NegotiationMessage[];
  state: NegotiationState;
  bestOffer: Offer | null;
  canContinue: boolean;
}

function money(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function makeMessage(
  base: Pick<NegotiationMessage, "negotiation_id" | "round" | "sender" | "type" | "text">,
  offer?: Partial<Offer>,
  conditions: string[] = [],
): NegotiationMessage {
  return {
    ...base,
    unit_price: offer?.unitPrice ?? null,
    quantity: offer?.quantity ?? null,
    total_price:
      offer?.unitPrice != null && offer?.quantity != null
        ? round2(offer.unitPrice * offer.quantity + (offer.shippingCost ?? 0))
        : null,
    shipping_cost: offer?.shippingCost ?? null,
    free_shipping: offer?.freeShipping ?? false,
    conditions,
    timestamp: new Date().toISOString(),
  };
}

/** The quantity the buyer targets this round, given the mode and budget. */
function targetQuantity(
  policy: SellerPolicy,
  input: RoundInput,
  round: number,
): number {
  const { constraints, agreedUnitPrice } = input;
  const cap = Math.min(
    constraints.maxQuantity,
    HARD_MAX_QUANTITY,
    Math.max(policy.minOrderQuantity, policy.inventory),
  );

  if (constraints.mode === "max_quantity") {
    // Largest quantity whose realistic total still fits the budget.
    for (let q = cap; q >= constraints.minQuantity; q--) {
      const unit = sellerBestUnit(policy, agreedUnitPrice, q);
      const ship = sellerShipping(policy, q, true);
      const ceiling = buyerCeiling(constraints, q, ship.cost);
      if (ceiling === null || unit <= ceiling) return q;
    }
    return Math.max(1, constraints.minQuantity);
  }

  const wanted = Math.min(cap, Math.max(constraints.preferredQuantity, constraints.minQuantity));
  if (constraints.mode === "bulk_deal" && round >= 2) {
    // Probe one extra unit if it is still affordable — bulk tiers may pay for it.
    const probe = Math.min(cap, wanted + 1);
    const unit = sellerBestUnit(policy, agreedUnitPrice, probe);
    const ship = sellerShipping(policy, probe, true);
    const ceiling = buyerCeiling(constraints, probe, ship.cost);
    if (ceiling === null || unit <= ceiling) return probe;
  }
  return Math.max(1, wanted);
}

/**
 * Runs one full round: buyer offer -> seller response, with validation,
 * loop detection and a final-offer/walk-away exit.
 */
export function runRound(input: RoundInput): RoundOutput {
  const policy = sellerPolicy(input.listPrice, input.agreedUnitPrice, input.stock);
  const round = input.round;
  const messages: NegotiationMessage[] = [];
  const id = input.negotiationId;

  if (policy.inventory < Math.max(1, input.constraints.minQuantity)) {
    messages.push(
      makeMessage({
        negotiation_id: id,
        round,
        sender: "seller",
        type: "reject",
        text: `I can't cover that order size right now for the ${input.productName}.`,
      }),
    );
    return { messages, state: "rejected", bestOffer: null, canContinue: false };
  }

  const quantity = targetQuantity(policy, input, round);
  const wantsShipping = round >= 2 || input.constraints.mode !== "best_price";

  const sellerFloorForQty = sellerBestUnit(policy, input.agreedUnitPrice, quantity);
  const previousSeller = [...input.history].reverse().find((m) => m.sender === "seller");
  const sellerAskPrevious = previousSeller?.unit_price ?? sellerOpeningUnit(policy, input.agreedUnitPrice, quantity);

  // ---- Buyer turn -------------------------------------------------------
  const ask = buyerAsk(input.agreedUnitPrice, sellerAskPrevious, round, input.constraints.mode);
  const askShipping = sellerShipping(policy, quantity, wantsShipping);
  const buyerCeilingPrice = buyerCeiling(input.constraints, quantity, askShipping.cost);
  const buyerTarget = round2(
    buyerCeilingPrice === null ? ask : Math.min(ask, buyerCeilingPrice),
  );

  const buyerConditions = wantsShipping ? ["free shipping included"] : [];
  messages.push(
    makeMessage(
      {
        negotiation_id: id,
        round,
        sender: "buyer",
        type: round === 1 ? "quantity_request" : wantsShipping ? "shipping_request" : "quantity_offer",
        text:
          round === 1
            ? `I'd like ${quantity} ${quantity === 1 ? "unit" : "units"}. At that volume I'm looking at ${money(buyerTarget)} per unit${wantsShipping ? " with shipping covered" : ""}.`
            : `Let's close it: ${quantity} ${quantity === 1 ? "unit" : "units"} at ${money(buyerTarget)} per unit${wantsShipping ? ", shipping on you" : ""}.`,
      },
      { quantity, unitPrice: buyerTarget, shippingCost: 0, freeShipping: wantsShipping },
      buyerConditions,
    ),
  );

  // ---- Seller turn ------------------------------------------------------
  const gap = Math.max(0, sellerAskPrevious - sellerFloorForQty);
  let sellerUnit = round2(
    Math.max(sellerFloorForQty, sellerAskPrevious - gap * policy.concessionRate),
  );
  if (buyerTarget >= sellerUnit) sellerUnit = round2(Math.max(sellerFloorForQty, buyerTarget));

  const shipping = sellerShipping(policy, quantity, wantsShipping);
  const sellerOffer: Offer = {
    quantity,
    unitPrice: sellerUnit,
    shippingCost: shipping.cost,
    freeShipping: shipping.free,
    total: round2(sellerUnit * quantity + shipping.cost),
  };

  // Loop / stall detection: no meaningful movement means this is the last word.
  const stalled =
    previousSeller != null &&
    previousSeller.quantity === quantity &&
    Math.abs((previousSeller.unit_price ?? 0) - sellerUnit) < Math.max(1, sellerUnit * 0.005);
  const atFloor = sellerUnit <= sellerFloorForQty + 0.01;
  const isFinal = stalled || atFloor || round >= MAX_ROUNDS;

  const conditions: string[] = [];
  if (shipping.free) conditions.push("free shipping");
  if (policy.bulkDiscountFor(quantity) > 0) conditions.push("bulk pricing applied");

  messages.push(
    makeMessage(
      {
        negotiation_id: id,
        round,
        sender: "seller",
        type: isFinal ? "final_offer" : quantity >= 2 ? "bulk_offer" : "quantity_offer",
        text: `${isFinal ? "Final offer: " : ""}${quantity} ${quantity === 1 ? "unit" : "units"} at ${money(sellerUnit)} per unit${shipping.free ? " with free shipping" : ` plus ${money(shipping.cost)} shipping`}. Total ${money(sellerOffer.total)}.`,
      },
      sellerOffer,
      conditions,
    ),
  );

  // ---- Buyer validation -------------------------------------------------
  const check = validateOffer(sellerOffer, input.constraints);
  if (!check.ok) {
    // Try to salvage: shrink quantity until the offer fits the shopper's rules.
    let salvaged: Offer | null = null;
    for (let q = quantity - 1; q >= Math.max(1, input.constraints.minQuantity); q--) {
      const unit = sellerBestUnit(policy, input.agreedUnitPrice, q);
      const ship = sellerShipping(policy, q, wantsShipping);
      const candidate: Offer = {
        quantity: q,
        unitPrice: unit,
        shippingCost: ship.cost,
        freeShipping: ship.free,
        total: round2(unit * q + ship.cost),
      };
      if (validateOffer(candidate, input.constraints).ok) {
        salvaged = candidate;
        break;
      }
    }

    if (!salvaged) {
      messages.push(
        makeMessage({
          negotiation_id: id,
          round,
          sender: "buyer",
          type: "walk_away",
          text: "That doesn't work within my client's limits. I'll step away rather than overcommit.",
        }),
      );
      return { messages, state: "walked_away", bestOffer: null, canContinue: false };
    }

    messages.push(
      makeMessage(
        {
          negotiation_id: id,
          round,
          sender: "buyer",
          type: "reject",
          text: `That structure doesn't clear my checks. I can do ${salvaged.quantity} ${salvaged.quantity === 1 ? "unit" : "units"} at ${money(salvaged.unitPrice)} per unit instead.`,
        },
        salvaged,
      ),
    );
    messages.push(
      makeMessage(
        {
          negotiation_id: id,
          round,
          sender: "seller",
          type: "final_offer",
          text: `Agreed — final offer: ${salvaged.quantity} ${salvaged.quantity === 1 ? "unit" : "units"} at ${money(salvaged.unitPrice)} per unit${salvaged.freeShipping ? " with free shipping" : ` plus ${money(salvaged.shippingCost)} shipping`}.`,
        },
        salvaged,
        salvaged.freeShipping ? ["free shipping"] : [],
      ),
    );
    return { messages, state: "final_offer", bestOffer: salvaged, canContinue: false };
  }

  if (isFinal) {
    messages.push(
      makeMessage(
        {
          negotiation_id: id,
          round,
          sender: "buyer",
          type: "accept",
          text: `That clears every check. ${sellerOffer.quantity} ${sellerOffer.quantity === 1 ? "unit" : "units"} at ${money(sellerOffer.unitPrice)}${sellerOffer.freeShipping ? " with free shipping" : ""} — I'll take it.`,
        },
        sellerOffer,
      ),
    );
    return { messages, state: "final_offer", bestOffer: sellerOffer, canContinue: false };
  }

  return {
    messages,
    state: "quantity_negotiating",
    bestOffer: sellerOffer,
    canContinue: round < MAX_ROUNDS,
  };
}

/** Backend-calculated final deal. The client only renders these numbers. */
export function computeFinalDeal(
  offer: Offer,
  listPrice: number,
  agreedUnitPrice: number,
  rounds: number,
  baseShipping: number,
): FinalDeal {
  const baseTotal = round2(offer.unitPrice * offer.quantity);
  const shippingSavings = offer.freeShipping ? round2(baseShipping) : 0;
  const total = round2(baseTotal + offer.shippingCost);
  const listTotal = round2(listPrice * offer.quantity + baseShipping);
  return {
    quantity: offer.quantity,
    unit_price: round2(offer.unitPrice),
    base_total: baseTotal,
    bulk_discount: round2(Math.max(0, (agreedUnitPrice - offer.unitPrice) * offer.quantity)),
    shipping_cost: round2(offer.shippingCost),
    shipping_savings: shippingSavings,
    total_price: total,
    total_savings: round2(Math.max(0, listTotal - total)),
    effective_unit_price: round2(total / offer.quantity),
    discount_pct: Math.round(((listPrice - total / offer.quantity) / listPrice) * 100),
    rounds,
  };
}

/** Shipping the seller would charge by default — needed for savings maths. */
export function defaultShipping(listPrice: number): number {
  return round2(Math.min(1200, Math.max(199, listPrice * 0.02)));
}
