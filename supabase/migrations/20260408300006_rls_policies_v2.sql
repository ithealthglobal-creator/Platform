-- =============================================================================
-- Phase 3: RLS Policies V2 — Super Admin + Admin company-scoped access
-- =============================================================================
-- This migration drops all admin-only policies that use get_my_role() = 'admin'
-- or EXISTS(... role = 'admin') and replaces them with:
--   Template A (global tables): super_admin FOR ALL + admin FOR ALL
--   Template B (company-scoped): super_admin FOR ALL + admin scoped to company tree
-- Customer-facing policies are NOT touched.
-- =============================================================================

-- =============================================
-- SECTION 1: DROP ALL ADMIN-ONLY POLICIES
-- =============================================

-- From 20260402000006_rls_policies.sql
DROP POLICY IF EXISTS "Admins can do everything with companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can do everything with profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can do everything with menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can manage role_menu_access" ON public.role_menu_access;

-- From 20260403000009_layer1_rls_policies.sql
DROP POLICY IF EXISTS "Admins can do everything with phases" ON public.phases;
DROP POLICY IF EXISTS "Admins can do everything with products" ON public.products;
DROP POLICY IF EXISTS "Admins can do everything with cost_variables" ON public.cost_variables;
DROP POLICY IF EXISTS "Admins can do everything with verticals" ON public.verticals;
DROP POLICY IF EXISTS "Admins can do everything with personas" ON public.personas;
DROP POLICY IF EXISTS "Admins can do everything with pains" ON public.pains;
DROP POLICY IF EXISTS "Admins can do everything with gains" ON public.gains;
DROP POLICY IF EXISTS "Admins can do everything with skills" ON public.skills;

-- From 20260403100009_academy_rls_policies.sql
DROP POLICY IF EXISTS "Admins full access to courses" ON public.courses;
DROP POLICY IF EXISTS "Admins full access to course_sections" ON public.course_sections;
DROP POLICY IF EXISTS "Admins full access to course_modules" ON public.course_modules;
DROP POLICY IF EXISTS "Admins full access to assessments" ON public.assessments;
DROP POLICY IF EXISTS "Admins full access to assessment_questions" ON public.assessment_questions;
DROP POLICY IF EXISTS "Admins full access to assessment_attempts" ON public.assessment_attempts;
DROP POLICY IF EXISTS "Admins full access to certificates" ON public.certificates;
DROP POLICY IF EXISTS "Admins full access to user_section_progress" ON public.user_section_progress;

-- From 20260403200006_services_rls_policies.sql
DROP POLICY IF EXISTS "Admins full access to services" ON public.services;
DROP POLICY IF EXISTS "Admins full access to service_verticals" ON public.service_verticals;
DROP POLICY IF EXISTS "Admins full access to service_personas" ON public.service_personas;
DROP POLICY IF EXISTS "Admins full access to service_pains" ON public.service_pains;
DROP POLICY IF EXISTS "Admins full access to service_gains" ON public.service_gains;
DROP POLICY IF EXISTS "Admins full access to service_products" ON public.service_products;
DROP POLICY IF EXISTS "Admins full access to service_skills" ON public.service_skills;
DROP POLICY IF EXISTS "Admins full access to service_runbook_steps" ON public.service_runbook_steps;
DROP POLICY IF EXISTS "Admins full access to service_costing_items" ON public.service_costing_items;
DROP POLICY IF EXISTS "Admins full access to service_academy_links" ON public.service_academy_links;

-- From 20260403300006_public_website_rls.sql
DROP POLICY IF EXISTS "Admins can do everything with blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can do everything with testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admins can read contact_submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Admins can read partner_applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Admins can do everything with partners" ON public.partners;

-- From 20260405000005_onboarding_rls.sql (uses EXISTS pattern)
DROP POLICY IF EXISTS "Admin full access to sales_stages" ON public.sales_stages;
DROP POLICY IF EXISTS "Admin full access to sales_leads" ON public.sales_leads;

