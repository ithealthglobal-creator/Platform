INSERT INTO public.marketplace_listings (company_id, description, is_featured, is_active, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Your IT Modernisation Champion. We guide businesses through their IT modernisation journey, making complex technology simple, accessible, and secure.',
  true, true, 1
) ON CONFLICT (company_id) DO NOTHING;
