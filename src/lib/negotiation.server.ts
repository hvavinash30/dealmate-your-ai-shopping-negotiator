/**
 * Seller negotiation boundaries.
 *
 * These limits are the seller's authority and are NEVER sent to the browser.
 * Every negotiated price the app stores or charges passes through `clampPrice`,
 * and the database routine `place_order` re-checks the same floor independently.
 */

const MAX_SINGLE_ITEM_DISCOUNT = 0.15;
const MAX_BUNDLE_DISCOUNT = 0.2;
const BUNDLE_MIN_ITEMS = 2;

export function priceFloor(listPrice: number, quantity = 1): number {
  const maxDiscount =
    quantity >= BUNDLE_MIN_ITEMS ? MAX_BUNDLE_DISCOUNT : MAX_SINGLE_ITEM_DISCOUNT;
  return round2(listPrice * (1 - maxDiscount));
}

export interface ClampResult {
  price: number;
  atFloor: boolean;
  /** True when the shopper's ask was fully honoured. */
  honoured: boolean;
}

/** Bounds any proposed price between the seller floor and the list price. */
export function clampPrice(listPrice: number, proposed: number, quantity = 1): ClampResult {
  const floor = priceFloor(listPrice, quantity);
  const bounded = round2(Math.min(Math.max(proposed, floor), listPrice));
  return {
    price: bounded,
    atFloor: bounded <= floor + 0.01,
    honoured: bounded <= round2(proposed) + 0.01,
  };
}

/**
 * The opening offer DealMate makes on its own initiative: a real but not
 * maximal concession, leaving headroom for the shopper to push back.
 */
export function openingOffer(listPrice: number, hasLiveOffer: boolean): number {
  const concession = hasLiveOffer ? 0.12 : 0.09;
  return round2(listPrice * (1 - concession));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
