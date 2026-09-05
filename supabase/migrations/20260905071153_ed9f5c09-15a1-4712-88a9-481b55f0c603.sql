
CREATE TYPE public.app_role AS ENUM ('admin', 'seller', 'user');
CREATE TYPE public.session_stage AS ENUM ('preferences', 'matching', 'negotiating', 'ordered');
CREATE TYPE public.order_status AS ENUM ('placed', 'confirmed', 'cancelled');
CREATE TYPE public.message_role AS ENUM ('user', 'agent', 'system');
CREATE TYPE public.agent_kind AS ENUM ('preference', 'deal_hunter', 'negotiation');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  tags text[] NOT NULL DEFAULT '{}',
  image_url text NOT NULL,
  stock_count integer NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON public.products (category);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products readable" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "sellers manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.live_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  discount_pct numeric(5,2) NOT NULL CHECK (discount_pct > 0 AND discount_pct <= 40),
  expires_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_offers_product_idx ON public.live_offers (product_id);
GRANT SELECT ON public.live_offers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.live_offers TO authenticated;
GRANT ALL ON public.live_offers TO service_role;
ALTER TABLE public.live_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers readable" ON public.live_offers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "sellers manage offers" ON public.live_offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.negotiation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text,
  budget_min numeric(10,2),
  budget_max numeric(10,2),
  preferences text[] NOT NULL DEFAULT '{}',
  stage public.session_stage NOT NULL DEFAULT 'preferences',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  final_price numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX negotiation_sessions_user_idx ON public.negotiation_sessions (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.negotiation_sessions TO authenticated;
GRANT ALL ON public.negotiation_sessions TO service_role;
ALTER TABLE public.negotiation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.negotiation_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.negotiation_sessions(id) ON DELETE CASCADE,
  role public.message_role NOT NULL,
  agent public.agent_kind,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversation_messages_session_idx ON public.conversation_messages (session_id, created_at);
GRANT SELECT, INSERT ON public.conversation_messages TO authenticated;
GRANT ALL ON public.conversation_messages TO service_role;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.conversation_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.negotiation_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "insert own messages" ON public.conversation_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.negotiation_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 10),
  negotiated_price numeric(10,2) NOT NULL CHECK (negotiated_price > 0),
  delivery_address text NOT NULL,
  status public.order_status NOT NULL DEFAULT 'placed',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_idx ON public.orders (user_id, created_at DESC);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sellers read orders" ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.place_order(
  _user_id uuid,
  _product_id uuid,
  _quantity integer,
  _negotiated_price numeric,
  _delivery_address text
) RETURNS public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _product public.products;
  _floor numeric;
  _order public.orders;
BEGIN
  IF _quantity < 1 OR _quantity > 10 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  SELECT * INTO _product FROM public.products WHERE id = _product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  _floor := round(_product.price * (CASE WHEN _quantity >= 2 THEN 0.80 ELSE 0.85 END), 2);
  IF _negotiated_price < _floor - 0.01 OR _negotiated_price > _product.price THEN
    RAISE EXCEPTION 'PRICE_OUT_OF_BOUNDS';
  END IF;

  IF _product.stock_count < _quantity THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK';
  END IF;

  UPDATE public.products SET stock_count = stock_count - _quantity WHERE id = _product_id;

  INSERT INTO public.orders (user_id, product_id, quantity, negotiated_price, delivery_address)
  VALUES (_user_id, _product_id, _quantity, _negotiated_price, _delivery_address)
  RETURNING * INTO _order;

  RETURN _order;
END;
$$;
REVOKE ALL ON FUNCTION public.place_order(uuid, uuid, integer, numeric, text) FROM public;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, uuid, integer, numeric, text) TO service_role;

ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.live_offers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_offers;
