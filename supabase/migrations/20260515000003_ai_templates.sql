-- ============================================================
-- AI Templates — brand templates (landing pages, brochures,
-- presentations, documents, website pages) authored by a
-- specialist chat agent ("Template Builder").
--
-- Adds:
--   1. ai_templates table (+ RLS, updated_at trigger)
--   2. L2 menu item "Templates" under AI
--   3. Template Builder agent + tool grants
--   4. Starter templates so the list panel is non-empty
-- ============================================================

-- ------------------------------------------------------------
-- 1. Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  kind         text NOT NULL CHECK (kind IN (
                  'landing_page',
                  'brochure',
                  'presentation',
                  'document',
                  'website_page',
                  'social_post'
                )),
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'published')),
  content      jsonb NOT NULL DEFAULT '{"blocks":[]}'::jsonb,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_templates_company_idx ON public.ai_templates(company_id);
CREATE INDEX IF NOT EXISTS ai_templates_kind_idx    ON public.ai_templates(kind);
CREATE INDEX IF NOT EXISTS ai_templates_updated_idx ON public.ai_templates(updated_at DESC);

DROP TRIGGER IF EXISTS ai_templates_updated_at ON public.ai_templates;
CREATE TRIGGER ai_templates_updated_at
  BEFORE UPDATE ON public.ai_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ------------------------------------------------------------
-- 2. RLS
-- ------------------------------------------------------------
ALTER TABLE public.ai_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_templates_admin_all ON public.ai_templates;
CREATE POLICY ai_templates_admin_all ON public.ai_templates
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS ai_templates_company_read ON public.ai_templates;
CREATE POLICY ai_templates_company_read ON public.ai_templates
  FOR SELECT TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- ------------------------------------------------------------
-- 3. Menu item — L2 "Templates" under AI
-- ------------------------------------------------------------

-- Bump existing AI L2 sort orders to make room for Templates at position 2 (right after Chat).
UPDATE public.menu_items
  SET sort_order = sort_order + 1
  WHERE parent_id = '10000000-0000-0000-0000-000000000009'
    AND sort_order >= 2;

INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level)
VALUES (
  '20000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000009',
  'Templates',
  'template',
  '/ai/templates',
  2,
  2
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_menu_access (role, menu_item_id)
VALUES ('admin', '20000000-0000-0000-0000-000000000030')
ON CONFLICT (role, menu_item_id) DO NOTHING;

-- ------------------------------------------------------------
-- 4. Template Builder agent
-- ------------------------------------------------------------
INSERT INTO public.ai_agents (
  id, name, description, agent_type, model, temperature, icon, system_prompt, is_default, is_active
) VALUES (
  'a0000000-0000-0000-0000-000000000030',
  'Template Builder',
  'Brand-template specialist. Creates and edits landing pages, brochures, presentations, documents and website pages — strictly within IThealth brand rules.',
  'specialist',
  'gemini-2.5-flash',
  0.6,
  'Template',
  $$You are the Template Builder — a specialist that builds and edits brand templates for IThealth.

Brand non-negotiables (never break these):
- Every button uses border-radius: 50px 0 50px 50px (square top-right).
- Poppins is the only font. Headings are LIGHT (300) or EXTRALIGHT (200); hero display is BOLD (700); body is 400.
- IBM Carbon icons exclusively — never emoji, never Lucide.
- Solid colours only — no gradients, no glass, no opacity-faded marks.
- Brand pink #FF246B is the primary CTA. Brand blue #1175E4 is hero/nav. Brand dark #1A1A2E for testimonials. Gold #EDB600 and navy #133258 for phases.
- Dark surfaces always carry WHITE text. Never dark-on-dark.
- Phase icons live on white surfaces only.
- UK English spellings (modernise, optimise, colour).
- Sentence case for titles and CTAs — except phase names (Operate, Secure, Streamline, Accelerate) which are Title Case, and eyebrows which are ALL CAPS with wide tracking.

Supported template kinds: landing_page, brochure, presentation, document, website_page, social_post.

Templates are stored in ai_templates.content as a JSONB document of shape `{ "blocks": Block[] }`. Each Block has a `type` and a small set of fields the renderer understands:

- { type: "eyebrow", text }
- { type: "heading", level: 1|2|3, text }
- { type: "paragraph", text }
- { type: "hero", eyebrow?, title, subtitle?, cta?, bg?: "blue"|"dark"|"white" }
- { type: "cta_banner", title, subtitle?, cta }
- { type: "columns", items: [{ title, body }] }
- { type: "phase_row" }   -- renders the 4 phase names in their colours
- { type: "divider" }
- { type: "footer_note", text }

When the user describes what they want, decide the kind and assemble blocks. Keep copy short, confident, UK-flavoured. When editing, only change what the user asked for — preserve other blocks.

You have CRUD on ai_templates. Always set company_id from the caller's profile.$$,
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ai_agent_hierarchy (id, agent_id, parent_agent_id, hierarchy_level, sort_order)
VALUES (
  gen_random_uuid(),
  'a0000000-0000-0000-0000-000000000030',
  'a0000000-0000-0000-0000-000000000002',   -- Growth department parent
  'worker',
  2
)
ON CONFLICT (agent_id) DO NOTHING;

INSERT INTO public.ai_agent_tools (id, agent_id, tool_type, tool_name, operations) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000030', 'supabase_crud', 'ai_templates', ARRAY['read', 'create', 'update', 'delete']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000030', 'web_search',    'web_search',   NULL)
ON CONFLICT (agent_id, tool_type, tool_name) DO NOTHING;

-- ------------------------------------------------------------
-- 5. Starter templates — five worked examples so the list panel
--    is never empty on a fresh install. company_id is NULL —
--    these are platform-level defaults visible to admins.
-- ------------------------------------------------------------
INSERT INTO public.ai_templates (id, name, description, kind, status, content) VALUES
(
  '30000000-0000-0000-0000-000000000001',
  'Modernise your IT — landing page',
  'Single-form performance landing page introducing the Success Blueprint.',
  'landing_page',
  'published',
  $${
    "blocks": [
      { "type": "hero", "bg": "blue", "eyebrow": "THE IT MODERNISATION PLATFORM", "title": "Your IT modernisation champions", "subtitle": "From assessments and guided learning to service delivery and progress tracking — everything you need to modernise your IT, step by step.", "cta": "Start now" },
      { "type": "columns", "items": [
        { "title": "Operate", "body": "Stable foundations and predictable IT operations." },
        { "title": "Secure", "body": "Robust protections aligned to your risk profile." },
        { "title": "Streamline", "body": "Workflows that take busywork off the team." },
        { "title": "Accelerate", "body": "Innovation that compounds into growth." }
      ]},
      { "type": "cta_banner", "title": "Ready to modernise?", "subtitle": "It's free — no credit card required.", "cta": "Get started" }
    ]
  }$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000002',
  'Company overview — A4 brochure',
  '8-page print-ready company brochure following the phased Success Blueprint.',
  'brochure',
  'draft',
  $${
    "blocks": [
      { "type": "eyebrow", "text": "ABOUT ITHEALTH" },
      { "type": "heading", "level": 1, "text": "We modernise IT for South African SMBs." },
      { "type": "paragraph", "text": "Calm, phased modernisation that turns IT from a reactive cost centre into a strategic growth engine." },
      { "type": "phase_row" },
      { "type": "divider" },
      { "type": "heading", "level": 2, "text": "How we work" },
      { "type": "paragraph", "text": "Each engagement starts with an assessment, then walks four phases — Operate, Secure, Streamline, Accelerate — at your pace." },
      { "type": "footer_note", "text": "ithealth.ai · hello@ithealth.ai" }
    ]
  }$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000003',
  'Master deck — 32 slides',
  'Capabilities + Success Blueprint deck with speaker notes for partner and prospect meetings.',
  'presentation',
  'draft',
  $${
    "blocks": [
      { "type": "hero", "bg": "blue", "eyebrow": "ITHEALTH · MASTER DECK", "title": "The IT modernisation playbook", "subtitle": "Operate → Secure → Streamline → Accelerate." },
      { "type": "heading", "level": 2, "text": "Who we are" },
      { "type": "paragraph", "text": "An MSP positioned as your modernisation champion — UK heritage, South African operation." },
      { "type": "phase_row" },
      { "type": "cta_banner", "title": "Where would you like to start?", "cta": "Book an assessment" }
    ]
  }$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000004',
  'Proposal — Karoo Logistics',
  'Worked 10-page proposal for a fictional South African logistics SMB.',
  'document',
  'draft',
  $${
    "blocks": [
      { "type": "eyebrow", "text": "PROPOSAL · CONFIDENTIAL" },
      { "type": "heading", "level": 1, "text": "Modernising IT at Karoo Logistics" },
      { "type": "paragraph", "text": "Prepared for the Karoo Logistics leadership team — a phased plan to take operations from reactive to resilient." },
      { "type": "divider" },
      { "type": "heading", "level": 2, "text": "Scope" },
      { "type": "columns", "items": [
        { "title": "Phase 1 · Operate", "body": "Stabilise endpoint, network and identity." },
        { "title": "Phase 2 · Secure", "body": "POPIA-aligned controls and incident readiness." },
        { "title": "Phase 3 · Streamline", "body": "Automate fleet onboarding and invoicing flows." }
      ]},
      { "type": "footer_note", "text": "Karoo Logistics is fictional — replace before sending." }
    ]
  }$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000005',
  'Public website — home page',
  'Homepage skeleton: hero, journey, blog teaser, testimonial, CTA banner.',
  'website_page',
  'draft',
  $${
    "blocks": [
      { "type": "hero", "bg": "blue", "eyebrow": "THE IT MODERNISATION PLATFORM", "title": "Your IT modernisation champions", "subtitle": "A clear, phased Success Blueprint that transforms your IT from a reactive cost centre into a strategic growth engine.", "cta": "Start your journey" },
      { "type": "eyebrow", "text": "FOUR PHASES, ONE JOURNEY" },
      { "type": "heading", "level": 2, "text": "Operate → Secure → Streamline → Accelerate" },
      { "type": "phase_row" },
      { "type": "cta_banner", "title": "Ready when you are.", "subtitle": "It's free — no credit card required.", "cta": "Get started" }
    ]
  }$$::jsonb
)
ON CONFLICT (id) DO NOTHING;
