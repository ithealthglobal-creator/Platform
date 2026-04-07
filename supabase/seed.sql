-- =============================================================================
-- IThealth.ai — Comprehensive Seed Data
-- =============================================================================
-- Run via: npx supabase db reset (applies migrations then seed)
-- Order: respects foreign key dependencies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. COMPANIES
-- ---------------------------------------------------------------------------
INSERT INTO public.companies (id, name, type, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'IThealth', 'admin', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'Acme Solutions Ltd', 'customer', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'Bright Spark Consulting', 'customer', 'prospect'),
  ('00000000-0000-0000-0000-000000000004', 'Meridian Legal', 'customer', 'active'),
  ('00000000-0000-0000-0000-000000000005', 'Pinnacle Financial Group', 'customer', 'prospect'),
  ('00000000-0000-0000-0000-000000000006', 'CloudWave Partners', 'partner', 'approved'),
  ('00000000-0000-0000-0000-000000000007', 'SecureNet MSP', 'partner', 'approved'),
  ('00000000-0000-0000-0000-000000000008', 'TechBridge Solutions', 'partner', 'pending')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. PHASES
-- ---------------------------------------------------------------------------
INSERT INTO public.phases (id, name, description, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Operate', 'Keep IT running day-to-day with reliable, well-managed infrastructure. Focus on uptime, monitoring, patching, and helpdesk.', 1),
  ('a0000000-0000-0000-0000-000000000002', 'Secure', 'Protect your organisation against threats and compliance risks. Implement zero trust, endpoint protection, and security awareness training.', 2),
  ('a0000000-0000-0000-0000-000000000003', 'Streamline', 'Optimise processes and reduce waste through automation, cloud migration, and modern collaboration tools.', 3),
  ('a0000000-0000-0000-0000-000000000004', 'Accelerate', 'Drive growth through technology innovation — AI, analytics, and digital transformation initiatives.', 4)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. MENU ITEMS (Admin L1-L3 + Customer L1)
-- ---------------------------------------------------------------------------
-- L1: Admin sidebar
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
  ('20000000-0000-0000-0000-000000000105', '10000000-0000-0000-0000-000000000002', 'Market', NULL, '/growth/market', 1, 2),
  ('20000000-0000-0000-0000-000000000201', '10000000-0000-0000-0000-000000000002', 'Content', NULL, '/growth/content', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Sales
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Pipeline', NULL, '/sales', 1, 2)
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
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000006', 'Assessments', NULL, '/academy/assessments', 2, 2),
  ('20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000006', 'Certificates', NULL, '/academy/certificates', 3, 2)
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
  ('30000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000105', 'Gains', NULL, '/growth/market/gains', 4, 3),
  ('30000000-0000-0000-0000-000000000202', '20000000-0000-0000-0000-000000000105', 'Testimonials', NULL, '/growth/market/testimonials', 5, 3)
ON CONFLICT (id) DO NOTHING;

-- L3: Growth > Content
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000201', '20000000-0000-0000-0000-000000000201', 'Blog', NULL, '/growth/content/blog', 1, 3)
ON CONFLICT (id) DO NOTHING;

-- Customer L1 menu items
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('c0000000-0000-0000-0000-000000000001', NULL, 'Home', 'home', '/portal/home', 1, 1),
  ('c0000000-0000-0000-0000-000000000002', NULL, 'Journey', 'roadmap', '/portal/journey', 2, 1),
  ('c0000000-0000-0000-0000-000000000003', NULL, 'Academy', 'education', '/portal/academy', 3, 1),
  ('c0000000-0000-0000-0000-000000000004', NULL, 'Services', 'tool-kit', '/portal/services', 4, 1),
  ('c0000000-0000-0000-0000-000000000005', NULL, 'Team', 'user-multiple', '/portal/team', 5, 1),
  ('c0000000-0000-0000-0000-000000000006', NULL, 'Support', 'help', '/portal/support', 6, 1),
  ('c0000000-0000-0000-0000-000000000007', NULL, 'Settings', 'settings', '/portal/settings', 7, 1)
ON CONFLICT (id) DO NOTHING;

-- Grant admin access to all admin menu items
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items WHERE id::text NOT LIKE 'c0000000%'
ON CONFLICT (role, menu_item_id) DO NOTHING;

-- Grant customer access to customer menu items
INSERT INTO public.role_menu_access (role, menu_item_id) VALUES
  ('customer', 'c0000000-0000-0000-0000-000000000001'),
  ('customer', 'c0000000-0000-0000-0000-000000000002'),
  ('customer', 'c0000000-0000-0000-0000-000000000003'),
  ('customer', 'c0000000-0000-0000-0000-000000000004'),
  ('customer', 'c0000000-0000-0000-0000-000000000005'),
  ('customer', 'c0000000-0000-0000-0000-000000000006'),
  ('customer', 'c0000000-0000-0000-0000-000000000007')
ON CONFLICT (role, menu_item_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. VERTICALS (target industries)
-- ---------------------------------------------------------------------------
INSERT INTO public.verticals (name, description) VALUES
  ('Legal', 'Law firms and legal practices requiring secure document management, compliance, and client data protection.'),
  ('Financial Services', 'Accounting firms, financial advisors, and wealth management companies with strict regulatory requirements.'),
  ('Healthcare', 'Medical practices, dental clinics, and allied health providers needing HIPAA-style compliance and patient data security.'),
  ('Professional Services', 'Consulting firms, engineering practices, and professional service companies relying on collaboration and project management.'),
  ('Construction', 'Builders, contractors, and construction companies needing mobile-first IT, project tracking, and field connectivity.'),
  ('Manufacturing', 'Production facilities requiring OT/IT convergence, supply chain management, and process automation.'),
  ('Retail', 'Brick-and-mortar and e-commerce businesses needing POS integration, inventory management, and customer analytics.'),
  ('Education', 'Schools, training organisations, and educational institutions requiring student data protection and learning platforms.'),
  ('Not-for-Profit', 'Charities and NGOs needing cost-effective IT with strong donor data protection and grant compliance.')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. PERSONAS (buyer personas)
-- ---------------------------------------------------------------------------
INSERT INTO public.personas (name, description) VALUES
  ('Business Owner', 'Small business owner wearing multiple hats, focused on growth and keeping costs manageable. Wants IT to "just work."'),
  ('IT Manager', 'Internal IT lead managing a small team. Overwhelmed by vendor sprawl, security threats, and legacy systems.'),
  ('CFO / Finance Director', 'Focused on ROI, TCO, and predictable IT spending. Needs clear cost-benefit analysis for any IT investment.'),
  ('Operations Manager', 'Responsible for day-to-day efficiency. Wants automation, fewer manual processes, and reliable systems.'),
  ('Compliance Officer', 'Ensures regulatory adherence (GDPR, ISO 27001, Cyber Essentials). Needs audit trails and policy enforcement.'),
  ('Managing Partner', 'Senior partner at a professional firm. Cares about client confidentiality, reputation, and competitive advantage.')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. PAINS (customer pain points)
-- ---------------------------------------------------------------------------
INSERT INTO public.pains (name, description) VALUES
  ('Frequent downtime', 'Regular outages disrupting business operations, frustrating staff and losing revenue.'),
  ('Rising IT costs', 'IT budget growing year-on-year without corresponding improvements in capability or reliability.'),
  ('Security anxiety', 'Constant worry about ransomware, phishing, and data breaches with no confidence in current defences.'),
  ('Vendor sprawl', 'Too many IT vendors to manage — no single pane of glass, finger-pointing when things go wrong.'),
  ('Slow response times', 'Helpdesk tickets taking days to resolve, staff productivity suffering while waiting for fixes.'),
  ('Compliance gaps', 'Failing audits or unable to demonstrate compliance with industry regulations like GDPR or Cyber Essentials.'),
  ('No IT strategy', 'Reactive firefighting with no roadmap for technology improvement or digital transformation.'),
  ('Shadow IT', 'Employees using unapproved tools and services because official IT can''t keep up with their needs.'),
  ('Data silos', 'Information trapped in disconnected systems — no unified view of customers, projects, or operations.'),
  ('Ageing infrastructure', 'Running on end-of-life hardware and software that''s expensive to maintain and impossible to secure.')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. GAINS (desired outcomes)
-- ---------------------------------------------------------------------------
INSERT INTO public.gains (name, description) VALUES
  ('Predictable IT costs', 'Fixed monthly spend with no surprise bills. Clear understanding of what they''re paying for.'),
  ('Peace of mind', 'Confidence that systems are secure, monitored 24/7, and backed up properly.'),
  ('Improved productivity', 'Staff spend less time fighting IT issues and more time on revenue-generating work.'),
  ('Strategic IT roadmap', 'A clear plan for technology investment that aligns with business goals and growth targets.'),
  ('Single point of contact', 'One trusted partner for all IT needs instead of juggling multiple vendors.'),
  ('Compliance confidence', 'Ready for audits at any time with documented policies, controls, and evidence.'),
  ('Competitive advantage', 'Using technology to outperform competitors — faster service, better insights, lower costs.'),
  ('Scalable infrastructure', 'IT that grows with the business without painful migration projects every few years.'),
  ('Business continuity', 'Knowing that if disaster strikes, the business can recover quickly with minimal data loss.'),
  ('Empowered employees', 'Staff have the right tools and training to work efficiently from anywhere.')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. SKILLS (required technical skills)
-- ---------------------------------------------------------------------------
INSERT INTO public.skills (name, description, category) VALUES
  ('Microsoft 365 Administration', 'Managing Exchange, SharePoint, Teams, and Entra ID (Azure AD) for SMB environments.', 'Cloud'),
  ('Windows Server Management', 'Active Directory, Group Policy, DNS, DHCP, and Windows Server maintenance.', 'Infrastructure'),
  ('Network Administration', 'Firewalls, switches, VLANs, VPNs, and Wi-Fi — Cisco Meraki, Fortinet, UniFi.', 'Infrastructure'),
  ('Endpoint Security', 'EDR deployment, antivirus management, and device hardening. SentinelOne, Defender, CrowdStrike.', 'Security'),
  ('Backup & Recovery', 'Implementing and testing backup solutions — Datto, Veeam, Azure Backup. RTO/RPO planning.', 'Infrastructure'),
  ('Cloud Migration', 'Moving workloads from on-premises to Azure/AWS. Server assessment, migration planning, cutover.', 'Cloud'),
  ('Security Awareness Training', 'Running phishing simulations and user training programmes. KnowBe4, Proofpoint.', 'Security'),
  ('RMM Tooling', 'Remote monitoring and management — Datto RMM, ConnectWise Automate, NinjaRMM.', 'Operations'),
  ('PSA / Ticketing', 'Professional services automation — ConnectWise Manage, Autotask, HaloPSA.', 'Operations'),
  ('PowerShell / Automation', 'Scripting for automation of repetitive tasks, user provisioning, and reporting.', 'Development'),
  ('Compliance Frameworks', 'Implementing Cyber Essentials, ISO 27001, NIST CSF, and GDPR controls.', 'Governance'),
  ('Azure Administration', 'Managing Azure VMs, networking, storage, and identity. AZ-104 level competency.', 'Cloud'),
  ('Documentation & SOPs', 'Creating and maintaining IT documentation, runbooks, and standard operating procedures.', 'Operations'),
  ('VoIP / Unified Comms', 'Deploying and managing Teams Phone, 3CX, or RingCentral voice solutions.', 'Infrastructure'),
  ('Data Analytics', 'Power BI, reporting dashboards, and data-driven decision-making for SMBs.', 'Development')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. PRODUCTS (vendor products)
-- ---------------------------------------------------------------------------
INSERT INTO public.products (name, description, vendor, category, licensing_model, cost) VALUES
  ('Microsoft 365 Business Premium', 'Complete productivity and security suite — Exchange, Teams, SharePoint, Defender, Intune.', 'Microsoft', 'Productivity', 'per_user', 19.70),
  ('Microsoft Entra ID P1', 'Cloud identity with conditional access, MFA, and SSO.', 'Microsoft', 'Identity', 'per_user', 5.40),
  ('Azure Virtual Desktop', 'Cloud-hosted virtual desktops for remote and hybrid workers.', 'Microsoft', 'Cloud', 'per_user', 12.00),
  ('SentinelOne Singularity', 'AI-powered endpoint detection and response (EDR) platform.', 'SentinelOne', 'Security', 'per_device', 6.50),
  ('Datto RMM', 'Remote monitoring and management for endpoints and servers.', 'Datto', 'Operations', 'per_device', 3.50),
  ('Datto SIRIS', 'Business continuity and disaster recovery — image-based backup with instant virtualisation.', 'Datto', 'Backup', 'per_device', 18.00),
  ('ConnectWise Manage', 'Professional services automation — ticketing, billing, project management.', 'ConnectWise', 'Operations', 'per_user', 45.00),
  ('KnowBe4', 'Security awareness training and phishing simulation platform.', 'KnowBe4', 'Security', 'per_user', 2.50),
  ('Fortinet FortiGate', 'Next-generation firewall with SD-WAN, IPS, and web filtering.', 'Fortinet', 'Network', 'flat_fee', 1200.00),
  ('Cisco Meraki MR', 'Cloud-managed enterprise Wi-Fi access points.', 'Cisco', 'Network', 'per_device', 25.00),
  ('IT Glue', 'IT documentation platform for passwords, configurations, and SOPs.', 'Kaseya', 'Operations', 'per_user', 29.00),
  ('HaloPSA', 'Modern PSA with integrated ITSM, project management, and billing.', 'Halo', 'Operations', 'per_user', 35.00),
  ('Veeam Backup', 'Backup and recovery for cloud, virtual, and physical workloads.', 'Veeam', 'Backup', 'per_device', 8.00),
  ('Power BI Pro', 'Business intelligence and interactive data visualisation.', 'Microsoft', 'Analytics', 'per_user', 8.40),
  ('Teams Phone Standard', 'Cloud-based phone system integrated with Microsoft Teams.', 'Microsoft', 'Communications', 'per_user', 6.80)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10. COST VARIABLES (for service costing formulas)
-- ---------------------------------------------------------------------------
INSERT INTO public.cost_variables (name, description, unit_label) VALUES
  ('Number of Users', 'Total user count for per-user licensing', 'users'),
  ('Number of Devices', 'Total managed endpoints (desktops, laptops, tablets)', 'devices'),
  ('Number of Servers', 'Physical and virtual servers under management', 'servers'),
  ('Number of Sites', 'Office locations or branch sites', 'sites'),
  ('Data Volume (TB)', 'Total data under backup or migration in terabytes', 'TB'),
  ('Number of Mailboxes', 'Email accounts to migrate or manage', 'mailboxes'),
  ('Number of Applications', 'Line-of-business applications to support or integrate', 'apps'),
  ('Monthly Hours', 'Contracted support hours per month', 'hours')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11. SERVICES (IT services by phase)
-- ---------------------------------------------------------------------------
INSERT INTO public.services (id, name, description, long_description, phase_id, status) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Managed IT Support',
   'Proactive monitoring, helpdesk, and day-to-day IT management.',
   'Our Managed IT Support service provides your business with a dedicated team of engineers who monitor, maintain, and support your entire IT environment. Includes 24/7 monitoring, ticketed helpdesk support, patch management, and regular health checks. We become your outsourced IT department.',
   'a0000000-0000-0000-0000-000000000001', 'active'),

  ('b0000000-0000-0000-0000-000000000002', 'Backup & Disaster Recovery',
   'Automated backups with tested recovery and business continuity planning.',
   'Protect your business data with automated, image-based backups that can be restored in minutes — not days. We test your backups regularly and maintain a documented disaster recovery plan so you know exactly what happens when things go wrong.',
   'a0000000-0000-0000-0000-000000000001', 'active'),

  ('b0000000-0000-0000-0000-000000000003', 'Cyber Security Essentials',
   'Endpoint protection, email security, and security awareness training.',
   'A foundational security package that covers the basics every SMB needs: next-gen endpoint protection (EDR), email threat filtering, multi-factor authentication, and monthly phishing simulations with staff training.',
   'a0000000-0000-0000-0000-000000000002', 'active'),

  ('b0000000-0000-0000-0000-000000000004', 'Compliance & Governance',
   'Cyber Essentials certification, policy frameworks, and audit readiness.',
   'We help you achieve and maintain Cyber Essentials (or CE Plus) certification, implement documented IT policies, and prepare for compliance audits. Includes gap analysis, remediation planning, and annual recertification support.',
   'a0000000-0000-0000-0000-000000000002', 'active'),

  ('b0000000-0000-0000-0000-000000000005', 'Cloud Migration',
   'Move workloads to Microsoft Azure or Microsoft 365 with minimal disruption.',
   'We assess your current infrastructure, design a cloud architecture, and execute a phased migration with rollback plans at every stage. Covers server migration to Azure, email migration to Exchange Online, and file migration to SharePoint/OneDrive.',
   'a0000000-0000-0000-0000-000000000003', 'active'),

  ('b0000000-0000-0000-0000-000000000006', 'Process Automation',
   'Automate repetitive tasks with Power Automate, scripting, and workflow design.',
   'Identify manual, repetitive processes across your business and replace them with automated workflows. We use Power Automate, PowerShell, and custom integrations to eliminate human error and free up your team''s time.',
   'a0000000-0000-0000-0000-000000000003', 'active'),

  ('b0000000-0000-0000-0000-000000000007', 'AI & Analytics',
   'Business intelligence dashboards and AI-powered insights using Microsoft Copilot and Power BI.',
   'Unlock the value in your data with interactive Power BI dashboards, automated reporting, and Microsoft Copilot integration. We help you ask better questions of your data and make faster, evidence-based decisions.',
   'a0000000-0000-0000-0000-000000000004', 'active'),

  ('b0000000-0000-0000-0000-000000000008', 'Digital Transformation Strategy',
   'Technology roadmap aligned with your business goals, budgets, and growth targets.',
   'A comprehensive strategic engagement where we assess your current technology maturity, understand your business objectives, and create a prioritised 12-24 month roadmap. Includes quarterly reviews and budget forecasting.',
   'a0000000-0000-0000-0000-000000000004', 'active')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 12. COURSES (Academy)
-- ---------------------------------------------------------------------------
INSERT INTO public.courses (id, name, description, phase_id, is_published) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'IT Security Fundamentals',
   'Learn the essentials of cyber security for small businesses — from password hygiene to incident response.',
   'a0000000-0000-0000-0000-000000000002', true),

  ('d0000000-0000-0000-0000-000000000002', 'Cloud Readiness',
   'Prepare your organisation for a successful cloud migration with this hands-on readiness course.',
   'a0000000-0000-0000-0000-000000000003', true),

  ('d0000000-0000-0000-0000-000000000003', 'Microsoft 365 for Business',
   'Get the most out of Microsoft 365 — Teams, SharePoint, OneDrive, and beyond.',
   'a0000000-0000-0000-0000-000000000001', true),

  ('d0000000-0000-0000-0000-000000000004', 'Data-Driven Decision Making',
   'Introduction to Power BI and business analytics for non-technical leaders.',
   'a0000000-0000-0000-0000-000000000004', false)
ON CONFLICT (id) DO NOTHING;

-- Course Sections
INSERT INTO public.course_sections (id, course_id, name, description, sort_order) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Understanding Threats', 'Common cyber threats facing SMBs today.', 1),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Protecting Your Business', 'Practical steps to defend against attacks.', 2),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Incident Response', 'What to do when a breach occurs.', 3),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 'Assessing Your Environment', 'Inventorying what you have and what needs to move.', 1),
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', 'Choosing the Right Cloud Model', 'Public, private, or hybrid — making the right choice.', 2),
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000003', 'Teams & Collaboration', 'Using Teams for chat, meetings, and file sharing.', 1),
  ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000003', 'SharePoint & OneDrive', 'Document management and cloud storage.', 2)