-- From 20260407100005_meta_ads_rls.sql
DROP POLICY IF EXISTS "Admins can do everything with meta_integrations" ON public.meta_integrations;
DROP POLICY IF EXISTS "Admins can do everything with meta_campaigns" ON public.meta_campaigns;
DROP POLICY IF EXISTS "Admins can do everything with meta_ad_sets" ON public.meta_ad_sets;
DROP POLICY IF EXISTS "Admins can do everything with meta_ads" ON public.meta_ads;

-- From 20260407400006_customer_services_rls.sql
DROP POLICY IF EXISTS "Admins full access to sla_templates" ON public.sla_templates;
DROP POLICY IF EXISTS "Admins full access to service_sla" ON public.service_sla;
DROP POLICY IF EXISTS "Admins full access to customer_contracts" ON public.customer_contracts;
DROP POLICY IF EXISTS "Admins full access to service_requests" ON public.service_requests;
DROP POLICY IF EXISTS "Admins full access to orders" ON public.orders;
DROP POLICY IF EXISTS "Admins full access to order_items" ON public.order_items;

-- From 20260407400008_create_payfast_integrations.sql
DROP POLICY IF EXISTS "Admins full access to payfast_integrations" ON public.payfast_integrations;

-- From 20260407600001_ai_agents_rls.sql (uses EXISTS pattern)
DROP POLICY IF EXISTS "admins_full_access_ai_agents" ON public.ai_agents;
DROP POLICY IF EXISTS "admins_only_ai_agent_tools" ON public.ai_agent_tools;
DROP POLICY IF EXISTS "admins_full_access_ai_agent_hierarchy" ON public.ai_agent_hierarchy;

-- From 20260407700000_support_tables.sql
DROP POLICY IF EXISTS "Admins full access to support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins full access to ticket_replies" ON public.ticket_replies;
DROP POLICY IF EXISTS "Admins full access to ticket_routing_rules" ON public.ticket_routing_rules;
DROP POLICY IF EXISTS "Admins full access to ticket_email_log" ON public.ticket_email_log;

-- From 20260408100002_company_branding_rls.sql
DROP POLICY IF EXISTS "Admins read own company branding" ON public.company_branding;
DROP POLICY IF EXISTS "Admins insert own company branding" ON public.company_branding;
DROP POLICY IF EXISTS "Admins update own company branding" ON public.company_branding;

-- From 20260408200002_website_content_rls.sql
DROP POLICY IF EXISTS "Admins read own company website content" ON public.website_content;
DROP POLICY IF EXISTS "Admins insert own company website content" ON public.website_content;
DROP POLICY IF EXISTS "Admins update own company website content" ON public.website_content;
DROP POLICY IF EXISTS "Admins delete own company website content" ON public.website_content;

-- Storage policies (branding bucket)
DROP POLICY IF EXISTS "Admins upload to own branding folder" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage own branding files" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete own branding files" ON storage.objects;

-- Storage policies (website-content bucket)
DROP POLICY IF EXISTS "Admins upload to own website-content folder" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage own website-content files" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete own website-content files" ON storage.objects;


-- =============================================
-- SECTION 2: CREATE REPLACEMENT POLICIES
-- =============================================

-- -----------------------------------------
-- Template B: companies (company-scoped, special tree logic)
-- -----------------------------------------
CREATE POLICY "Super admins full access to companies"
  ON public.companies FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage own company tree"
  ON public.companies FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND (id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id())
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id())
  );

-- -----------------------------------------
-- Template B: profiles (company-scoped, tree logic)
-- -----------------------------------------
CREATE POLICY "Super admins full access to profiles"
  ON public.profiles FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage own company tree profiles"
  ON public.profiles FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
    )
  );

