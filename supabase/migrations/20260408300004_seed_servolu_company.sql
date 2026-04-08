INSERT INTO public.companies (id, name, type, status, domain, tagline, support_email, contact_email, slug)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Servolu', 'platform', 'active', 'servolu.com',
  'Managed Services Marketplace', 'support@servolu.com', 'hello@servolu.com', 'servolu'
) ON CONFLICT (id) DO NOTHING;

UPDATE public.companies SET
  parent_company_id = '00000000-0000-0000-0000-000000000000',
  domain = 'ithealth.ai', tagline = 'Your IT Modernisation Champion',
  support_email = 'support@ithealth.ai', contact_email = 'hello@ithealth.ai', slug = 'ithealth'
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE public.companies SET parent_company_id = '00000000-0000-0000-0000-000000000001' WHERE type = 'customer' AND parent_company_id IS NULL;
UPDATE public.companies SET parent_company_id = '00000000-0000-0000-0000-000000000001' WHERE type = 'partner' AND parent_company_id IS NULL;
