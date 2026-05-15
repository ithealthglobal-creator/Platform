-- ============================================================
-- Seed the full IThealth design-system template catalogue into
-- ai_templates. Replaces the 5 placeholder starter rows from
-- 20260515000003 with the real inventory exported from the
-- Claude Design bundle:
--
--   12 landing pages   (one per LP variant 01-12)
--    2 brochures       (company + services)
--    1 presentation    (master deck — 32 slides)
--    1 document        (Karoo Logistics proposal)
--    3 website pages   (public home, admin, customer portal)
--    5 social posts    (LinkedIn, X, Facebook, IG square, IG story)
-- ============================================================

-- Clear the placeholder rows from the previous migration.
DELETE FROM public.ai_templates
WHERE id IN (
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000004',
  '30000000-0000-0000-0000-000000000005'
);

-- ------------------------------------------------------------
-- Landing pages (1XX)
-- ------------------------------------------------------------
INSERT INTO public.ai_templates (id, name, description, kind, status, content) VALUES
(
  '30000000-0000-0000-0000-000000000101',
  'LP 01 — Bold hero',
  'Single-column, oversized hero on solid brand-primary blue. Highest-impact opener for cold traffic.',
  'landing_page',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"blue","eyebrow":"THE IT MODERNISATION PLATFORM","title":"IT that grows with you","subtitle":"From assessments and guided learning to service delivery and progress tracking — everything you need to modernise, step by step.","cta":"Start now"},
    {"type":"cta_banner","title":"Ready to modernise?","subtitle":"It's free — no credit card required.","cta":"Get started"}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000102',
  'LP 02 — Hero + journey strip',
  'Hero followed by a phase-row strip that walks visitors through Operate → Secure → Streamline → Accelerate.',
  'landing_page',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"blue","eyebrow":"THE MODERNISATION JOURNEY","title":"Modernise your IT — one phase at a time","subtitle":"A calm, four-phase Success Blueprint that takes you from reactive firefighting to genuine growth.","cta":"Start your journey"},
    {"type":"phase_row"},
    {"type":"cta_banner","title":"Ready when you are.","subtitle":"It's free — no credit card required.","cta":"Get started"}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000103',
  'LP 03 — Hero + product shot',
  'Concise hero next to a product screenshot — for visitors who want to see the platform before they read about it.',
  'landing_page',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"blue","eyebrow":"THE IT MODERNISATION PLATFORM","title":"Modernise your IT.","subtitle":"One workspace for the assessment, the plan, the delivery, and the proof it's working.","cta":"See it in action"},
    {"type":"cta_banner","title":"Want a tour?","cta":"Book a 15-minute walkthrough"}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000104',
  'LP 04 — Hero + 3 value props',
  'Hero with three column tiles underneath — works for prospects who skim before they read.',
  'landing_page',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"blue","eyebrow":"THE IT MODERNISATION PLATFORM","title":"IT that grows with you","subtitle":"Calm, phased modernisation — no rip-and-replace, no jargon.","cta":"Start now"},
    {"type":"columns","items":[
      {"title":"Assess in 48 hours","body":"A senior consultant walks your stack and hands back a phased plan you can actually use."},
      {"title":"Phase, don't panic","body":"Operate → Secure → Streamline → Accelerate. Move at the pace your team and budget can sustain."},
      {"title":"Proof, not promises","body":"Every phase ships measurable outcomes — uptime, response time, secured endpoints."}
    ]},
    {"type":"cta_banner","title":"Ready to modernise?","cta":"Get started"}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000105',
  'LP 05 — Hero + stats strip',
  'Quantified social proof below the hero — for stakeholders who want hard numbers up front.',
  'landing_page',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"blue","eyebrow":"PROVEN MODERNISATION","title":"The numbers our customers see in 90 days","subtitle":"Real outcomes from the first phase of the Success Blueprint — measured, not marketed.","cta":"Start your 90 days"},
    {"type":"columns","items":[
      {"title":"99.7%","body":"Average uptime across managed endpoints in Operate."},
      {"title":"38%","body":"Reduction in mean ticket-resolution time after Secure."},
      {"title":"4.6 / 5","body":"Customer-satisfaction score across active engagements."}
    ]}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000106',
  'LP 06 — Hero + testimonial',
  'Hero plus a single, large-format customer quote on a dark surface.',
  'landing_page',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"blue","eyebrow":"REAL CUSTOMERS","title":"Modernise IT, in good hands","subtitle":"You don't need another vendor — you need a champion who's done this dozens of times.","cta":"Talk to us"},
    {"type":"heading","level":2,"text":"“We finally have IT that the leadership team trusts.”"},
    {"type":"paragraph","text":"— Operations Director, mid-market logistics SMB"},
    {"type":"cta_banner","title":"Hear more stories.","cta":"See case studies"}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000107',
  'LP 07 — Long-form (free baseline)',
  'Long-scroll page selling a free 48-hour modernisation baseline. Best for warm traffic that wants detail.',
  'landing_page',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"blue","eyebrow":"FREE · 48-HOUR BASELINE","title":"Get your modernisation baseline.","subtitle":"No card, no commitment. A senior consultant walks your stack, scores each phase, and emails you a plan you can actually use.","cta":"Claim your baseline"},
    {"type":"eyebrow","text":"WHAT'S INCLUDED"},
    {"type":"columns","items":[
      {"title":"Hour 0–4","body":"Discovery call — what you run, what hurts, what's on the wishlist."},
      {"title":"Hour 4–40","body":"Async audit — endpoints, identity, backup, security posture, vendor sprawl."},
      {"title":"Hour 40–48","body":"Phased plan delivered as a 6-page PDF, scored against the four phases."}
    ]},
    {"type":"divider"},
    {"type":"heading","level":2,"text":"Why we give it away"},
    {"type":"paragraph","text":"Because the businesses who get the most out of modernisation are the ones who can see exactly where they are first. The baseline is the conversation starter."},
    {"type":"cta_banner","title":"Ready in 48 hours.","cta":"Start the baseline"}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000108',
  'LP 08 — Split-screen hero',
  'Half-pink, half-blue split hero. Use for campaigns that need to bridge two audiences (e.g. CFO + CTO).',
  'landing_page',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"blue","eyebrow":"FOR CTOs AND CFOs","title":"Modernise","subtitle":"Half the page is for the engineer who has to make it work. Half is for the finance lead who has to sign it off.","cta":"Get the brief"},
    {"type":"columns","items":[
      {"title":"For your CTO","body":"A phased plan with named owners, real success metrics, and no rip-and-replace."},
      {"title":"For your CFO","body":"Predictable monthly cost, no capex surprises, and outcomes you can put on a board pack."}
    ]}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000109',
  'LP 09 — Dark mode hero',
  'Dark-surface hero (brand-dark) — for premium / enterprise-flavoured campaigns.',
  'landing_page',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"dark","eyebrow":"ENTERPRISE-GRADE, SMB-PRICED","title":"Modernise your IT, without the noise.","subtitle":"For SMBs who want enterprise discipline without the enterprise vendor circus.","cta":"Speak to a champion"}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000110',
  'LP 10 — Champion-led hero',
  'Personality-led page anchored to a single named "Modernisation Champion". Works for warm referral traffic.',
  'landing_page',
  'published',
  $${"blocks":[
    {"type":"eyebrow","text":"MEET YOUR CHAMPION"},
    {"type":"heading","level":1,"text":"A senior IT brain on speed-dial — without the senior IT salary."},
    {"type":"paragraph","text":"Every customer gets a named Modernisation Champion — a senior consultant who owns the relationship, the plan, and the outcome."},
    {"type":"cta_banner","title":"Meet your champion.","cta":"Book the intro call"}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000111',
  'LP 11 — Service-led hero',
  'Single-service deep-dive (e.g. "MFA everywhere"). Use one per service in the catalogue.',
  'landing_page',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"blue","eyebrow":"SECURE PHASE · MFA ROLL-OUT","title":"Roll out MFA everywhere — without the user-experience disaster.","subtitle":"A phased rollout that pilots, communicates, and supports — so adoption sticks instead of stalling at 40%.","cta":"Start the rollout"},
    {"type":"eyebrow","text":"WHAT YOU GET"},
    {"type":"columns","items":[
      {"title":"Pilot","body":"Two-week pilot with the IT team to surface the rough edges before everyone else hits them."},
      {"title":"Comms","body":"User-facing comms drafted, branded and scheduled — no internal copywriting tax."},
      {"title":"Support","body":"Two weeks of post-launch hand-holding for stragglers and edge cases."}
    ]},
    {"type":"eyebrow","text":"PRICING"},
    {"type":"paragraph","text":"Fixed price, per seat, no surprises. From R450 per seat for SMBs under 50 users."}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000112',
  'LP 12 — Form-first',
  'Above-the-fold form on a dark surface. Highest-converting pattern for paid-search bottom-funnel traffic.',
  'landing_page',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"dark","eyebrow":"FREE · 48-HOUR BASELINE","title":"Get your modernisation baseline.","subtitle":"Drop your details. A senior consultant comes back within one working day.","cta":"Send me the baseline"}
  ]}$$::jsonb
);

