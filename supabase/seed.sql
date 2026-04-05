-- IThealth company
INSERT INTO public.companies (id, name, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'IThealth', true)
ON CONFLICT (id) DO NOTHING;

-- Phase seed data
INSERT INTO public.phases (name, description, sort_order) VALUES
  ('Operate', 'Keep IT running day-to-day', 1),
  ('Secure', 'Protect against threats and compliance risks', 2),
  ('Streamline', 'Optimise processes and reduce waste', 3),
  ('Accelerate', 'Drive growth through technology innovation', 4)
ON CONFLICT (name) DO NOTHING;

-- L1 Menu Items (Sidebar)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('10000000-0000-0000-0000-000000000001', NULL, 'Dashboard', 'dashboard', '/dashboard', 1, 1),
  ('10000000-0000-0000-0000-000000000002', NULL, 'Growth', 'growth', '/growth', 2, 1),
  ('10000000-0000-0000-0000-000000000003', NULL, 'Sales', 'currency', '/sales', 3, 1),
  ('10000000-0000-0000-0000-000000000004', NULL, 'Services', 'tool-kit', '/services', 4, 1),
  ('10000000-0000-0000-0000-000000000005', NULL, 'Delivery', 'delivery', '/delivery', 5, 1),
  ('10000000-0000-0000-0000-000000000006', NULL, 'Academy', 'education', '/academy', 6, 1),
  ('10000000-0000-0000-0000-000000000007', NULL, 'People', 'user-multiple', '/people', 7, 1),
  ('10000000-0000-0000-0000-000000000008', NULL, 'Settings', 'settings', '/settings', 8, 1)
ON CONFLICT (id) DO NOTHING;

