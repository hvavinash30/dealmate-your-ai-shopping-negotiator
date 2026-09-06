-- Adds support for caching live-searched products (from RapidAPI) alongside
-- the seed/demo products, so real-time results can be deduplicated on
-- re-fetch instead of creating endless duplicate rows.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS external_id text UNIQUE;