-- -----------------------------------------
-- Template A: menu_items (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to menu_items"
  ON public.menu_items FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to menu_items"
  ON public.menu_items FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: role_menu_access (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to role_menu_access"
  ON public.role_menu_access FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage role_menu_access"
  ON public.role_menu_access FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: phases (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to phases"
  ON public.phases FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to phases"
  ON public.phases FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: products (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to products"
  ON public.products FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to products"
  ON public.products FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: cost_variables (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to cost_variables"
  ON public.cost_variables FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to cost_variables"
  ON public.cost_variables FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: verticals (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to verticals"
  ON public.verticals FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to verticals"
  ON public.verticals FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: personas (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to personas"
  ON public.personas FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to personas"
  ON public.personas FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: pains (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to pains"
  ON public.pains FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to pains"
  ON public.pains FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: gains (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to gains"
  ON public.gains FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to gains"
  ON public.gains FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: skills (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to skills"
  ON public.skills FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to skills"
  ON public.skills FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: courses (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to courses"
  ON public.courses FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to courses"
  ON public.courses FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: course_sections (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to course_sections"
  ON public.course_sections FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to course_sections"
  ON public.course_sections FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: course_modules (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to course_modules"
  ON public.course_modules FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to course_modules"
  ON public.course_modules FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: assessments (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to assessments"
  ON public.assessments FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to assessments"
  ON public.assessments FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: assessment_questions (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to assessment_questions"
  ON public.assessment_questions FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to assessment_questions"
  ON public.assessment_questions FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: services (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to services"
  ON public.services FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to services"
  ON public.services FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: service_verticals (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to service_verticals"
  ON public.service_verticals FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to service_verticals"
  ON public.service_verticals FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: service_personas (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to service_personas"
  ON public.service_personas FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to service_personas"
  ON public.service_personas FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: service_pains (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to service_pains"
  ON public.service_pains FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to service_pains"
  ON public.service_pains FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: service_gains (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to service_gains"
  ON public.service_gains FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to service_gains"
  ON public.service_gains FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: service_products (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to service_products"
  ON public.service_products FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to service_products"
  ON public.service_products FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: service_skills (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to service_skills"
  ON public.service_skills FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to service_skills"
  ON public.service_skills FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: service_runbook_steps (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to service_runbook_steps"
  ON public.service_runbook_steps FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to service_runbook_steps"
  ON public.service_runbook_steps FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: service_costing_items (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to service_costing_items"
  ON public.service_costing_items FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to service_costing_items"
  ON public.service_costing_items FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: service_academy_links (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to service_academy_links"
  ON public.service_academy_links FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to service_academy_links"
  ON public.service_academy_links FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: blog_posts (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to blog_posts"
  ON public.blog_posts FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to blog_posts"
  ON public.blog_posts FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: testimonials (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to testimonials"
  ON public.testimonials FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to testimonials"
  ON public.testimonials FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: contact_submissions (admin read only)
-- -----------------------------------------
CREATE POLICY "Super admins read contact_submissions"
  ON public.contact_submissions FOR SELECT
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins read contact_submissions"
  ON public.contact_submissions FOR SELECT
  USING (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: partner_applications (admin read only)
-- -----------------------------------------
CREATE POLICY "Super admins read partner_applications"
  ON public.partner_applications FOR SELECT
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins read partner_applications"
  ON public.partner_applications FOR SELECT
  USING (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: partners (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to partners"
  ON public.partners FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to partners"
  ON public.partners FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: sales_stages (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to sales_stages"
  ON public.sales_stages FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to sales_stages"
  ON public.sales_stages FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: sales_leads (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to sales_leads"
  ON public.sales_leads FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to sales_leads"
  ON public.sales_leads FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: meta_integrations (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to meta_integrations"
  ON public.meta_integrations FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to meta_integrations"
  ON public.meta_integrations FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: meta_campaigns (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to meta_campaigns"
  ON public.meta_campaigns FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to meta_campaigns"
  ON public.meta_campaigns FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: meta_ad_sets (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to meta_ad_sets"
  ON public.meta_ad_sets FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to meta_ad_sets"
  ON public.meta_ad_sets FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: meta_ads (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to meta_ads"
  ON public.meta_ads FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to meta_ads"
  ON public.meta_ads FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: ai_agents (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to ai_agents"
  ON public.ai_agents FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to ai_agents"
  ON public.ai_agents FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: ai_agent_tools (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to ai_agent_tools"
  ON public.ai_agent_tools FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to ai_agent_tools"
  ON public.ai_agent_tools FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template A: ai_agent_hierarchy (global)
-- -----------------------------------------
CREATE POLICY "Super admins full access to ai_agent_hierarchy"
  ON public.ai_agent_hierarchy FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to ai_agent_hierarchy"
  ON public.ai_agent_hierarchy FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template B: sla_templates (company-scoped)
-- -----------------------------------------
CREATE POLICY "Super admins full access to sla_templates"
  ON public.sla_templates FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to sla_templates"
  ON public.sla_templates FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template B: service_sla (company-scoped)
-- -----------------------------------------
CREATE POLICY "Super admins full access to service_sla"
  ON public.service_sla FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to service_sla"
  ON public.service_sla FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template B: customer_contracts (company-scoped)
-- -----------------------------------------
CREATE POLICY "Super admins full access to customer_contracts"
  ON public.customer_contracts FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage own company tree customer_contracts"
  ON public.customer_contracts FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
    )
  );

-- -----------------------------------------
-- Template B: service_requests (company-scoped)
-- -----------------------------------------
CREATE POLICY "Super admins full access to service_requests"
  ON public.service_requests FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage own company tree service_requests"
  ON public.service_requests FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
    )
  );

-- -----------------------------------------
-- Template B: orders (company-scoped)
-- -----------------------------------------
CREATE POLICY "Super admins full access to orders"
  ON public.orders FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage own company tree orders"
  ON public.orders FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
    )
  );

-- -----------------------------------------
-- Template B: order_items (company-scoped via order)
-- -----------------------------------------
CREATE POLICY "Super admins full access to order_items"
  ON public.order_items FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage own company tree order_items"
  ON public.order_items FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND order_id IN (
      SELECT id FROM public.orders
      WHERE company_id IN (
        SELECT id FROM public.companies
        WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
      )
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND order_id IN (
      SELECT id FROM public.orders
      WHERE company_id IN (
        SELECT id FROM public.companies
        WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
      )
    )
  );

-- -----------------------------------------
-- Template B: payfast_integrations (company-scoped)
-- -----------------------------------------
CREATE POLICY "Super admins full access to payfast_integrations"
  ON public.payfast_integrations FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage own company tree payfast_integrations"
  ON public.payfast_integrations FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
    )
  );

-- -----------------------------------------
-- Template B: support_tickets (company-scoped)
-- -----------------------------------------
CREATE POLICY "Super admins full access to support_tickets"
  ON public.support_tickets FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage own company tree support_tickets"
  ON public.support_tickets FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
    )
  );

-- -----------------------------------------
-- Template B: ticket_replies (company-scoped via ticket)
-- -----------------------------------------
CREATE POLICY "Super admins full access to ticket_replies"
  ON public.ticket_replies FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage own company tree ticket_replies"
  ON public.ticket_replies FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE company_id IN (
        SELECT id FROM public.companies
        WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
      )
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE company_id IN (
        SELECT id FROM public.companies
        WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
      )
    )
  );

-- -----------------------------------------
-- Template B: ticket_routing_rules (admin-only, no company_id — use Template A)
-- -----------------------------------------
CREATE POLICY "Super admins full access to ticket_routing_rules"
  ON public.ticket_routing_rules FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to ticket_routing_rules"
  ON public.ticket_routing_rules FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template B: ticket_email_log (admin-only, no company_id — use Template A)
-- -----------------------------------------
CREATE POLICY "Super admins full access to ticket_email_log"
  ON public.ticket_email_log FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins full access to ticket_email_log"
  ON public.ticket_email_log FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- -----------------------------------------
-- Template B: assessment_attempts (company-scoped via user)
-- -----------------------------------------
CREATE POLICY "Super admins full access to assessment_attempts"
  ON public.assessment_attempts FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage own company tree assessment_attempts"
  ON public.assessment_attempts FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND user_id IN (
      SELECT id FROM public.profiles
      WHERE company_id IN (
        SELECT id FROM public.companies
        WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
      )
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND user_id IN (
      SELECT id FROM public.profiles
      WHERE company_id IN (
        SELECT id FROM public.companies
        WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
      )
    )
  );

-- -----------------------------------------
-- Template B: certificates (company-scoped via user)
-- -----------------------------------------
CREATE POLICY "Super admins full access to certificates"
  ON public.certificates FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage own company tree certificates"
  ON public.certificates FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND user_id IN (
      SELECT id FROM public.profiles
      WHERE company_id IN (
        SELECT id FROM public.companies
        WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
      )
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND user_id IN (
      SELECT id FROM public.profiles
      WHERE company_id IN (
        SELECT id FROM public.companies
        WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
      )
    )
  );

-- -----------------------------------------
-- Template B: user_section_progress (company-scoped via user)
-- -----------------------------------------
CREATE POLICY "Super admins full access to user_section_progress"
  ON public.user_section_progress FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage own company tree user_section_progress"
  ON public.user_section_progress FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND user_id IN (
      SELECT id FROM public.profiles
      WHERE company_id IN (
        SELECT id FROM public.companies
        WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
      )
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND user_id IN (
      SELECT id FROM public.profiles
      WHERE company_id IN (
        SELECT id FROM public.companies
        WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
      )
    )
  );

-- -----------------------------------------
-- Template B: team_invitations (company-scoped)
-- Note: team_invitations already has a "Company admins manage" policy
-- which is company_admin-based, not role-based. We add super_admin + admin.
-- -----------------------------------------
CREATE POLICY "Super admins full access to team_invitations"
  ON public.team_invitations FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage own company tree team_invitations"
  ON public.team_invitations FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id()
    )
  );

-- -----------------------------------------
-- company_branding: super_admin SELECT/INSERT/UPDATE (no DELETE)
-- -----------------------------------------
CREATE POLICY "Super admins read company branding"
  ON public.company_branding FOR SELECT
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Super admins insert company branding"
  ON public.company_branding FOR INSERT
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Super admins update company branding"
  ON public.company_branding FOR UPDATE
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- Admin: scoped to own company
CREATE POLICY "Admins read own company branding"
  ON public.company_branding FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

CREATE POLICY "Admins insert own company branding"
  ON public.company_branding FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

CREATE POLICY "Admins update own company branding"
  ON public.company_branding FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

-- -----------------------------------------
-- website_content: super_admin full CRUD
-- -----------------------------------------
CREATE POLICY "Super admins full access to website_content"
  ON public.website_content FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- Admin: scoped to own company
CREATE POLICY "Admins read own company website content"
  ON public.website_content FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

CREATE POLICY "Admins insert own company website content"
  ON public.website_content FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

CREATE POLICY "Admins update own company website content"
  ON public.website_content FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

CREATE POLICY "Admins delete own company website content"
  ON public.website_content FOR DELETE
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

-- =============================================
-- SECTION 3: STORAGE BUCKET POLICIES
-- =============================================

-- Branding bucket: update to support admin OR super_admin
CREATE POLICY "Admin or super_admin upload to own branding folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admin or super_admin manage own branding files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admin or super_admin delete own branding files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Website-content bucket: update to support admin OR super_admin
CREATE POLICY "Admin or super_admin upload to own website-content folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'website-content'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admin or super_admin manage own website-content files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'website-content'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admin or super_admin delete own website-content files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'website-content'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() IN ('admin', 'super_admin')
  );
