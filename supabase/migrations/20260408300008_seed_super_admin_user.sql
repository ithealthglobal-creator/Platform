INSERT INTO public.profiles (id, email, display_name, role, company_id)
SELECT 'c0000000-0000-0000-0000-000000000000', 'admin@servolu.com', 'Servolu Admin', 'super_admin', '00000000-0000-0000-0000-000000000000'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = 'c0000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;
