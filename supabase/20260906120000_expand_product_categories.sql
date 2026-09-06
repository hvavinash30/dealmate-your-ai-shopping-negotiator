-- Expands the catalogue beyond Running Shoes / Earbuds so the Preference
-- Agent (which now accepts any category) has real products to match against.

INSERT INTO public.products (name, category, price, tags, image_url, stock_count) VALUES
('PulseFit Watch S2', 'Smartwatch', 7999.00, ARRAY['fitness','amoled display','7-day battery','heart rate'], 'https://picsum.photos/seed/pulsefit-watch/400/400', 20),
('AeroTrack GPS Pro', 'Smartwatch', 12499.00, ARRAY['gps','running','waterproof','long battery'], 'https://picsum.photos/seed/aerotrack-gps/400/400', 12),
('UrbanTrek Backpack 30L', 'Backpack', 2999.00, ARRAY['water resistant','laptop sleeve','daily commute'], 'https://picsum.photos/seed/urbantrek-backpack/400/400', 25),
('SummitPack Trail 45L', 'Backpack', 4599.00, ARRAY['hiking','durable','rain cover','large capacity'], 'https://picsum.photos/seed/summitpack-trail/400/400', 10),
('AeroBook Slim 14', 'Laptop', 54999.00, ARRAY['lightweight','16gb ram','long battery','ssd'], 'https://picsum.photos/seed/aerobook-slim/400/400', 8),
('CoreWork Pro 15', 'Laptop', 72999.00, ARRAY['performance','16gb ram','fast charging','ssd'], 'https://picsum.photos/seed/corework-pro/400/400', 6),
('ChefPro Nonstick Set', 'Kitchen Appliances', 3499.00, ARRAY['induction','5-piece','durable','easy clean'], 'https://picsum.photos/seed/chefpro-nonstick/400/400', 15),
('BrewMaster Coffee Maker', 'Kitchen Appliances', 4299.00, ARRAY['auto brew','compact','easy clean'], 'https://picsum.photos/seed/brewmaster-coffee/400/400', 14),
('LumeCraft Sunglasses', 'Sunglasses', 1499.00, ARRAY['uv protection','lightweight','polarized'], 'https://picsum.photos/seed/lumecraft-sunglasses/400/400', 30),
('DriftView Aviators', 'Sunglasses', 1899.00, ARRAY['uv protection','classic','polarized'], 'https://picsum.photos/seed/driftview-aviators/400/400', 22);
