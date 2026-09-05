
REVOKE EXECUTE ON FUNCTION public.place_order(uuid, uuid, integer, numeric, text) FROM anon, authenticated;

INSERT INTO public.products (name, category, price, tags, image_url, stock_count) VALUES
('Stride Cloud Racer', 'Running Shoes', 4999.00, ARRAY['lightweight','breathable','race day','comfort'], '/__l5e/assets-v1/591a029a-7232-44f4-a608-5d9da5a89646/shoe1.jpg', 14),
('Terra Grip Trail 2', 'Running Shoes', 5799.00, ARRAY['durability','grip','trail','cushioned'], '/__l5e/assets-v1/f215f980-4e4f-4dd6-930d-0b05be966745/shoe2.jpg', 9),
('Meridian Daily Trainer', 'Running Shoes', 3899.00, ARRAY['comfort','cushioned','daily miles'], '/__l5e/assets-v1/73b1f5e3-95cb-4513-929d-c6c29b05b7eb/shoe3.jpg', 21),
('Ember Stability Run', 'Running Shoes', 4499.00, ARRAY['support','comfort','stability','breathable'], '/__l5e/assets-v1/332381ed-f960-4bc7-9750-ca6990cfeeb2/shoe4.jpg', 6),
('Nocturne Pro Buds', 'Earbuds', 2999.00, ARRAY['battery life','noise cancelling','clear mic'], '/__l5e/assets-v1/9d7b3ae8-ba54-4613-9ed2-d9b4de15f35d/buds1.jpg', 18),
('Lumen Air Buds', 'Earbuds', 2299.00, ARRAY['lightweight','battery life','comfort'], '/__l5e/assets-v1/e665afe6-d439-4fb5-aee9-fcd2da184167/buds2.jpg', 25),
('Vertex Latency Zero', 'Earbuds', 3499.00, ARRAY['low latency','gaming','clear mic','battery life'], '/__l5e/assets-v1/ac7f3942-38c2-4544-84a7-29a5d6c1ff58/buds3.jpg', 11),
('Sage Sport Buds', 'Earbuds', 1899.00, ARRAY['sweatproof','secure fit','lightweight','battery life'], '/__l5e/assets-v1/4896494e-630b-4e56-9adf-197d4fe7aa75/buds4.jpg', 30);

INSERT INTO public.live_offers (product_id, discount_pct, expires_at, active)
SELECT id, 8.00, now() + interval '45 minutes', true FROM public.products WHERE name = 'Stride Cloud Racer';
INSERT INTO public.live_offers (product_id, discount_pct, expires_at, active)
SELECT id, 12.00, now() + interval '20 minutes', true FROM public.products WHERE name = 'Vertex Latency Zero';
INSERT INTO public.live_offers (product_id, discount_pct, expires_at, active)
SELECT id, 6.00, now() + interval '2 hours', true FROM public.products WHERE name = 'Meridian Daily Trainer';