ON CONFLICT (id) DO NOTHING;

-- Course Modules
INSERT INTO public.course_modules (section_id, title, description, youtube_url, duration_minutes, sort_order) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Phishing & Social Engineering', 'How attackers manipulate people to gain access.', 'https://www.youtube.com/watch?v=example1', 12, 1),
  ('e0000000-0000-0000-0000-000000000001', 'Ransomware Explained', 'What ransomware is and how it spreads.', 'https://www.youtube.com/watch?v=example2', 10, 2),
  ('e0000000-0000-0000-0000-000000000002', 'Multi-Factor Authentication', 'Why MFA is your best first defence.', 'https://www.youtube.com/watch?v=example3', 8, 1),
  ('e0000000-0000-0000-0000-000000000002', 'Password Management', 'Using password managers and creating strong credentials.', 'https://www.youtube.com/watch?v=example4', 7, 2),
  ('e0000000-0000-0000-0000-000000000003', 'Incident Response Plan', 'Building a plan before you need one.', 'https://www.youtube.com/watch?v=example5', 15, 1),
  ('e0000000-0000-0000-0000-000000000004', 'Infrastructure Audit', 'Documenting servers, network, and applications.', 'https://www.youtube.com/watch?v=example6', 14, 1),
  ('e0000000-0000-0000-0000-000000000005', 'Cloud Cost Models', 'Understanding CapEx vs OpEx in the cloud.', 'https://www.youtube.com/watch?v=example7', 11, 1),
  ('e0000000-0000-0000-0000-000000000006', 'Getting Started with Teams', 'Setting up channels, chats, and meetings.', 'https://www.youtube.com/watch?v=example8', 13, 1),
  ('e0000000-0000-0000-0000-000000000007', 'SharePoint Site Setup', 'Creating team sites and document libraries.', 'https://www.youtube.com/watch?v=example9', 16, 1)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 13. ASSESSMENTS (Onboarding + standalone)
-- ---------------------------------------------------------------------------

-- The Onboarding Assessment (journey-level, public-facing)
INSERT INTO public.assessments (id, scope, type, name, description, pass_threshold, is_onboarding, welcome_heading, welcome_description, completion_heading, completion_description) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'journey', 'pre', 'IT Modernisation Assessment',
   'Evaluate your organisation across the four phases of IT modernisation.',
   50, true,
   'Discover Your IT Modernisation Maturity',
   'Answer a few questions across four phases of modernisation to see where your organisation stands. It takes about 5 minutes.',
   'Your Assessment is Complete!',
   'To receive your Modernisation score and proceed with your modernisation journey, please enter your details below.')
ON CONFLICT (id) DO NOTHING;

-- Assessment Questions (4 per phase = 16 total, maturity-style scoring 0-3)
-- Operate Phase
INSERT INTO public.assessment_questions (assessment_id, question_text, options, sort_order, points, weight, service_id) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'How would you describe your IT monitoring and alerting?',
   '[{"label":"We have no monitoring — we find out about issues when users complain","value":"0","is_correct":false},{"label":"Basic monitoring on some systems, mostly reactive","value":"1","is_correct":false},{"label":"Monitoring on all critical systems with email alerts","value":"2","is_correct":false},{"label":"Comprehensive 24/7 monitoring with automated alerting and escalation","value":"3","is_correct":true}]',
   1, 3, 1, 'b0000000-0000-0000-0000-000000000001'),

  ('f0000000-0000-0000-0000-000000000001', 'How do you handle IT support requests?',
   '[{"label":"No formal process — staff ask whoever is available","value":"0","is_correct":false},{"label":"Shared inbox or chat channel, no tracking","value":"1","is_correct":false},{"label":"Ticketing system in place, basic SLAs defined","value":"2","is_correct":false},{"label":"Full ITSM with SLAs, escalation paths, and reporting","value":"3","is_correct":true}]',
   2, 3, 1, 'b0000000-0000-0000-0000-000000000001'),

  ('f0000000-0000-0000-0000-000000000001', 'How current is your IT documentation?',
   '[{"label":"Little to no documentation exists","value":"0","is_correct":false},{"label":"Some documentation but mostly outdated","value":"1","is_correct":false},{"label":"Key systems documented and reviewed annually","value":"2","is_correct":false},{"label":"Comprehensive, living documentation updated with every change","value":"3","is_correct":true}]',
   3, 3, 1, 'b0000000-0000-0000-0000-000000000002'),

  ('f0000000-0000-0000-0000-000000000001', 'How is patching and updates managed?',
   '[{"label":"Updates are applied ad-hoc when we remember","value":"0","is_correct":false},{"label":"Manual patching on a rough schedule","value":"1","is_correct":false},{"label":"Scheduled patching with a defined maintenance window","value":"2","is_correct":false},{"label":"Automated patch management with testing, rollback, and compliance reporting","value":"3","is_correct":true}]',
   4, 3, 1, 'b0000000-0000-0000-0000-000000000002'),