-- L2: Dashboard
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Overview', NULL, '/dashboard', 1, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Growth
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000105', '10000000-0000-0000-0000-000000000002', 'Market', NULL, '/growth/market', 1, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Sales
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Deals', NULL, '/sales/deals', 1, 2),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'Proposals', NULL, '/sales/proposals', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Services
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000004', 'Services', NULL, '/services', 1, 2),
  ('20000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000004', 'Phases', NULL, '/services/phases', 2, 2),
  ('20000000-0000-0000-0000-000000000103', '10000000-0000-0000-0000-000000000004', 'Products', NULL, '/services/products', 3, 2),
  ('20000000-0000-0000-0000-000000000104', '10000000-0000-0000-0000-000000000004', 'Cost Variables', NULL, '/services/cost-variables', 4, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Delivery
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000005', 'Projects', NULL, '/delivery/projects', 1, 2),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000005', 'Tickets', NULL, '/delivery/tickets', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Academy
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000006', 'Courses', NULL, '/academy/courses', 1, 2),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000006', 'Certifications', NULL, '/academy/certifications', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: People
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000007', 'Companies', NULL, '/people/companies', 1, 2),
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000007', 'Users', NULL, '/people/users', 2, 2),
  ('20000000-0000-0000-0000-000000000106', '10000000-0000-0000-0000-000000000007', 'Skills', NULL, '/people/skills', 3, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Settings
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000008', 'General', NULL, '/settings/general', 1, 2),
  ('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000008', 'Menu Editor', NULL, '/settings/menu-editor', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- L3: Growth > Market
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000105', 'Verticals', NULL, '/growth/market/verticals', 1, 3),
  ('30000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000105', 'Personas', NULL, '/growth/market/personas', 2, 3),
  ('30000000-0000-0000-0000-000000000103', '20000000-0000-0000-0000-000000000105', 'Pains', NULL, '/growth/market/pains', 3, 3),
  ('30000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000105', 'Gains', NULL, '/growth/market/gains', 4, 3)
ON CONFLICT (id) DO NOTHING;

-- Grant admin access to all menu items
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items
ON CONFLICT (role, menu_item_id) DO NOTHING;

-- Blog post seed data
INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_image_url, category, status, published_at) VALUES
  ('The Complete Guide to IT Modernisation for SMBs', 'complete-guide-it-modernisation-smbs', 'Everything you need to know about transforming your IT infrastructure, from assessment to acceleration.', '<h2>Why Modernise?</h2><p>In today''s rapidly evolving digital landscape, outdated IT infrastructure isn''t just inconvenient—it''s a business risk. Modern IT modernisation is about more than upgrading hardware; it''s about transforming how your business operates, competes, and grows.</p><h2>The Four Phases</h2><p>IThealth''s modernisation journey follows four proven phases: Operate, Secure, Streamline, and Accelerate. Each phase builds on the last, creating a solid foundation for digital maturity.</p>', NULL, 'Strategy', 'published', now()),
  ('Why SMBs Need Zero Trust Security in 2026', 'smbs-zero-trust-security-2026', 'The threat landscape has changed dramatically. Here''s how Zero Trust architecture can protect your business.', '<h2>The Evolving Threat Landscape</h2><p>Cyber threats targeting small and medium businesses have increased by 300% in the last three years. Traditional perimeter-based security is no longer sufficient.</p><h2>What is Zero Trust?</h2><p>Zero Trust operates on a simple principle: never trust, always verify. Every user, device, and connection is authenticated and authorised before access is granted.</p>', NULL, 'Security', 'published', now()),
  ('Cloud Migration: A Step-by-Step Guide for SMBs', 'cloud-migration-step-by-step-guide', 'Moving to the cloud doesn''t have to be overwhelming. Follow our structured approach to a successful migration.', '<h2>Planning Your Migration</h2><p>A successful cloud migration starts with understanding what you have, what you need, and where you want to go. Start with an inventory of your current infrastructure.</p><h2>Choosing the Right Model</h2><p>Public cloud, private cloud, or hybrid? The right choice depends on your compliance requirements, budget, and growth plans.</p>', NULL, 'Cloud', 'published', now()),
  ('5 Signs Your IT Infrastructure Needs Modernising', 'five-signs-it-needs-modernising', 'Outdated infrastructure costs more than you think. Watch for these warning signs.', '<h2>1. Frequent Downtime</h2><p>If your team regularly experiences outages or slowdowns, your infrastructure is telling you something. Modern businesses can''t afford unreliable IT.</p><h2>2. Rising Costs</h2><p>Legacy systems often cost more to maintain than to replace. If your IT budget keeps growing without improved outcomes, it''s time to modernise.</p>', NULL, 'Operations', 'published', now())
ON CONFLICT DO NOTHING;

-- Testimonial seed data
INSERT INTO public.testimonials (name, company, role, quote, sort_order) VALUES
  ('Sarah Chen', 'TechFlow Ltd', 'CTO', 'IThealth transformed our IT infrastructure. We went from constant firefighting to proactive management. Their modernisation journey gave us a clear path forward.', 1),
  ('James Wright', 'Wright & Co Attorneys', 'Managing Partner', 'The modernisation journey framework gave us a clear roadmap. Best IT decision we''ve made. Our team is more productive and our data is finally secure.', 2),
  ('Maria Santos', 'Santos Financial Advisory', 'Managing Director', 'Professional, responsive, and they actually understand small business IT needs. IThealth doesn''t just fix problems—they prevent them.', 3)
ON CONFLICT DO NOTHING;

-- Partner seed data
INSERT INTO public.partners (name, description, website, sort_order) VALUES
  ('Microsoft', 'Cloud and productivity solutions', 'https://microsoft.com', 1),
  ('Datto', 'Business continuity and disaster recovery', 'https://datto.com', 2),
  ('SentinelOne', 'AI-powered endpoint security', 'https://sentinelone.com', 3),
  ('ConnectWise', 'IT management and automation platform', 'https://connectwise.com', 4)
ON CONFLICT DO NOTHING;

-- Menu additions for seed (matching migration IDs)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000201', '10000000-0000-0000-0000-000000000002', 'Content', NULL, '/growth/content', 2, 2),
  ('30000000-0000-0000-0000-000000000201', '20000000-0000-0000-0000-000000000201', 'Blog', NULL, '/growth/content/blog', 1, 3),
  ('30000000-0000-0000-0000-000000000202', '20000000-0000-0000-0000-000000000105', 'Testimonials', NULL, '/growth/market/testimonials', 5, 3),
  ('20000000-0000-0000-0000-000000000202', '10000000-0000-0000-0000-000000000007', 'Partners', NULL, '/people/partners', 4, 2)
ON CONFLICT (id) DO NOTHING;

-- Grant admin access to new menu items (Content, Blog, Testimonials, Partners)
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items
WHERE id IN (
  '20000000-0000-0000-0000-000000000201',
  '30000000-0000-0000-0000-000000000201',
  '30000000-0000-0000-0000-000000000202',
  '20000000-0000-0000-0000-000000000202'
)
ON CONFLICT (role, menu_item_id) DO NOTHING;
