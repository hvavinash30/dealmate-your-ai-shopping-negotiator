-- Stage-2 negotiation (quantity, bulk discount, shipping, max-quantity-within-
-- budget, best-overall) runs entirely through src/lib/bulk-negotiation.server.ts.
-- This only stores that engine's PUBLIC output — history, round, state, best
-- offer — so a session can reload mid-negotiation. Seller floors/bulk tiers
-- and the buyer's walk-away limit never leave that server module.
ALTER TABLE public.negotiation_sessions
  ADD COLUMN IF NOT EXISTS quantity_negotiation jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.negotiation_sessions
  ADD COLUMN IF NOT EXISTS final_deal jsonb;

COMMENT ON COLUMN public.negotiation_sessions.quantity_negotiation IS
  'Serialized QuantityDealState (mode, round, state, history, bestOffer, projectedDeal). No private seller/buyer limits.';
COMMENT ON COLUMN public.negotiation_sessions.final_deal IS
  'Serialized FinalDeal once the shopper accepts the stage-2 deal.';