-- Secure Phase
  ('f0000000-0000-0000-0000-000000000001', 'What endpoint protection do you have in place?',
   '[{"label":"Basic antivirus or nothing","value":"0","is_correct":false},{"label":"Antivirus on most devices, not centrally managed","value":"1","is_correct":false},{"label":"Managed antivirus across all devices","value":"2","is_correct":false},{"label":"EDR/XDR with 24/7 SOC monitoring and automated response","value":"3","is_correct":true}]',
   5, 3, 1, 'b0000000-0000-0000-0000-000000000003'),

  ('f0000000-0000-0000-0000-000000000001', 'How do you handle user authentication?',
   '[{"label":"Username and password only","value":"0","is_correct":false},{"label":"Passwords with some complexity requirements","value":"1","is_correct":false},{"label":"MFA enabled for key systems (email, VPN)","value":"2","is_correct":false},{"label":"MFA everywhere with conditional access policies and SSO","value":"3","is_correct":true}]',
   6, 3, 1, 'b0000000-0000-0000-0000-000000000003'),

  ('f0000000-0000-0000-0000-000000000001', 'Do you have security awareness training for staff?',
   '[{"label":"No training in place","value":"0","is_correct":false},{"label":"Occasional reminders via email","value":"1","is_correct":false},{"label":"Annual training session for all staff","value":"2","is_correct":false},{"label":"Ongoing training with regular phishing simulations and reporting","value":"3","is_correct":true}]',
   7, 3, 1, 'b0000000-0000-0000-0000-000000000004'),

  ('f0000000-0000-0000-0000-000000000001', 'What is your backup and recovery capability?',
   '[{"label":"No reliable backups in place","value":"0","is_correct":false},{"label":"Backups exist but are untested","value":"1","is_correct":false},{"label":"Regular backups with occasional test restores","value":"2","is_correct":false},{"label":"Automated backups with documented DR plan and regular testing","value":"3","is_correct":true}]',
   8, 3, 1, 'b0000000-0000-0000-0000-000000000004'),

-- Streamline Phase
  ('f0000000-0000-0000-0000-000000000001', 'How much of your infrastructure is in the cloud?',
   '[{"label":"Everything is on-premises","value":"0","is_correct":false},{"label":"Email in the cloud, everything else on-prem","value":"1","is_correct":false},{"label":"Mix of cloud and on-prem with a migration plan","value":"2","is_correct":false},{"label":"Cloud-first strategy — most workloads in Azure/AWS/M365","value":"3","is_correct":true}]',
   9, 3, 1, 'b0000000-0000-0000-0000-000000000005'),

  ('f0000000-0000-0000-0000-000000000001', 'How do your teams collaborate on documents?',
   '[{"label":"Email attachments and local file shares","value":"0","is_correct":false},{"label":"Some use of cloud storage, inconsistent across teams","value":"1","is_correct":false},{"label":"SharePoint/OneDrive adopted, most teams co-authoring","value":"2","is_correct":false},{"label":"Fully modern workplace — Teams, SharePoint, real-time co-authoring, version control","value":"3","is_correct":true}]',
   10, 3, 1, 'b0000000-0000-0000-0000-000000000005'),

  ('f0000000-0000-0000-0000-000000000001', 'How many manual/repetitive processes exist in your business?',
   '[{"label":"Most processes are manual and paper-based","value":"0","is_correct":false},{"label":"Some spreadsheet-based tracking, lots of manual steps","value":"1","is_correct":false},{"label":"Key processes use software, some automation in place","value":"2","is_correct":false},{"label":"Automated workflows for onboarding, approvals, reporting, and routine tasks","value":"3","is_correct":true}]',
   11, 3, 1, 'b0000000-0000-0000-0000-000000000006'),

  ('f0000000-0000-0000-0000-000000000001', 'How do you manage line-of-business applications?',
   '[{"label":"Running legacy apps on old servers, no upgrade path","value":"0","is_correct":false},{"label":"Mix of legacy and modern apps, no integration","value":"1","is_correct":false},{"label":"Most apps are SaaS, some integration between them","value":"2","is_correct":false},{"label":"Integrated SaaS stack with APIs, SSO, and centralised management","value":"3","is_correct":true}]',
   12, 3, 1, 'b0000000-0000-0000-0000-000000000006'),

-- Accelerate Phase
  ('f0000000-0000-0000-0000-000000000001', 'Do you use data analytics to inform business decisions?',
   '[{"label":"No — decisions are based on gut feeling","value":"0","is_correct":false},{"label":"Basic spreadsheet reports, reviewed occasionally","value":"1","is_correct":false},{"label":"Some dashboards in place, used by management","value":"2","is_correct":false},{"label":"Interactive BI dashboards with real-time data driving daily decisions","value":"3","is_correct":true}]',
   13, 3, 1, 'b0000000-0000-0000-0000-000000000007'),

  ('f0000000-0000-0000-0000-000000000001', 'How are you using AI in your business?',
   '[{"label":"Not at all","value":"0","is_correct":false},{"label":"Individual staff experimenting with ChatGPT","value":"1","is_correct":false},{"label":"Exploring Copilot or other AI tools in specific areas","value":"2","is_correct":false},{"label":"AI integrated into workflows — Copilot, automation, and predictive analytics","value":"3","is_correct":true}]',
   14, 3, 1, 'b0000000-0000-0000-0000-000000000007'),

  ('f0000000-0000-0000-0000-000000000001', 'Do you have a technology roadmap?',
   '[{"label":"No roadmap — IT is purely reactive","value":"0","is_correct":false},{"label":"Vague plans discussed informally","value":"1","is_correct":false},{"label":"Annual IT budget and rough plan","value":"2","is_correct":false},{"label":"Documented 12-24 month roadmap reviewed quarterly, aligned with business strategy","value":"3","is_correct":true}]',
   15, 3, 1, 'b0000000-0000-0000-0000-000000000008'),

  ('f0000000-0000-0000-0000-000000000001', 'How does technology contribute to your competitive advantage?',
   '[{"label":"It doesn''t — IT is a cost centre","value":"0","is_correct":false},{"label":"IT supports basic operations but doesn''t differentiate us","value":"1","is_correct":false},{"label":"Technology enables some efficiencies our competitors lack","value":"2","is_correct":false},{"label":"Technology is a core differentiator — faster service, better insights, innovative products","value":"3","is_correct":true}]',
   16, 3, 1, 'b0000000-0000-0000-0000-000000000008')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 14. SALES STAGES (Kanban pipeline)
-- ---------------------------------------------------------------------------
INSERT INTO public.sales_stages (id, name, sort_order, color) VALUES
  ('e0000000-0000-0000-0000-000000000010', 'New Lead', 1, '#1175E4'),
  ('e0000000-0000-0000-0000-000000000011', 'Contacted', 2, '#8B5CF6'),
  ('e0000000-0000-0000-0000-000000000012', 'Discovery', 3, '#F59E0B'),
  ('e0000000-0000-0000-0000-000000000013', 'Proposal', 4, '#FF246B'),
  ('e0000000-0000-0000-0000-000000000014', 'Negotiation', 5, '#133258'),
  ('e0000000-0000-0000-0000-000000000015', 'Won', 6, '#10B981'),
  ('e0000000-0000-0000-0000-000000000016', 'Lost', 7, '#6B7280')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 15. BLOG POSTS (public website)
-- ---------------------------------------------------------------------------
INSERT INTO public.blog_posts (title, slug, excerpt, content, category, status, published_at) VALUES
  ('The Complete Guide to IT Modernisation for SMBs', 'complete-guide-it-modernisation-smbs',
   'Everything you need to know about transforming your IT infrastructure, from assessment to acceleration.',
   '<h2>Why Modernise?</h2><p>In today''s rapidly evolving digital landscape, outdated IT infrastructure isn''t just inconvenient — it''s a business risk. Modern IT modernisation is about more than upgrading hardware; it''s about transforming how your business operates, competes, and grows.</p><h2>The Four Phases</h2><p>IThealth''s modernisation journey follows four proven phases: Operate, Secure, Streamline, and Accelerate. Each phase builds on the last, creating a solid foundation for digital maturity.</p><h2>Getting Started</h2><p>The first step is understanding where you are today. Our free IT Modernisation Assessment evaluates your organisation across all four phases and gives you a clear maturity score with actionable recommendations.</p>',
   'Strategy', 'published', now() - interval '14 days'),

  ('Why SMBs Need Zero Trust Security in 2026', 'smbs-zero-trust-security-2026',
   'The threat landscape has changed dramatically. Here''s how Zero Trust architecture can protect your business.',
   '<h2>The Evolving Threat Landscape</h2><p>Cyber threats targeting small and medium businesses have increased by 300% in the last three years. Traditional perimeter-based security is no longer sufficient.</p><h2>What is Zero Trust?</h2><p>Zero Trust operates on a simple principle: never trust, always verify. Every user, device, and connection is authenticated and authorised before access is granted.</p><h2>Practical Steps</h2><p>Start with MFA everywhere, then move to conditional access policies. Segment your network and implement least-privilege access. It doesn''t have to happen overnight — but it does need to start.</p>',
   'Security', 'published', now() - interval '10 days'),

  ('Cloud Migration: A Step-by-Step Guide for SMBs', 'cloud-migration-step-by-step-guide',
   'Moving to the cloud doesn''t have to be overwhelming. Follow our structured approach to a successful migration.',
   '<h2>Planning Your Migration</h2><p>A successful cloud migration starts with understanding what you have, what you need, and where you want to go. Start with an inventory of your current infrastructure.</p><h2>Choosing the Right Model</h2><p>Public cloud, private cloud, or hybrid? The right choice depends on your compliance requirements, budget, and growth plans.</p><h2>The Migration Process</h2><p>We recommend a phased approach: start with email and collaboration tools, then move file storage, and finally migrate line-of-business applications. Each phase should have rollback plans and success criteria.</p>',
   'Cloud', 'published', now() - interval '7 days'),

  ('5 Signs Your IT Infrastructure Needs Modernising', 'five-signs-it-needs-modernising',
   'Outdated infrastructure costs more than you think. Watch for these warning signs.',
   '<h2>1. Frequent Downtime</h2><p>If your team regularly experiences outages or slowdowns, your infrastructure is telling you something. Modern businesses can''t afford unreliable IT.</p><h2>2. Rising Costs</h2><p>Legacy systems often cost more to maintain than to replace. If your IT budget keeps growing without improved outcomes, it''s time to modernise.</p><h2>3. Security Concerns</h2><p>End-of-life software doesn''t receive security patches. Every unsupported system is an open door for attackers.</p><h2>4. Employee Frustration</h2><p>When your team complains about slow systems, incompatible tools, or inability to work remotely — they''re telling you the infrastructure isn''t meeting business needs.</p><h2>5. No Scalability</h2><p>If adding a new employee or opening a new office requires weeks of IT setup, your infrastructure isn''t built for growth.</p>',
   'Operations', 'published', now() - interval '3 days'),

  ('The ROI of Managed IT Services', 'roi-managed-it-services',
   'How outsourcing IT management delivers measurable returns for growing businesses.',
   '<h2>Beyond Cost Savings</h2><p>While cost reduction is a key benefit, the real ROI of managed IT services comes from improved uptime, faster issue resolution, and strategic guidance that helps your business grow.</p><h2>The Numbers</h2><p>On average, businesses that switch to managed IT see a 45% reduction in downtime, 60% faster ticket resolution, and 25% lower total IT spend within the first year.</p>',
   'Strategy', 'published', now() - interval '1 day'),

  ('Cyber Essentials: Your First Step to Compliance', 'cyber-essentials-first-step',
   'A practical guide to achieving Cyber Essentials certification for your business.',
   '<h2>What is Cyber Essentials?</h2><p>Cyber Essentials is a UK government-backed scheme that helps organisations protect themselves against common cyber attacks. It covers five key controls: firewalls, secure configuration, access control, malware protection, and patch management.</p>',
   'Security', 'draft', NULL)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 16. TESTIMONIALS (public website)