-- ------------------------------------------------------------
-- Brochures (2XX)
-- ------------------------------------------------------------
INSERT INTO public.ai_templates (id, name, description, kind, status, content) VALUES
(
  '30000000-0000-0000-0000-000000000201',
  'Brochure — Company (A4, 8pp)',
  'Print-ready 8-page company brochure following the phased Success Blueprint. Save-as-PDF.',
  'brochure',
  'published',
  $${"blocks":[
    {"type":"eyebrow","text":"ABOUT ITHEALTH"},
    {"type":"heading","level":1,"text":"We modernise IT for South African SMBs."},
    {"type":"paragraph","text":"Calm, phased modernisation that turns IT from a reactive cost centre into a strategic growth engine."},
    {"type":"phase_row"},
    {"type":"divider"},
    {"type":"heading","level":2,"text":"How we work"},
    {"type":"paragraph","text":"Each engagement starts with a 48-hour baseline assessment, then walks the four phases — Operate, Secure, Streamline, Accelerate — at the pace your team and budget can sustain."},
    {"type":"divider"},
    {"type":"heading","level":2,"text":"Who we work with"},
    {"type":"columns","items":[
      {"title":"Logistics","body":"Fleet, depot and POPIA-aligned identity for distributed teams."},
      {"title":"Professional services","body":"Identity, device, and document hygiene for trust-led firms."},
      {"title":"Hospitality","body":"Point-of-sale, guest-WiFi and seasonal-headcount IT that just works."}
    ]},
    {"type":"footer_note","text":"ithealth.ai · hello@ithealth.ai"}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000202',
  'Brochure — Services (A4, 8pp)',
  '8-page services brochure walking the catalogue phase-by-phase. Save-as-PDF.',
  'brochure',
  'published',
  $${"blocks":[
    {"type":"eyebrow","text":"OUR SERVICES"},
    {"type":"heading","level":1,"text":"A service for every phase of your journey."},
    {"type":"paragraph","text":"The catalogue is organised against the four phases — pick what you need, when you need it, no rip-and-replace required."},
    {"type":"phase_row"},
    {"type":"divider"},
    {"type":"heading","level":2,"text":"Operate"},
    {"type":"paragraph","text":"Endpoint management, network, identity, helpdesk. Stable foundations first."},
    {"type":"heading","level":2,"text":"Secure"},
    {"type":"paragraph","text":"MFA, conditional access, backup, incident readiness. POPIA-aligned controls."},
    {"type":"heading","level":2,"text":"Streamline"},
    {"type":"paragraph","text":"Automation across onboarding, invoicing, document flow. Take busywork off the team."},
    {"type":"heading","level":2,"text":"Accelerate"},
    {"type":"paragraph","text":"AI tooling, analytics, and growth-led architecture once the basics are bulletproof."},
    {"type":"footer_note","text":"ithealth.ai · hello@ithealth.ai"}
  ]}$$::jsonb
);

-- ------------------------------------------------------------
-- Presentation (3XX)
-- ------------------------------------------------------------
INSERT INTO public.ai_templates (id, name, description, kind, status, content) VALUES
(
  '30000000-0000-0000-0000-000000000301',
  'Deck — Master 32-slide capabilities deck',
  'Capabilities + Success Blueprint deck with full speaker notes. Used in partner and prospect meetings.',
  'presentation',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"blue","eyebrow":"ITHEALTH · MASTER DECK","title":"The IT modernisation playbook","subtitle":"Operate → Secure → Streamline → Accelerate. A 30-minute walkthrough for prospects and partners."},
    {"type":"heading","level":2,"text":"Who we are"},
    {"type":"paragraph","text":"An MSP positioned as your modernisation champion — UK heritage, South African operation."},
    {"type":"phase_row"},
    {"type":"heading","level":2,"text":"How a typical engagement runs"},
    {"type":"columns","items":[
      {"title":"Week 0","body":"Baseline assessment + phased plan."},
      {"title":"Weeks 1–8","body":"Operate phase ships. Predictable cadence, weekly demos."},
      {"title":"Weeks 8+","body":"Secure → Streamline → Accelerate, at your pace."}
    ]},
    {"type":"cta_banner","title":"Where would you like to start?","cta":"Book an assessment"}
  ]}$$::jsonb
);

