CREATE TABLE public.quantity_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.negotiation_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'best_overall',
  min_quantity integer NOT NULL DEFAULT 1,
  max_quantity integer NOT NULL DEFAULT 10,
  preferred_quantity integer NOT NULL DEFAULT 1,
  max_total_budget numeric,
  agreed_unit_price numeric NOT NULL,
  list_price numeric NOT NULL,
  state text NOT NULL DEFAULT 'price_accepted',
  round integer NOT NULL DEFAULT 0,
  rounds jsonb NOT NULL DEFAULT '[]'::jsonb,
  final_deal jsonb,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '2 hours'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quantity_negotiations TO authenticated;
GRANT ALL ON public.quantity_negotiations TO service_role;

ALTER TABLE public.quantity_negotiations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own quantity negotiations"
ON public.quantity_negotiations
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_quantity_negotiations_updated_at
BEFORE UPDATE ON public.quantity_negotiations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX quantity_negotiations_session_idx ON public.quantity_negotiations (session_id);