-- ---------------------------------------------------------------------------
INSERT INTO public.testimonials (name, company, role, quote, sort_order) VALUES
  ('Sarah Chen', 'TechFlow Ltd', 'CTO', 'IThealth transformed our IT infrastructure. We went from constant firefighting to proactive management. Their modernisation journey gave us a clear path forward.', 1),
  ('James Wright', 'Wright & Co Attorneys', 'Managing Partner', 'The modernisation journey framework gave us a clear roadmap. Best IT decision we''ve made. Our team is more productive and our data is finally secure.', 2),
  ('Maria Santos', 'Santos Financial Advisory', 'Managing Director', 'Professional, responsive, and they actually understand small business IT needs. IThealth doesn''t just fix problems — they prevent them.', 3),
  ('David Kumar', 'Kumar Construction Group', 'Operations Director', 'Moving to the cloud with IThealth was seamless. Our field teams can now access everything they need from their tablets. Game changer for site productivity.', 4),
  ('Lisa Thompson', 'Horizon Healthcare', 'Practice Manager', 'The compliance and governance service gave us complete peace of mind for our CQC inspection. Everything was documented, tested, and audit-ready.', 5)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 17. PARTNERS (technology partners)
-- ---------------------------------------------------------------------------
INSERT INTO public.partners (name, description, website, sort_order) VALUES
  ('Microsoft', 'Cloud and productivity solutions — Azure, Microsoft 365, Dynamics 365, Power Platform.', 'https://microsoft.com', 1),
  ('Datto', 'Business continuity, disaster recovery, and remote monitoring for MSPs and SMBs.', 'https://datto.com', 2),
  ('SentinelOne', 'AI-powered endpoint security — detect, prevent, and respond to threats across every surface.', 'https://sentinelone.com', 3),
  ('ConnectWise', 'IT management and automation platform for technology service providers.', 'https://connectwise.com', 4),
  ('Fortinet', 'Next-generation firewalls, SD-WAN, and unified threat management.', 'https://fortinet.com', 5),
  ('KnowBe4', 'Security awareness training and simulated phishing platform.', 'https://knowbe4.com', 6),
  ('Veeam', 'Backup, recovery, and data management for cloud, virtual, and physical workloads.', 'https://veeam.com', 7),
  ('Cisco Meraki', 'Cloud-managed networking — switches, access points, and security appliances.', 'https://meraki.cisco.com', 8)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 18. SERVICE JUNCTION TABLES (link services to reference data)
-- ---------------------------------------------------------------------------

-- Service → Products
INSERT INTO public.service_products (service_id, product_id, notes)
SELECT 'b0000000-0000-0000-0000-000000000001', id, 'Core RMM and PSA tooling'
FROM public.products WHERE name IN ('Datto RMM', 'ConnectWise Manage', 'IT Glue')
ON CONFLICT DO NOTHING;

INSERT INTO public.service_products (service_id, product_id, notes)
SELECT 'b0000000-0000-0000-0000-000000000002', id, 'Backup infrastructure'
FROM public.products WHERE name IN ('Datto SIRIS', 'Veeam Backup')
ON CONFLICT DO NOTHING;

INSERT INTO public.service_products (service_id, product_id, notes)
SELECT 'b0000000-0000-0000-0000-000000000003', id, 'Security stack'
FROM public.products WHERE name IN ('SentinelOne Singularity', 'KnowBe4', 'Microsoft 365 Business Premium')
ON CONFLICT DO NOTHING;

INSERT INTO public.service_products (service_id, product_id, notes)
SELECT 'b0000000-0000-0000-0000-000000000005', id, 'Cloud platform'
FROM public.products WHERE name IN ('Microsoft 365 Business Premium', 'Azure Virtual Desktop', 'Microsoft Entra ID P1')
ON CONFLICT DO NOTHING;

INSERT INTO public.service_products (service_id, product_id, notes)
SELECT 'b0000000-0000-0000-0000-000000000007', id, 'Analytics tooling'
FROM public.products WHERE name IN ('Power BI Pro')
ON CONFLICT DO NOTHING;

-- Service → Skills
INSERT INTO public.service_skills (service_id, skill_id, notes)
SELECT 'b0000000-0000-0000-0000-000000000001', id, NULL
FROM public.skills WHERE name IN ('RMM Tooling', 'PSA / Ticketing', 'Windows Server Management', 'Network Administration', 'Documentation & SOPs')
ON CONFLICT DO NOTHING;

INSERT INTO public.service_skills (service_id, skill_id, notes)
SELECT 'b0000000-0000-0000-0000-000000000002', id, NULL
FROM public.skills WHERE name IN ('Backup & Recovery', 'Windows Server Management')
ON CONFLICT DO NOTHING;

INSERT INTO public.service_skills (service_id, skill_id, notes)
SELECT 'b0000000-0000-0000-0000-000000000003', id, NULL
FROM public.skills WHERE name IN ('Endpoint Security', 'Security Awareness Training', 'Microsoft 365 Administration')
ON CONFLICT DO NOTHING;

INSERT INTO public.service_skills (service_id, skill_id, notes)
SELECT 'b0000000-0000-0000-0000-000000000004', id, NULL
FROM public.skills WHERE name IN ('Compliance Frameworks', 'Documentation & SOPs')
ON CONFLICT DO NOTHING;

INSERT INTO public.service_skills (service_id, skill_id, notes)
SELECT 'b0000000-0000-0000-0000-000000000005', id, NULL
FROM public.skills WHERE name IN ('Cloud Migration', 'Azure Administration', 'Microsoft 365 Administration')
ON CONFLICT DO NOTHING;

INSERT INTO public.service_skills (service_id, skill_id, notes)
SELECT 'b0000000-0000-0000-0000-000000000006', id, NULL
FROM public.skills WHERE name IN ('PowerShell / Automation', 'Microsoft 365 Administration')
ON CONFLICT DO NOTHING;

INSERT INTO public.service_skills (service_id, skill_id, notes)
SELECT 'b0000000-0000-0000-0000-000000000007', id, NULL
FROM public.skills WHERE name IN ('Data Analytics', 'Microsoft 365 Administration')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 19. SERVICE RUNBOOK STEPS (example for Managed IT Support)
-- ---------------------------------------------------------------------------
INSERT INTO public.service_runbook_steps (service_id, title, description, estimated_minutes, role, sort_order) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Initial Site Survey', 'Visit client site, document network topology, hardware inventory, and current pain points.', 120, 'Engineer', 1),
  ('b0000000-0000-0000-0000-000000000001', 'Deploy RMM Agents', 'Install Datto RMM agents on all endpoints and servers. Configure monitoring policies.', 60, 'Engineer', 2),
  ('b0000000-0000-0000-0000-000000000001', 'Configure Alerting', 'Set up alert thresholds for CPU, disk, memory, and service status. Configure escalation paths.', 30, 'Engineer', 3),
  ('b0000000-0000-0000-0000-000000000001', 'Documentation Setup', 'Create IT Glue documentation — passwords, configurations, SOPs, and network diagrams.', 90, 'Engineer', 4),
  ('b0000000-0000-0000-0000-000000000001', 'Client Onboarding Call', 'Walk client through helpdesk process, introduce account manager, review SLAs.', 30, 'Account Manager', 5),
  ('b0000000-0000-0000-0000-000000000001', '30-Day Health Check', 'Review first month of monitoring data, address any recurring issues, present report to client.', 60, 'Engineer', 6),

  -- Backup & Disaster Recovery (b...002) — Operate phase
  ('b0000000-0000-0000-0000-000000000002', 'Backup Audit', 'Audit existing backup solutions, identify unprotected data, document RPO/RTO requirements.', 90, 'Engineer', 1),
  ('b0000000-0000-0000-0000-000000000002', 'Deploy Backup Agents', 'Install Datto SIRIS or ALTO appliance, configure backup schedules for all servers and critical workstations.', 120, 'Engineer', 2),
  ('b0000000-0000-0000-0000-000000000002', 'Configure Offsite Replication', 'Set up cloud replication to Datto Cloud, verify offsite copies, configure retention policies.', 60, 'Engineer', 3),
  ('b0000000-0000-0000-0000-000000000002', 'Test Restore Procedure', 'Perform full test restore of critical server, document restore time, validate data integrity.', 90, 'Engineer', 4),
  ('b0000000-0000-0000-0000-000000000002', 'DR Plan Documentation', 'Write disaster recovery plan with escalation contacts, restore priorities, and communication templates.', 60, 'Account Manager', 5),

  -- Cyber Security Essentials (b...003) — Secure phase
  ('b0000000-0000-0000-0000-000000000003', 'Security Assessment', 'Run vulnerability scan, review current security posture, identify critical gaps and quick wins.', 120, 'Security Analyst', 1),
  ('b0000000-0000-0000-0000-000000000003', 'Deploy Endpoint Protection', 'Install SentinelOne EDR on all endpoints, configure threat policies and automated response.', 90, 'Engineer', 2),
  ('b0000000-0000-0000-0000-000000000003', 'Configure Email Security', 'Set up email filtering, anti-phishing rules, DMARC/DKIM/SPF records, and quarantine policies.', 60, 'Engineer', 3),
  ('b0000000-0000-0000-0000-000000000003', 'Enable MFA', 'Roll out multi-factor authentication across Microsoft 365, VPN, and critical business applications.', 45, 'Engineer', 4),
  ('b0000000-0000-0000-0000-000000000003', 'Security Awareness Training', 'Launch first phishing simulation, enrol all staff in security awareness programme, schedule monthly tests.', 60, 'Security Analyst', 5),

  -- Compliance & Governance (b...004) — Secure phase
  ('b0000000-0000-0000-0000-000000000004', 'Gap Analysis', 'Assess current compliance posture against Cyber Essentials framework, document gaps and remediation priorities.', 120, 'Security Analyst', 1),
  ('b0000000-0000-0000-0000-000000000004', 'Policy Framework Setup', 'Draft and implement IT security policies: acceptable use, data classification, incident response, BYOD.', 180, 'Security Analyst', 2),
  ('b0000000-0000-0000-0000-000000000004', 'Technical Remediation', 'Address technical gaps identified in gap analysis: patching, firewall rules, access controls, encryption.', 240, 'Engineer', 3),
  ('b0000000-0000-0000-0000-000000000004', 'Certification Submission', 'Complete Cyber Essentials self-assessment questionnaire, submit to certifying body, address any queries.', 90, 'Security Analyst', 4),

  -- Cloud Migration (b...005) — Streamline phase
  ('b0000000-0000-0000-0000-000000000005', 'Cloud Readiness Assessment', 'Inventory all workloads, assess cloud suitability, identify dependencies and migration blockers.', 120, 'Cloud Architect', 1),
  ('b0000000-0000-0000-0000-000000000005', 'Azure Tenant & Networking', 'Provision Azure tenant, configure virtual networks, set up VPN or ExpressRoute connectivity.', 90, 'Engineer', 2),
  ('b0000000-0000-0000-0000-000000000005', 'Email Migration to Exchange Online', 'Migrate mailboxes to Exchange Online in batches, verify calendar/contact sync, update DNS MX records.', 180, 'Engineer', 3),
  ('b0000000-0000-0000-0000-000000000005', 'File Migration to SharePoint/OneDrive', 'Migrate file shares to SharePoint Online and OneDrive, configure permissions, redirect mapped drives.', 150, 'Engineer', 4),
  ('b0000000-0000-0000-0000-000000000005', 'Server Migration to Azure', 'Migrate on-premises servers to Azure VMs using Azure Migrate, validate applications, cutover.', 240, 'Engineer', 5),
  ('b0000000-0000-0000-0000-000000000005', 'Post-Migration Validation', 'Verify all services operational, performance testing, update documentation, decommission old hardware.', 90, 'Engineer', 6),

  -- Process Automation (b...006) — Streamline phase
  ('b0000000-0000-0000-0000-000000000006', 'Process Discovery Workshop', 'Interview key staff, map existing manual processes, score by automation potential and business impact.', 120, 'Consultant', 1),
  ('b0000000-0000-0000-0000-000000000006', 'Design Automation Workflows', 'Design Power Automate flows for top 3 priority processes, create approval chains and error handling.', 180, 'Engineer', 2),
  ('b0000000-0000-0000-0000-000000000006', 'Build & Test Automations', 'Implement workflows in Power Automate, integrate with Microsoft 365 and LOB apps, run UAT with users.', 240, 'Engineer', 3),
  ('b0000000-0000-0000-0000-000000000006', 'Training & Handover', 'Train power users on managing and modifying flows, document all automations, handover to internal team.', 60, 'Consultant', 4),

  -- AI & Analytics (b...007) — Accelerate phase
  ('b0000000-0000-0000-0000-000000000007', 'Data Source Audit', 'Identify all business data sources, assess data quality, map key metrics and KPIs for dashboards.', 90, 'Data Analyst', 1),
  ('b0000000-0000-0000-0000-000000000007', 'Power BI Workspace Setup', 'Provision Power BI workspace, configure data gateway, connect to data sources, set up refresh schedules.', 60, 'Engineer', 2),
  ('b0000000-0000-0000-0000-000000000007', 'Build Executive Dashboard', 'Create interactive Power BI dashboard with key business metrics, drill-downs, and automated alerts.', 180, 'Data Analyst', 3),
  ('b0000000-0000-0000-0000-000000000007', 'Copilot Integration', 'Enable Microsoft Copilot across M365 apps, configure data permissions, run pilot with leadership team.', 120, 'Engineer', 4),

  -- Digital Transformation Strategy (b...008) — Accelerate phase
  ('b0000000-0000-0000-0000-000000000008', 'Stakeholder Interviews', 'Interview leadership team, department heads, and key users to understand business goals and pain points.', 120, 'Consultant', 1),
  ('b0000000-0000-0000-0000-000000000008', 'Technology Maturity Assessment', 'Score current technology across all domains, benchmark against industry peers, identify priority gaps.', 90, 'Consultant', 2),
  ('b0000000-0000-0000-0000-000000000008', 'Roadmap Development', 'Create prioritised 12-24 month technology roadmap with budget estimates, dependencies, and milestones.', 180, 'Consultant', 3),
  ('b0000000-0000-0000-0000-000000000008', 'Business Case & Presentation', 'Prepare executive business case document, present to board/leadership, agree on investment priorities.', 120, 'Consultant', 4)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 20. SERVICE COSTING ITEMS (example for Managed IT Support)