-- ------------------------------------------------------------
-- Document (4XX)
-- ------------------------------------------------------------
INSERT INTO public.ai_templates (id, name, description, kind, status, content) VALUES
(
  '30000000-0000-0000-0000-000000000401',
  'Proposal — Karoo Logistics (10pp)',
  'Worked 10-page proposal for a fictional South African logistics SMB. Use as a customer-specific template.',
  'document',
  'published',
  $${"blocks":[
    {"type":"eyebrow","text":"PROPOSAL · CONFIDENTIAL"},
    {"type":"heading","level":1,"text":"Modernising IT at Karoo Logistics"},
    {"type":"paragraph","text":"Prepared for the Karoo Logistics leadership team — a phased plan to take operations from reactive to resilient."},
    {"type":"divider"},
    {"type":"heading","level":2,"text":"Scope"},
    {"type":"columns","items":[
      {"title":"Phase 1 · Operate","body":"Stabilise endpoint, network and identity across depot and head office."},
      {"title":"Phase 2 · Secure","body":"POPIA-aligned controls, backup hygiene and incident readiness."},
      {"title":"Phase 3 · Streamline","body":"Automate fleet onboarding, document flow and invoicing."}
    ]},
    {"type":"divider"},
    {"type":"heading","level":2,"text":"Investment"},
    {"type":"paragraph","text":"Fixed monthly retainer, scoped per phase. Itemised pricing in appendix B."},
    {"type":"footer_note","text":"Karoo Logistics is fictional — swap names and numbers before sending."}
  ]}$$::jsonb
);

