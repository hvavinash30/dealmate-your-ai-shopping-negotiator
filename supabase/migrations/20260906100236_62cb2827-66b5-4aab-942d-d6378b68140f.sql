CREATE TABLE public.seller_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX seller_access_codes_user_idx ON public.seller_access_codes (user_id, created_at DESC);

GRANT ALL ON public.seller_access_codes TO service_role;

ALTER TABLE public.seller_access_codes ENABLE ROW LEVEL SECURITY;