-- ---------------------------------------------------------------------------
INSERT INTO public.service_costing_items (service_id, name, category, pricing_type, formula, base_cost, sort_order)
SELECT 'b0000000-0000-0000-0000-000000000001', 'RMM Licensing', 'maintenance', 'formula',
  'Number of Devices * 3.50', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM public.service_costing_items WHERE service_id = 'b0000000-0000-0000-0000-000000000001' AND name = 'RMM Licensing');

INSERT INTO public.service_costing_items (service_id, name, category, pricing_type, formula, base_cost, sort_order)
SELECT 'b0000000-0000-0000-0000-000000000001', 'PSA Per-User License', 'maintenance', 'formula',
  'Number of Users * 45.00', 0, 2
WHERE NOT EXISTS (SELECT 1 FROM public.service_costing_items WHERE service_id = 'b0000000-0000-0000-0000-000000000001' AND name = 'PSA Per-User License');

INSERT INTO public.service_costing_items (service_id, name, category, pricing_type, base_cost, sort_order)
SELECT 'b0000000-0000-0000-0000-000000000001', 'Onboarding & Setup', 'setup', 'tiered',
  1500, 3
WHERE NOT EXISTS (SELECT 1 FROM public.service_costing_items WHERE service_id = 'b0000000-0000-0000-0000-000000000001' AND name = 'Onboarding & Setup');

-- ---------------------------------------------------------------------------
-- 21. SERVICE-ACADEMY LINKS
-- ---------------------------------------------------------------------------
INSERT INTO public.service_academy_links (service_id, course_id, is_required) VALUES
  -- Cyber Security Essentials → IT Security Fundamentals (required)
  ('b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', true),
  -- Compliance & Governance → IT Security Fundamentals (required)
  ('b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', true),
  -- Cloud Migration → Cloud Readiness (required)
  ('b0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', true),
  -- Managed IT Support → Microsoft 365 for Business (optional)
  ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', false),
  -- Backup & DR → Microsoft 365 for Business (optional)
  ('b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', false),
  -- Process Automation → Microsoft 365 for Business (required)
  ('b0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000003', true),
  -- AI & Analytics → Data-Driven Decision Making (required)
  ('b0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000004', true),
  -- Digital Transformation Strategy → Data-Driven Decision Making (optional)
  ('b0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000004', false)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- TEST USERS (auth + profiles)
-- ---------------------------------------------------------------------------
-- Admin: guy.duncan@futuvara.com / Roccolola2013!
-- Customer: customer@acmesolutions.co.za / Customer2024!
-- Partner: partner@cloudwave.co.za / Partner2024!

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token,
  phone_change, phone_change_token,
  raw_app_meta_data, raw_user_meta_data
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'guy.duncan@futuvara.com', crypt('Roccolola2013!', gen_salt('bf')),
   now(), now(), now(),
   '', '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'customer@acmesolutions.co.za', crypt('Customer2024!', gen_salt('bf')),
   now(), now(), now(),
   '', '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'partner@cloudwave.co.za', crypt('Partner2024!', gen_salt('bf')),
   now(), now(), now(),
   '', '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001',
   '{"sub":"c0000000-0000-0000-0000-000000000001","email":"guy.duncan@futuvara.com"}',
   'email', 'c0000000-0000-0000-0000-000000000001', now(), now(), now()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000002',
   '{"sub":"c0000000-0000-0000-0000-000000000002","email":"customer@acmesolutions.co.za"}',
   'email', 'c0000000-0000-0000-0000-000000000002', now(), now(), now()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000003',
   '{"sub":"c0000000-0000-0000-0000-000000000003","email":"partner@cloudwave.co.za"}',
   'email', 'c0000000-0000-0000-0000-000000000003', now(), now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, email, display_name, role, company_id) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'guy.duncan@futuvara.com', 'Guy Duncan', 'admin', '00000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002', 'customer@acmesolutions.co.za', 'Acme Customer', 'customer', '00000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000003', 'partner@cloudwave.co.za', 'CloudWave Partner', 'partner', '00000000-0000-0000-0000-000000000006')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- CUSTOMER ASSESSMENT ATTEMPT (Acme Solutions)
-- ---------------------------------------------------------------------------
-- Scores: Operate=67%, Secure=25%, Streamline=50%, Accelerate=17%
-- Service scores:
--   Managed IT Support=83%, Backup & DR=50%          (Operate)
--   Cyber Security=17%, Compliance & Gov=33%          (Secure)
--   Cloud Migration=67%, Process Automation=33%       (Streamline)
--   AI & Analytics=17%, Digital Transformation=17%    (Accelerate)

-- Build answers JSON dynamically from question IDs
DO $$
DECLARE
  q_ids uuid[];
  answers_json jsonb;
  attempt_id uuid := 'a0000000-0000-0000-0000-100000000001';