-- ------------------------------------------------------------
-- Website pages (5XX)
-- ------------------------------------------------------------
INSERT INTO public.ai_templates (id, name, description, kind, status, content) VALUES
(
  '30000000-0000-0000-0000-000000000501',
  'Website — Public home page',
  'Public-marketing homepage: blue hero, journey strip, blog teaser, testimonial, CTA banner.',
  'website_page',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"blue","eyebrow":"THE IT MODERNISATION PLATFORM","title":"Your IT modernisation champions","subtitle":"A clear, phased Success Blueprint that transforms your IT from a reactive cost centre into a strategic growth engine.","cta":"Start your journey"},
    {"type":"eyebrow","text":"FOUR PHASES, ONE JOURNEY"},
    {"type":"heading","level":2,"text":"Operate → Secure → Streamline → Accelerate"},
    {"type":"phase_row"},
    {"type":"cta_banner","title":"Ready when you are.","subtitle":"It's free — no credit card required.","cta":"Get started"}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000502',
  'Website — Admin dashboard shell',
  'Reference layout for the admin shell — pink sidebar, light mega menu, dashboard cards.',
  'website_page',
  'draft',
  $${"blocks":[
    {"type":"eyebrow","text":"ADMIN SHELL"},
    {"type":"heading","level":1,"text":"Pink sidebar · light mega-menu · dense dashboard"},
    {"type":"paragraph","text":"60px pink icon sidebar on the left, 48px mega-menu on top, scrollable content underneath. Desktop-only."},
    {"type":"columns","items":[
      {"title":"Sidebar","body":"Brand-secondary pink, white icons at 20px, vertical-rl labels on hover."},
      {"title":"Mega-menu","body":"Light, sticky, h-12. L2 items render as full-height square tabs with right-border dividers."},
      {"title":"Content","body":"max-w-7xl, gray-50 background, dense tables with h-7 buttons."}
    ]}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000503',
  'Website — Customer portal shell',
  'Reference layout for the customer portal — blue labelled sidebar, journey progress, service tiles.',
  'website_page',
  'draft',
  $${"blocks":[
    {"type":"eyebrow","text":"CUSTOMER PORTAL"},
    {"type":"heading","level":1,"text":"Blue labelled sidebar · journey progress · service tiles"},
    {"type":"paragraph","text":"240px brand-primary blue sidebar with labelled items, content on the right anchored to the customer's current phase."},
    {"type":"phase_row"},
    {"type":"columns","items":[
      {"title":"Sidebar","body":"Brand-primary blue, 240px wide, 18px icons with labels visible by default."},
      {"title":"Journey strip","body":"Phase progress shown as four circles tinted in their phase colour — current phase pulses."},
      {"title":"Service tiles","body":"Each active service renders as a card with phase-coloured eyebrow and status pill."}
    ]}
  ]}$$::jsonb
);

-- ------------------------------------------------------------
-- Social posts (6XX) — one row per platform format
-- ------------------------------------------------------------
INSERT INTO public.ai_templates (id, name, description, kind, status, content) VALUES
(
  '30000000-0000-0000-0000-000000000601',
  'Social — LinkedIn (1200×627)',
  'Wide LinkedIn share card. Brand-primary background, big light-weight statement, no logo on the image.',
  'social_post',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"blue","eyebrow":"ITHEALTH","title":"Modernise your IT — one phase at a time.","subtitle":"Operate. Secure. Streamline. Accelerate."}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000602',
  'Social — X / Twitter (1600×900)',
  'Cinematic X/Twitter card. Single line of display copy, optional eyebrow.',
  'social_post',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"dark","eyebrow":"FREE · 48-HOUR BASELINE","title":"Get your modernisation baseline.","cta":"Claim yours"}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000603',
  'Social — Facebook (1200×630)',
  'Facebook link-share card. Same proportions as LinkedIn but slightly punchier copy.',
  'social_post',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"blue","eyebrow":"FREE · 48-HOUR BASELINE","title":"IT modernisation, scored in 48 hours.","subtitle":"No card, no commitment.","cta":"Start"}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000604',
  'Social — Instagram square (1080×1080)',
  'Instagram in-feed square. Big display headline anchored bottom-left, eyebrow top-left.',
  'social_post',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"blue","eyebrow":"PHASE 02 · SECURE","title":"Roll out MFA without the UX disaster.","cta":"Read"}
  ]}$$::jsonb
),
(
  '30000000-0000-0000-0000-000000000605',
  'Social — Instagram story (1080×1920)',
  'Vertical Instagram story. Single brand-coloured surface, giant phase name set type-only.',
  'social_post',
  'published',
  $${"blocks":[
    {"type":"hero","bg":"dark","eyebrow":"PHASE 04","title":"Accelerate.","subtitle":"Once the basics are bulletproof, this is where growth compounds."}
  ]}$$::jsonb
);
