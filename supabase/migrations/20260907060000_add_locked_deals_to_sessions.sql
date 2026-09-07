-- Allows a single conversation to negotiate more than one category/product.
-- Instead of a hard schema rework (separate deals table), we keep the
-- existing single "active" category/product/final_price columns for
-- whatever is being negotiated RIGHT NOW, and add `locked_deals` to hold
-- every item the shopper already finished negotiating earlier in the SAME
-- session, so nothing is lost when they pivot to a new category.
ALTER TABLE public.negotiation_sessions
  ADD COLUMN IF NOT EXISTS locked_deals jsonb NOT NULL DEFAULT '[]'::jsonb;