BEGIN
  -- Get question IDs in sort_order
  SELECT array_agg(id ORDER BY sort_order)
  INTO q_ids
  FROM public.assessment_questions
  WHERE assessment_id = 'f0000000-0000-0000-0000-000000000001';

  -- Build answers: 16 questions, each scored 0-3
  -- Operate (Q1-Q4):    3, 2, 2, 1  → Managed IT=83%, Backup&DR=50%
  -- Secure (Q5-Q8):     1, 0, 1, 1  → CyberSec=17%, Compliance=33%
  -- Streamline (Q9-12): 2, 2, 1, 1  → Cloud=67%, Automation=33%
  -- Accelerate (Q13-16):0, 1, 1, 0  → AI=17%, DigitalTrans=17%
  answers_json := jsonb_build_array(
    jsonb_build_object('question_id', q_ids[1],  'selected_option', '3', 'correct', true),
    jsonb_build_object('question_id', q_ids[2],  'selected_option', '2', 'correct', false),
    jsonb_build_object('question_id', q_ids[3],  'selected_option', '2', 'correct', false),
    jsonb_build_object('question_id', q_ids[4],  'selected_option', '1', 'correct', false),
    jsonb_build_object('question_id', q_ids[5],  'selected_option', '1', 'correct', false),
    jsonb_build_object('question_id', q_ids[6],  'selected_option', '0', 'correct', false),
    jsonb_build_object('question_id', q_ids[7],  'selected_option', '1', 'correct', false),
    jsonb_build_object('question_id', q_ids[8],  'selected_option', '1', 'correct', false),
    jsonb_build_object('question_id', q_ids[9],  'selected_option', '2', 'correct', false),
    jsonb_build_object('question_id', q_ids[10], 'selected_option', '2', 'correct', false),
    jsonb_build_object('question_id', q_ids[11], 'selected_option', '1', 'correct', false),
    jsonb_build_object('question_id', q_ids[12], 'selected_option', '1', 'correct', false),
    jsonb_build_object('question_id', q_ids[13], 'selected_option', '0', 'correct', false),
    jsonb_build_object('question_id', q_ids[14], 'selected_option', '1', 'correct', false),
    jsonb_build_object('question_id', q_ids[15], 'selected_option', '1', 'correct', false),
    jsonb_build_object('question_id', q_ids[16], 'selected_option', '0', 'correct', false)
  );

  INSERT INTO public.assessment_attempts (
    id, assessment_id, user_id, score, passed, answers, phase_scores, service_scores,
    started_at, completed_at
  ) VALUES (
    attempt_id,
    'f0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    40,   -- overall avg of phase scores: (67+25+50+17)/4 = ~40
    false,
    answers_json,
    jsonb_build_object(
      'a0000000-0000-0000-0000-000000000001', 67,
      'a0000000-0000-0000-0000-000000000002', 25,
      'a0000000-0000-0000-0000-000000000003', 50,
      'a0000000-0000-0000-0000-000000000004', 17
    ),
    jsonb_build_object(
      'b0000000-0000-0000-0000-000000000001', jsonb_build_object('earned', 5, 'max', 6, 'pct', 83),
      'b0000000-0000-0000-0000-000000000002', jsonb_build_object('earned', 3, 'max', 6, 'pct', 50),
      'b0000000-0000-0000-0000-000000000003', jsonb_build_object('earned', 1, 'max', 6, 'pct', 17),
      'b0000000-0000-0000-0000-000000000004', jsonb_build_object('earned', 2, 'max', 6, 'pct', 33),
      'b0000000-0000-0000-0000-000000000005', jsonb_build_object('earned', 4, 'max', 6, 'pct', 67),
      'b0000000-0000-0000-0000-000000000006', jsonb_build_object('earned', 2, 'max', 6, 'pct', 33),
      'b0000000-0000-0000-0000-000000000007', jsonb_build_object('earned', 1, 'max', 6, 'pct', 17),
      'b0000000-0000-0000-0000-000000000008', jsonb_build_object('earned', 1, 'max', 6, 'pct', 17)
    ),
    now() - interval '3 days',
    now() - interval '3 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Sales lead for the customer
  INSERT INTO public.sales_leads (
    id, company_id, stage_id, assessment_attempt_id,
    contact_name, contact_email, notes
  ) VALUES (
    'a0000000-0000-0000-0000-200000000001',
    '00000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000010',
    attempt_id,
    'Acme Customer',
    'customer@acmesolutions.co.za',
    'Onboarding assessment completed. Overall score 40% (Developing). Critical gaps in Secure and Accelerate phases.'
  ) ON CONFLICT (id) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 22. SAMPLE ACADEMY COURSES (for testing)
-- ---------------------------------------------------------------------------
-- Courses: d0000000-0000-0000-000a-... series
-- Sections: d1000000-...
-- Modules: d2000000-...
-- Assessments: d3000000-...
-- Questions: d4000000-...

-- Courses
INSERT INTO public.courses (id, name, description, phase_id, is_published, is_active) VALUES
  ('d0000000-0000-0000-000a-000000000001',
   'Cloud Infrastructure Basics',
   'A practical introduction to cloud infrastructure for IT professionals. Covers cloud architecture fundamentals, provisioning resources, and managing workloads in Azure.',
   'a0000000-0000-0000-0000-000000000001', -- Operate
   true, true),

  ('d0000000-0000-0000-000a-000000000002',
   'Security Fundamentals',
   'Build a strong security foundation for your organisation. Covers threat landscapes, identity management, endpoint protection, and security hygiene best practices.',
   'a0000000-0000-0000-0000-000000000002', -- Secure
   true, true),

  ('d0000000-0000-0000-000a-000000000003',
   'Process Automation Guide',
   'Learn how to identify, design, and implement process automations using Power Automate and PowerShell. Reduce manual effort and eliminate human error across your business.',
   'a0000000-0000-0000-0000-000000000003', -- Streamline
   true, true)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Course Sections
-- ---------------------------------------------------------------------------

-- Cloud Infrastructure Basics — 3 sections
INSERT INTO public.course_sections (id, course_id, name, description, sort_order) VALUES
  ('d1000000-0000-0000-000a-000000000001',
   'd0000000-0000-0000-000a-000000000001',
   'Cloud Fundamentals',
   'Understand cloud computing models, service types (IaaS, PaaS, SaaS), and the core benefits of moving to the cloud.',
   1),
  ('d1000000-0000-0000-000a-000000000002',
   'd0000000-0000-0000-000a-000000000001',
   'Azure Core Services',
   'Explore Azure virtual machines, storage accounts, virtual networks, and the Azure portal.',
   2),
  ('d1000000-0000-0000-000a-000000000003',
   'd0000000-0000-0000-000a-000000000001',
   'Managing Cloud Resources',
   'Learn resource groups, cost management, tagging strategies, and Azure RBAC for access control.',
   3)
ON CONFLICT (id) DO NOTHING;

-- Security Fundamentals — 3 sections
INSERT INTO public.course_sections (id, course_id, name, description, sort_order) VALUES
  ('d1000000-0000-0000-000b-000000000001',
   'd0000000-0000-0000-000a-000000000002',
   'Understanding the Threat Landscape',
   'Survey modern cyber threats — ransomware, phishing, supply chain attacks — and understand how attackers operate.',
   1),
  ('d1000000-0000-0000-000b-000000000002',
   'd0000000-0000-0000-000a-000000000002',
   'Identity & Access Management',
   'Implement MFA, conditional access, and least-privilege principles to protect user accounts and sensitive data.',
   2),
  ('d1000000-0000-0000-000b-000000000003',
   'd0000000-0000-0000-000a-000000000002',
   'Endpoint & Network Security',
   'Deploy endpoint detection and response tools, configure firewalls, and harden devices against common attacks.',
   3)
ON CONFLICT (id) DO NOTHING;

-- Process Automation Guide — 2 sections
INSERT INTO public.course_sections (id, course_id, name, description, sort_order) VALUES
  ('d1000000-0000-0000-000c-000000000001',
   'd0000000-0000-0000-000a-000000000003',
   'Identifying Automation Opportunities',
   'Map your existing manual processes, score them by automation potential, and build a priority backlog.',
   1),
  ('d1000000-0000-0000-000c-000000000002',
   'd0000000-0000-0000-000a-000000000003',
   'Building Automations with Power Automate',
   'Create flows, configure triggers and actions, handle errors, and integrate with Microsoft 365 and external services.',
   2)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Course Modules
-- ---------------------------------------------------------------------------

-- Cloud Infrastructure Basics > Section 1: Cloud Fundamentals
INSERT INTO public.course_modules (id, section_id, title, description, youtube_url, duration_minutes, sort_order) VALUES
  ('d2000000-0000-0000-000a-000000000001',
   'd1000000-0000-0000-000a-000000000001',
   'What is Cloud Computing?',
   'Demystify cloud computing — shared resources, on-demand provisioning, and the pay-as-you-go model.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 10, 1),
  ('d2000000-0000-0000-000a-000000000002',
   'd1000000-0000-0000-000a-000000000001',
   'IaaS, PaaS, and SaaS Explained',
   'Understand the three cloud service models and when to use each for SMB workloads.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 12, 2),
  ('d2000000-0000-0000-000a-000000000003',
   'd1000000-0000-0000-000a-000000000001',
   'Public, Private, and Hybrid Cloud',
   'Compare deployment models and choose the right approach for your organisation''s needs and compliance requirements.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 9, 3)
ON CONFLICT (id) DO NOTHING;

-- Cloud Infrastructure Basics > Section 2: Azure Core Services
INSERT INTO public.course_modules (id, section_id, title, description, youtube_url, duration_minutes, sort_order) VALUES
  ('d2000000-0000-0000-000a-000000000004',
   'd1000000-0000-0000-000a-000000000002',
   'Azure Virtual Machines',
   'Provision, configure, and connect to Azure VMs. Understand VM sizes, availability sets, and OS images.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 15, 1),
  ('d2000000-0000-0000-000a-000000000005',
   'd1000000-0000-0000-000a-000000000002',
   'Azure Storage & Blob',
   'Work with Azure Storage accounts, blob containers, and file shares for cloud-native data storage.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 11, 2),
  ('d2000000-0000-0000-000a-000000000006',
   'd1000000-0000-0000-000a-000000000002',
   'Virtual Networks & Subnets',
   'Design Azure virtual networks, configure subnets, NSGs, and connect on-premises networks via VPN gateway.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 14, 3)
ON CONFLICT (id) DO NOTHING;

-- Cloud Infrastructure Basics > Section 3: Managing Cloud Resources
INSERT INTO public.course_modules (id, section_id, title, description, youtube_url, duration_minutes, sort_order) VALUES
  ('d2000000-0000-0000-000a-000000000007',
   'd1000000-0000-0000-000a-000000000003',
   'Resource Groups & Tagging',
   'Organise Azure resources with resource groups, apply tags for cost tracking, and apply naming conventions.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 8, 1),
  ('d2000000-0000-0000-000a-000000000008',
   'd1000000-0000-0000-000a-000000000003',
   'Azure RBAC & Permissions',
   'Assign built-in roles, create custom roles, and apply least-privilege access across your Azure subscription.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 13, 2)
ON CONFLICT (id) DO NOTHING;

-- Security Fundamentals > Section 1: Threat Landscape
INSERT INTO public.course_modules (id, section_id, title, description, youtube_url, duration_minutes, sort_order) VALUES
  ('d2000000-0000-0000-000b-000000000001',
   'd1000000-0000-0000-000b-000000000001',
   'How Ransomware Works',
   'Trace a ransomware attack from initial phishing email through lateral movement to encryption and extortion.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 12, 1),
  ('d2000000-0000-0000-000b-000000000002',
   'd1000000-0000-0000-000b-000000000001',
   'Social Engineering & Phishing',
   'Recognise phishing emails, pretexting calls, and social engineering techniques used against SMB staff.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 10, 2),
  ('d2000000-0000-0000-000b-000000000003',
   'd1000000-0000-0000-000b-000000000001',
   'Supply Chain & Insider Threats',
   'Understand risks from third-party vendors, compromised software updates, and malicious insiders.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 9, 3)
ON CONFLICT (id) DO NOTHING;

-- Security Fundamentals > Section 2: Identity & Access Management
INSERT INTO public.course_modules (id, section_id, title, description, youtube_url, duration_minutes, sort_order) VALUES
  ('d2000000-0000-0000-000b-000000000004',
   'd1000000-0000-0000-000b-000000000002',
   'Multi-Factor Authentication',
   'Enable and enforce MFA across Microsoft 365, VPN, and business applications. Compare authenticator apps vs SMS.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 11, 1),
  ('d2000000-0000-0000-000b-000000000005',
   'd1000000-0000-0000-000b-000000000002',
   'Conditional Access Policies',
   'Configure Entra ID conditional access to enforce MFA, block risky sign-ins, and restrict access by location.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 14, 2)
ON CONFLICT (id) DO NOTHING;

-- Security Fundamentals > Section 3: Endpoint & Network Security
INSERT INTO public.course_modules (id, section_id, title, description, youtube_url, duration_minutes, sort_order) VALUES
  ('d2000000-0000-0000-000b-000000000006',
   'd1000000-0000-0000-000b-000000000003',
   'EDR vs Traditional Antivirus',
   'Understand why endpoint detection and response (EDR) outperforms legacy antivirus for modern threats.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 10, 1),
  ('d2000000-0000-0000-000b-000000000007',
   'd1000000-0000-0000-000b-000000000003',
   'Firewall Rules & Network Segmentation',
   'Configure next-generation firewall rules, VLAN segmentation, and isolate critical systems from user networks.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 13, 2),
  ('d2000000-0000-0000-000b-000000000008',
   'd1000000-0000-0000-000b-000000000003',
   'Patch Management & Hardening',
   'Automate patch deployment, apply CIS benchmarks, and disable unnecessary services to reduce attack surface.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 12, 3)
ON CONFLICT (id) DO NOTHING;

-- Process Automation Guide > Section 1: Identifying Automation Opportunities
INSERT INTO public.course_modules (id, section_id, title, description, youtube_url, duration_minutes, sort_order) VALUES
  ('d2000000-0000-0000-000c-000000000001',
   'd1000000-0000-0000-000c-000000000001',
   'Process Mapping Techniques',
   'Use swimlane diagrams and value stream maps to document current-state processes and highlight waste.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 10, 1),
  ('d2000000-0000-0000-000c-000000000002',
   'd1000000-0000-0000-000c-000000000001',
   'Scoring & Prioritising Automations',
   'Score candidate processes by effort, impact, and frequency to build a prioritised automation backlog.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 8, 2),
  ('d2000000-0000-0000-000c-000000000003',
   'd1000000-0000-0000-000c-000000000001',
   'Building the Business Case',
   'Quantify time savings and error reduction to build a compelling business case for process automation investment.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 11, 3)
ON CONFLICT (id) DO NOTHING;

-- Process Automation Guide > Section 2: Building with Power Automate
INSERT INTO public.course_modules (id, section_id, title, description, youtube_url, duration_minutes, sort_order) VALUES
  ('d2000000-0000-0000-000c-000000000004',
   'd1000000-0000-0000-000c-000000000002',
   'Power Automate Fundamentals',
   'Navigate the Power Automate interface, understand flow types (cloud, desktop, instant), and create your first flow.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 14, 1),
  ('d2000000-0000-0000-000c-000000000005',
   'd1000000-0000-0000-000c-000000000002',
   'Connecting to Microsoft 365',
   'Use built-in connectors for SharePoint, Outlook, Teams, and Forms to automate common M365 workflows.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 12, 2),
  ('d2000000-0000-0000-000c-000000000006',
   'd1000000-0000-0000-000c-000000000002',
   'Error Handling & Monitoring',
   'Configure run-after conditions, send failure notifications, and monitor flow run history for reliability.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 10, 3)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Section Assessments (pre + post per section)
-- ---------------------------------------------------------------------------

-- Cloud Infrastructure Basics — Section 1 assessments
INSERT INTO public.assessments (id, section_id, scope, type, name, description, pass_threshold, is_active) VALUES
  ('d3000000-0000-0000-000a-000000000001',
   'd1000000-0000-0000-000a-000000000001',
   'course_section', 'pre',
   'Cloud Fundamentals — Pre-Assessment',
   'Test your existing knowledge of cloud computing concepts before starting this section.',
   80, true),
  ('d3000000-0000-0000-000a-000000000002',
   'd1000000-0000-0000-000a-000000000001',
   'course_section', 'post',
   'Cloud Fundamentals — Post-Assessment',
   'Confirm your understanding of cloud computing models and deployment options.',
   80, true)
ON CONFLICT (id) DO NOTHING;

-- Cloud Infrastructure Basics — Section 2 assessments
INSERT INTO public.assessments (id, section_id, scope, type, name, description, pass_threshold, is_active) VALUES
  ('d3000000-0000-0000-000a-000000000003',
   'd1000000-0000-0000-000a-000000000002',
   'course_section', 'pre',
   'Azure Core Services — Pre-Assessment',
   'Assess your familiarity with Azure services before diving into this section.',
   80, true),
  ('d3000000-0000-0000-000a-000000000004',
   'd1000000-0000-0000-000a-000000000002',
   'course_section', 'post',
   'Azure Core Services — Post-Assessment',
   'Verify your knowledge of Azure VMs, storage, and networking.',
   80, true)
ON CONFLICT (id) DO NOTHING;

-- Cloud Infrastructure Basics — Section 3 assessments
INSERT INTO public.assessments (id, section_id, scope, type, name, description, pass_threshold, is_active) VALUES
  ('d3000000-0000-0000-000a-000000000005',
   'd1000000-0000-0000-000a-000000000003',
   'course_section', 'pre',
   'Managing Cloud Resources — Pre-Assessment',
   'Check your prior knowledge of Azure resource management and access control.',
   80, true),
  ('d3000000-0000-0000-000a-000000000006',
   'd1000000-0000-0000-000a-000000000003',
   'course_section', 'post',
   'Managing Cloud Resources — Post-Assessment',
   'Confirm you can apply RBAC, resource groups, and cost management in Azure.',
   80, true)
ON CONFLICT (id) DO NOTHING;

-- Security Fundamentals — Section 1 assessments
INSERT INTO public.assessments (id, section_id, scope, type, name, description, pass_threshold, is_active) VALUES
  ('d3000000-0000-0000-000b-000000000001',
   'd1000000-0000-0000-000b-000000000001',
   'course_section', 'pre',
   'Threat Landscape — Pre-Assessment',
   'Gauge your awareness of common cyber threats before starting this section.',
   80, true),
  ('d3000000-0000-0000-000b-000000000002',
   'd1000000-0000-0000-000b-000000000001',
   'course_section', 'post',
   'Threat Landscape — Post-Assessment',
   'Confirm you can identify and describe modern attack vectors.',
   80, true)
ON CONFLICT (id) DO NOTHING;

-- Security Fundamentals — Section 2 assessments
INSERT INTO public.assessments (id, section_id, scope, type, name, description, pass_threshold, is_active) VALUES
  ('d3000000-0000-0000-000b-000000000003',
   'd1000000-0000-0000-000b-000000000002',
   'course_section', 'pre',
   'Identity & Access Management — Pre-Assessment',
   'Test your existing knowledge of MFA and access control before this section.',
   80, true),
  ('d3000000-0000-0000-000b-000000000004',
   'd1000000-0000-0000-000b-000000000002',
   'course_section', 'post',
   'Identity & Access Management — Post-Assessment',
   'Verify that you can implement MFA and conditional access policies.',
   80, true)
ON CONFLICT (id) DO NOTHING;

-- Security Fundamentals — Section 3 assessments
INSERT INTO public.assessments (id, section_id, scope, type, name, description, pass_threshold, is_active) VALUES
  ('d3000000-0000-0000-000b-000000000005',
   'd1000000-0000-0000-000b-000000000003',
   'course_section', 'pre',
   'Endpoint & Network Security — Pre-Assessment',
   'Assess your prior knowledge of endpoint protection and network hardening.',
   80, true),
  ('d3000000-0000-0000-000b-000000000006',
   'd1000000-0000-0000-000b-000000000003',
   'course_section', 'post',
   'Endpoint & Network Security — Post-Assessment',
   'Confirm your understanding of EDR, firewall configuration, and patch management.',
   80, true)
ON CONFLICT (id) DO NOTHING;

-- Process Automation Guide — Section 1 assessments
INSERT INTO public.assessments (id, section_id, scope, type, name, description, pass_threshold, is_active) VALUES
  ('d3000000-0000-0000-000c-000000000001',
   'd1000000-0000-0000-000c-000000000001',
   'course_section', 'pre',
   'Identifying Automation Opportunities — Pre-Assessment',
   'Check what you already know about process mapping and automation potential.',
   80, true),
  ('d3000000-0000-0000-000c-000000000002',
   'd1000000-0000-0000-000c-000000000001',
   'course_section', 'post',
   'Identifying Automation Opportunities — Post-Assessment',
   'Verify you can map processes and build a prioritised automation backlog.',
   80, true)
ON CONFLICT (id) DO NOTHING;

-- Process Automation Guide — Section 2 assessments
INSERT INTO public.assessments (id, section_id, scope, type, name, description, pass_threshold, is_active) VALUES
  ('d3000000-0000-0000-000c-000000000003',
   'd1000000-0000-0000-000c-000000000002',
   'course_section', 'pre',
   'Building Automations — Pre-Assessment',
   'Test your familiarity with Power Automate before starting this section.',
   80, true),
  ('d3000000-0000-0000-000c-000000000004',
   'd1000000-0000-0000-000c-000000000002',
   'course_section', 'post',
   'Building Automations — Post-Assessment',
   'Confirm you can build, connect, and monitor Power Automate flows.',
   80, true)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Assessment Questions (3 per assessment)
-- ---------------------------------------------------------------------------

-- d3000000-0000-0000-000a-000000000001 : Cloud Fundamentals Pre
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000a-000000000001',
   'd3000000-0000-0000-000a-000000000001',
   'Which cloud service model gives you the most control over the underlying operating system?',
   '[{"label":"SaaS","value":"a","is_correct":false},{"label":"PaaS","value":"b","is_correct":false},{"label":"IaaS","value":"c","is_correct":true},{"label":"FaaS","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000a-000000000002',
   'd3000000-0000-0000-000a-000000000001',
   'What is the primary advantage of a public cloud deployment?',
   '[{"label":"Complete isolation from the internet","value":"a","is_correct":false},{"label":"On-demand scalability with no upfront capital expenditure","value":"b","is_correct":true},{"label":"Dedicated hardware for your organisation only","value":"c","is_correct":false},{"label":"Guaranteed on-premises latency","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000a-000000000003',
   'd3000000-0000-0000-000a-000000000001',
   'Which cloud model combines on-premises infrastructure with public cloud resources?',
   '[{"label":"Private cloud","value":"a","is_correct":false},{"label":"Community cloud","value":"b","is_correct":false},{"label":"Multi-cloud","value":"c","is_correct":false},{"label":"Hybrid cloud","value":"d","is_correct":true}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000a-000000000002 : Cloud Fundamentals Post
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000a-000000000004',
   'd3000000-0000-0000-000a-000000000002',
   'A company wants to run a web application without managing servers. Which service model is most appropriate?',
   '[{"label":"IaaS","value":"a","is_correct":false},{"label":"PaaS","value":"b","is_correct":true},{"label":"On-premises","value":"c","is_correct":false},{"label":"Private cloud","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000a-000000000005',
   'd3000000-0000-0000-000a-000000000002',
   'What does the cloud computing term "elasticity" mean?',
   '[{"label":"Data is always encrypted","value":"a","is_correct":false},{"label":"Resources can be scaled up or down automatically based on demand","value":"b","is_correct":true},{"label":"Backups are taken automatically","value":"c","is_correct":false},{"label":"Services are available 24/7","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000a-000000000006',
   'd3000000-0000-0000-000a-000000000002',
   'Which cloud service model is Microsoft 365 an example of?',
   '[{"label":"IaaS","value":"a","is_correct":false},{"label":"PaaS","value":"b","is_correct":false},{"label":"SaaS","value":"c","is_correct":true},{"label":"DaaS","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000a-000000000003 : Azure Core Services Pre
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000a-000000000007',
   'd3000000-0000-0000-000a-000000000003',
   'What is an Azure Resource Group?',
   '[{"label":"A type of virtual machine","value":"a","is_correct":false},{"label":"A container that holds related Azure resources","value":"b","is_correct":true},{"label":"A network security tool","value":"c","is_correct":false},{"label":"An Azure pricing tier","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000a-000000000008',
   'd3000000-0000-0000-000a-000000000003',
   'Which Azure service provides managed relational database hosting?',
   '[{"label":"Azure Blob Storage","value":"a","is_correct":false},{"label":"Azure Queue Storage","value":"b","is_correct":false},{"label":"Azure SQL Database","value":"c","is_correct":true},{"label":"Azure File Sync","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000a-000000000009',
   'd3000000-0000-0000-000a-000000000003',
   'What is the purpose of an Azure Virtual Network (VNet)?',
   '[{"label":"To store backups in the cloud","value":"a","is_correct":false},{"label":"To provide isolated private networking for Azure resources","value":"b","is_correct":true},{"label":"To manage user identities","value":"c","is_correct":false},{"label":"To deploy containerised applications","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000a-000000000004 : Azure Core Services Post
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000a-000000000010',
   'd3000000-0000-0000-000a-000000000004',
   'Which Azure storage service is best suited for storing large unstructured files such as images and videos?',
   '[{"label":"Azure Table Storage","value":"a","is_correct":false},{"label":"Azure Blob Storage","value":"b","is_correct":true},{"label":"Azure Queue Storage","value":"c","is_correct":false},{"label":"Azure File Storage","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000a-000000000011',
   'd3000000-0000-0000-000a-000000000004',
   'What is a Network Security Group (NSG) in Azure?',
   '[{"label":"A type of Azure subscription","value":"a","is_correct":false},{"label":"A firewall rule set controlling inbound and outbound traffic to Azure resources","value":"b","is_correct":true},{"label":"A managed identity service","value":"c","is_correct":false},{"label":"An Azure load balancer","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000a-000000000012',
   'd3000000-0000-0000-000a-000000000004',
   'Which VM size category is optimised for memory-intensive workloads in Azure?',
   '[{"label":"A-series","value":"a","is_correct":false},{"label":"B-series","value":"b","is_correct":false},{"label":"E-series","value":"c","is_correct":true},{"label":"F-series","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000a-000000000005 : Managing Cloud Resources Pre
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000a-000000000013',
   'd3000000-0000-0000-000a-000000000005',
   'What does RBAC stand for in Azure?',
   '[{"label":"Resource-Based Access Control","value":"a","is_correct":false},{"label":"Role-Based Access Control","value":"b","is_correct":true},{"label":"Remote Backup and Cloud","value":"c","is_correct":false},{"label":"Redundant Bandwidth and Capacity","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000a-000000000014',
   'd3000000-0000-0000-000a-000000000005',
   'Which Azure built-in role grants read-only access to all resources?',
   '[{"label":"Owner","value":"a","is_correct":false},{"label":"Contributor","value":"b","is_correct":false},{"label":"Reader","value":"c","is_correct":true},{"label":"User Access Administrator","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000a-000000000015',
   'd3000000-0000-0000-000a-000000000005',
   'What is the purpose of Azure tags?',
   '[{"label":"To set firewall rules on resources","value":"a","is_correct":false},{"label":"To organise and track resources for billing and management purposes","value":"b","is_correct":true},{"label":"To enable replication across regions","value":"c","is_correct":false},{"label":"To assign IP addresses to VMs","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000a-000000000006 : Managing Cloud Resources Post
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000a-000000000016',
   'd3000000-0000-0000-000a-000000000006',
   'What Azure feature helps you estimate and control cloud spending?',
   '[{"label":"Azure Monitor","value":"a","is_correct":false},{"label":"Azure Cost Management + Billing","value":"b","is_correct":true},{"label":"Azure Advisor","value":"c","is_correct":false},{"label":"Azure Policy","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000a-000000000017',
   'd3000000-0000-0000-000a-000000000006',
   'Which RBAC scope is the most granular in Azure?',
   '[{"label":"Management Group","value":"a","is_correct":false},{"label":"Subscription","value":"b","is_correct":false},{"label":"Resource Group","value":"c","is_correct":false},{"label":"Resource","value":"d","is_correct":true}]',
   2, 1),
  ('d4000000-0000-0000-000a-000000000018',
   'd3000000-0000-0000-000a-000000000006',
   'What does the principle of least privilege mean in cloud access management?',
   '[{"label":"Grant admin access to all team members for efficiency","value":"a","is_correct":false},{"label":"Only grant the minimum permissions needed to perform a specific task","value":"b","is_correct":true},{"label":"Remove all access after 90 days","value":"c","is_correct":false},{"label":"Use shared accounts for common tasks","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000b-000000000001 : Threat Landscape Pre
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000b-000000000001',
   'd3000000-0000-0000-000b-000000000001',
   'What is ransomware?',
   '[{"label":"A type of firewall","value":"a","is_correct":false},{"label":"Malware that encrypts victim files and demands payment for the decryption key","value":"b","is_correct":true},{"label":"A phishing email technique","value":"c","is_correct":false},{"label":"A backup tool","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000b-000000000002',
   'd3000000-0000-0000-000b-000000000001',
   'What is the most common initial attack vector for ransomware in SMBs?',
   '[{"label":"USB drive","value":"a","is_correct":false},{"label":"Physical server theft","value":"b","is_correct":false},{"label":"Phishing email with a malicious link or attachment","value":"c","is_correct":true},{"label":"Brute-force attack on the website","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000b-000000000003',
   'd3000000-0000-0000-000b-000000000001',
   'What is a supply chain attack?',
   '[{"label":"An attack targeting inventory management systems","value":"a","is_correct":false},{"label":"An attack that compromises a trusted vendor or software update to reach target organisations","value":"b","is_correct":true},{"label":"A denial-of-service attack against logistics companies","value":"c","is_correct":false},{"label":"An attack on physical delivery infrastructure","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000b-000000000002 : Threat Landscape Post
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000b-000000000004',
   'd3000000-0000-0000-000b-000000000002',
   'Which technique involves attackers moving from one compromised system to others within the same network?',
   '[{"label":"Phishing","value":"a","is_correct":false},{"label":"Lateral movement","value":"b","is_correct":true},{"label":"SQL injection","value":"c","is_correct":false},{"label":"Credential stuffing","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000b-000000000005',
   'd3000000-0000-0000-000b-000000000002',
   'What is pretexting in the context of social engineering?',
   '[{"label":"A type of network scan","value":"a","is_correct":false},{"label":"Creating a fabricated scenario to manipulate someone into disclosing information","value":"b","is_correct":true},{"label":"A firewall bypass technique","value":"c","is_correct":false},{"label":"Encrypting communications to avoid detection","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000b-000000000006',
   'd3000000-0000-0000-000b-000000000002',
   'What is the best defence against insider threats?',
   '[{"label":"Block all external email","value":"a","is_correct":false},{"label":"Disable USB ports","value":"b","is_correct":false},{"label":"Apply least-privilege access and monitor user activity with audit logs","value":"c","is_correct":true},{"label":"Require staff to use personal devices","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000b-000000000003 : Identity & Access Pre
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000b-000000000007',
   'd3000000-0000-0000-000b-000000000003',
   'What does MFA stand for?',
   '[{"label":"Managed Firewall Architecture","value":"a","is_correct":false},{"label":"Multi-Factor Authentication","value":"b","is_correct":true},{"label":"Malware Filtering Application","value":"c","is_correct":false},{"label":"Microsoft Federation Agent","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000b-000000000008',
   'd3000000-0000-0000-000b-000000000003',
   'Which MFA method is considered most secure?',
   '[{"label":"SMS one-time password","value":"a","is_correct":false},{"label":"Email magic link","value":"b","is_correct":false},{"label":"Authenticator app TOTP code","value":"c","is_correct":true},{"label":"Security question","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000b-000000000009',
   'd3000000-0000-0000-000b-000000000003',
   'What is the principle of least privilege?',
   '[{"label":"Giving all users admin rights for efficiency","value":"a","is_correct":false},{"label":"Granting only the minimum access rights required for a user to perform their job","value":"b","is_correct":true},{"label":"Limiting users to a single device","value":"c","is_correct":false},{"label":"Requiring all passwords to be at least 8 characters","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000b-000000000004 : Identity & Access Post
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000b-000000000010',
   'd3000000-0000-0000-000b-000000000004',
   'What does conditional access allow an organisation to do?',
   '[{"label":"Block all remote access","value":"a","is_correct":false},{"label":"Grant or deny access based on conditions like user location, device compliance, or risk level","value":"b","is_correct":true},{"label":"Automatically rotate passwords","value":"c","is_correct":false},{"label":"Encrypt email attachments","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000b-000000000011',
   'd3000000-0000-0000-000b-000000000004',
   'Which Entra ID feature helps enforce MFA when a user signs in from an unfamiliar location?',
   '[{"label":"Azure Backup","value":"a","is_correct":false},{"label":"Identity Protection with risk-based conditional access","value":"b","is_correct":true},{"label":"Azure Monitor","value":"c","is_correct":false},{"label":"Microsoft Defender for Cloud","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000b-000000000012',
   'd3000000-0000-0000-000b-000000000004',
   'What is Single Sign-On (SSO)?',
   '[{"label":"A backup authentication method used when MFA fails","value":"a","is_correct":false},{"label":"A method allowing users to authenticate once and access multiple applications without re-entering credentials","value":"b","is_correct":true},{"label":"A technique for encrypting passwords in transit","value":"c","is_correct":false},{"label":"A password sharing protocol","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000b-000000000005 : Endpoint & Network Pre
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000b-000000000013',
   'd3000000-0000-0000-000b-000000000005',
   'What does EDR stand for?',
   '[{"label":"Encrypted Data Repository","value":"a","is_correct":false},{"label":"Endpoint Detection and Response","value":"b","is_correct":true},{"label":"External Device Restriction","value":"c","is_correct":false},{"label":"Email Delivery Rule","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000b-000000000014',
   'd3000000-0000-0000-000b-000000000005',
   'What is the purpose of network segmentation?',
   '[{"label":"To increase internet speed","value":"a","is_correct":false},{"label":"To isolate different parts of the network to limit the spread of a breach","value":"b","is_correct":true},{"label":"To combine multiple internet connections","value":"c","is_correct":false},{"label":"To assign static IP addresses","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000b-000000000015',
   'd3000000-0000-0000-000b-000000000005',
   'How often should security patches be applied to endpoints in a managed environment?',
   '[{"label":"Once a year","value":"a","is_correct":false},{"label":"Only when there is a known attack","value":"b","is_correct":false},{"label":"On a regular schedule — typically monthly or sooner for critical patches","value":"c","is_correct":true},{"label":"Patches are optional","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000b-000000000006 : Endpoint & Network Post
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000b-000000000016',
   'd3000000-0000-0000-000b-000000000006',
   'What is a key advantage of EDR over traditional antivirus?',
   '[{"label":"EDR is cheaper","value":"a","is_correct":false},{"label":"EDR can detect and respond to threats that have never been seen before using behavioural analysis","value":"b","is_correct":true},{"label":"EDR does not require internet access","value":"c","is_correct":false},{"label":"EDR replaces firewalls entirely","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000b-000000000017',
   'd3000000-0000-0000-000b-000000000006',
   'What is a VLAN?',
   '[{"label":"A type of VPN","value":"a","is_correct":false},{"label":"A virtual local area network that segments devices into separate logical broadcast domains","value":"b","is_correct":true},{"label":"A virus scanner tool","value":"c","is_correct":false},{"label":"A cloud storage protocol","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000b-000000000018',
   'd3000000-0000-0000-000b-000000000006',
   'What does CIS Benchmarks provide for system hardening?',
   '[{"label":"A set of prescriptive configuration guidelines to securely configure operating systems and applications","value":"a","is_correct":true},{"label":"A cloud pricing comparison tool","value":"b","is_correct":false},{"label":"A type of firewall hardware","value":"c","is_correct":false},{"label":"A penetration testing framework","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000c-000000000001 : Identifying Automations Pre
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000c-000000000001',
   'd3000000-0000-0000-000c-000000000001',
   'Which characteristic makes a process a good candidate for automation?',
   '[{"label":"It involves complex human judgment","value":"a","is_correct":false},{"label":"It is repetitive, rule-based, and high-volume","value":"b","is_correct":true},{"label":"It happens once a year","value":"c","is_correct":false},{"label":"It requires creativity and intuition","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000c-000000000002',
   'd3000000-0000-0000-000c-000000000001',
   'What is a swimlane diagram used for in process mapping?',
   '[{"label":"To diagram server infrastructure","value":"a","is_correct":false},{"label":"To show which person or team is responsible for each step in a process","value":"b","is_correct":true},{"label":"To visualise network traffic","value":"c","is_correct":false},{"label":"To plan software sprints","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000c-000000000003',
   'd3000000-0000-0000-000c-000000000001',
   'What does ROI stand for in the context of automation investment?',
   '[{"label":"Rate of Infrastructure","value":"a","is_correct":false},{"label":"Return on Investment","value":"b","is_correct":true},{"label":"Risk of Implementation","value":"c","is_correct":false},{"label":"Ratio of Integration","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000c-000000000002 : Identifying Automations Post
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000c-000000000004',
   'd3000000-0000-0000-000c-000000000002',
   'When scoring automation candidates, which factor is most important to consider first?',
   '[{"label":"The cost of the automation tool","value":"a","is_correct":false},{"label":"Business impact — how much value the automation will deliver","value":"b","is_correct":true},{"label":"The number of connectors available","value":"c","is_correct":false},{"label":"Whether a template already exists","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000c-000000000005',
   'd3000000-0000-0000-000c-000000000002',
   'What is a value stream map?',
   '[{"label":"A list of software vendors","value":"a","is_correct":false},{"label":"A diagram showing the flow of materials and information from start to finish for a process","value":"b","is_correct":true},{"label":"A type of Gantt chart for project timelines","value":"c","is_correct":false},{"label":"A financial model for IT spend","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000c-000000000006',
   'd3000000-0000-0000-000c-000000000002',
   'What is "shadow IT" and why is it relevant to process automation?',
   '[{"label":"IT systems used only at night","value":"a","is_correct":false},{"label":"Unofficial tools and workarounds staff create to fill gaps — identifying these helps uncover automation opportunities","value":"b","is_correct":true},{"label":"Backup systems that run in parallel","value":"c","is_correct":false},{"label":"IT systems managed by an external provider","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000c-000000000003 : Building Automations Pre
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000c-000000000007',
   'd3000000-0000-0000-000c-000000000003',
   'What is Power Automate primarily used for?',
   '[{"label":"Creating Power BI dashboards","value":"a","is_correct":false},{"label":"Building automated workflows that connect apps and services","value":"b","is_correct":true},{"label":"Managing Azure virtual machines","value":"c","is_correct":false},{"label":"Writing PowerShell scripts","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000c-000000000008',
   'd3000000-0000-0000-000c-000000000003',
   'Which Power Automate flow type is triggered by a schedule (e.g. every day at 9am)?',
   '[{"label":"Instant flow","value":"a","is_correct":false},{"label":"Automated flow","value":"b","is_correct":false},{"label":"Scheduled flow","value":"c","is_correct":true},{"label":"Desktop flow","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000c-000000000009',
   'd3000000-0000-0000-000c-000000000003',
   'What Microsoft 365 licence is required to use Power Automate with premium connectors?',
   '[{"label":"Microsoft 365 Business Basic","value":"a","is_correct":false},{"label":"Power Automate Premium or per-flow plan","value":"b","is_correct":true},{"label":"Azure Free tier","value":"c","is_correct":false},{"label":"Microsoft 365 Apps for Business","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- d3000000-0000-0000-000c-000000000004 : Building Automations Post
INSERT INTO public.assessment_questions (id, assessment_id, question_text, options, sort_order, points) VALUES
  ('d4000000-0000-0000-000c-000000000010',
   'd3000000-0000-0000-000c-000000000004',
   'What is the purpose of a "Run after" configuration in Power Automate?',
   '[{"label":"To delay the start of a flow","value":"a","is_correct":false},{"label":"To control what happens after a step succeeds, fails, is skipped, or times out","value":"b","is_correct":true},{"label":"To schedule flows for a later date","value":"c","is_correct":false},{"label":"To chain two separate flows together","value":"d","is_correct":false}]',
   1, 1),
  ('d4000000-0000-0000-000c-000000000011',
   'd3000000-0000-0000-000c-000000000004',
   'Which Power Automate connector allows you to post a message to a Teams channel?',
   '[{"label":"SharePoint connector","value":"a","is_correct":false},{"label":"Microsoft Teams connector","value":"b","is_correct":true},{"label":"Office 365 Outlook connector","value":"c","is_correct":false},{"label":"Azure Service Bus connector","value":"d","is_correct":false}]',
   2, 1),
  ('d4000000-0000-0000-000c-000000000012',
   'd3000000-0000-0000-000c-000000000004',
   'What should you review in Power Automate to diagnose why a flow failed?',
   '[{"label":"The SharePoint list settings","value":"a","is_correct":false},{"label":"The flow run history, which shows each step''s input, output, and error details","value":"b","is_correct":true},{"label":"The Azure Activity Log","value":"c","is_correct":false},{"label":"The Microsoft 365 admin centre","value":"d","is_correct":false}]',
   3, 1)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- ENROLLMENT: Customer user enrolled in Cloud Infrastructure Basics
-- ---------------------------------------------------------------------------
INSERT INTO public.user_course_enrollments (id, user_id, course_id, enrolled_at, last_active_at, last_module_id) VALUES
  ('d5000000-0000-0000-000a-000000000001',
   'c0000000-0000-0000-0000-000000000002',   -- customer@acmesolutions.co.za
   'd0000000-0000-0000-000a-000000000001',   -- Cloud Infrastructure Basics
   now() - interval '5 days',
   now() - interval '1 day',
   'd2000000-0000-0000-000a-000000000004'    -- last viewed: Azure Virtual Machines (section 2, module 1)
  )
ON CONFLICT (user_id, course_id) DO NOTHING;

-- Section progress: Section 1 completed, Section 2 in progress
INSERT INTO public.user_section_progress (id, user_id, section_id, required, modules_completed, pre_assessment_passed, post_assessment_passed) VALUES
  -- Section 1: fully completed
  ('d6000000-0000-0000-000a-000000000001',
   'c0000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-000a-000000000001',
   true,
   '["d2000000-0000-0000-000a-000000000001","d2000000-0000-0000-000a-000000000002","d2000000-0000-0000-000a-000000000003"]',
   true,
   true),
  -- Section 2: in progress (1 of 3 modules watched, pre-assessment passed, post not yet)
  ('d6000000-0000-0000-000a-000000000002',
   'c0000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-000a-000000000002',
   true,
   '["d2000000-0000-0000-000a-000000000004"]',
   true,
   false)
ON CONFLICT (user_id, section_id) DO NOTHING;
