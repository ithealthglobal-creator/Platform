-- supabase/migrations/20260515000002_seed_dummy_campaigns.sql
-- Dummy Meta campaign data for development/demo of the /growth/campaigns UI.
-- Idempotent: uses fixed UUIDs and ON CONFLICT DO NOTHING.

-- ---------------------------------------------------------------------------
-- 1. Meta integration for IThealth (the seed admin company)
-- ---------------------------------------------------------------------------
INSERT INTO public.meta_integrations (
  id, company_id, ad_account_id, ad_account_name,
  sync_frequency, sync_status, is_active, last_synced_at
) VALUES (
  'aa000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'act_1234567890',
  'IThealth — UK Ads',
  '1hour', 'idle', true,
  NOW() - INTERVAL '12 minutes'
) ON CONFLICT (company_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Campaigns (5)
-- ---------------------------------------------------------------------------
INSERT INTO public.meta_campaigns (
  id, integration_id, meta_campaign_id, name, status, objective,
  daily_budget, lifetime_budget,
  spend, impressions, clicks, ctr, cpm, cpa, conversions,
  start_time, stop_time, synced_at
) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001',
   '120210000000000001', 'Q2 — IT Modernisation Awareness', 'ACTIVE', 'OUTCOME_AWARENESS',
   5000, NULL, 8420.55, 612400, 7200, 1.18, 13.75, 28.20, 298,
   NOW() - INTERVAL '60 days', NULL, NOW() - INTERVAL '12 minutes'),

  ('c1000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001',
   '120210000000000002', 'Lead Gen — Cloud Migration Guide', 'ACTIVE', 'OUTCOME_LEADS',
   7500, NULL, 11240.10, 410800, 9870, 2.40, 27.36, 19.40, 579,
   NOW() - INTERVAL '45 days', NULL, NOW() - INTERVAL '12 minutes'),

  ('c1000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000001',
   '120210000000000003', 'Webinar — Zero Trust Security', 'ACTIVE', 'OUTCOME_TRAFFIC',
   3000, NULL, 3870.20, 198300, 4620, 2.33, 19.52, 22.10, 175,
   NOW() - INTERVAL '30 days', NOW() + INTERVAL '15 days', NOW() - INTERVAL '12 minutes'),

  ('c1000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-000000000001',
   '120210000000000004', 'Retargeting — Free Assessment', 'PAUSED', 'OUTCOME_LEADS',
   2000, NULL, 5210.80, 134000, 3160, 2.36, 38.89, 17.20, 303,
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '12 minutes'),

  ('c1000000-0000-0000-0000-000000000005', 'aa000000-0000-0000-0000-000000000001',
   '120210000000000005', 'Partner Recruitment Drive', 'ACTIVE', 'OUTCOME_LEADS',
   4000, NULL, 1820.65, 64200, 1180, 1.84, 28.36, 31.40, 58,
   NOW() - INTERVAL '14 days', NULL, NOW() - INTERVAL '12 minutes')
ON CONFLICT (integration_id, meta_campaign_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Ad sets (2 per campaign = 10)
-- ---------------------------------------------------------------------------
INSERT INTO public.meta_ad_sets (
  id, campaign_id, meta_ad_set_id, name, status, targeting,
  daily_budget, spend, impressions, clicks, ctr, cpm, cpa, conversions, synced_at
) VALUES
  -- Campaign 1: Awareness
  ('a5000000-0000-0000-0000-000000000101', 'c1000000-0000-0000-0000-000000000001',
   '120210000000000101', 'ITDM Lookalike – 1%', 'ACTIVE',
   '{"geo_locations":{"countries":["GB"]},"age_min":28,"age_max":55}'::jsonb,
   2500, 4220.10, 320400, 4100, 1.28, 13.17, 26.90, 157,
   NOW() - INTERVAL '12 minutes'),
  ('a5000000-0000-0000-0000-000000000102', 'c1000000-0000-0000-0000-000000000001',
   '120210000000000102', 'Tech Decision Makers – Broad', 'ACTIVE',
   '{"geo_locations":{"countries":["GB"]},"age_min":25,"age_max":60}'::jsonb,
   2500, 4200.45, 292000, 3100, 1.06, 14.39, 29.79, 141,
   NOW() - INTERVAL '12 minutes'),

  -- Campaign 2: Lead Gen
  ('a5000000-0000-0000-0000-000000000201', 'c1000000-0000-0000-0000-000000000002',
   '120210000000000201', 'CIOs & CTOs – Retargeting', 'ACTIVE',
   '{"custom_audiences":["website_30d"],"age_min":35,"age_max":60}'::jsonb,
   4000, 6120.40, 198400, 5210, 2.63, 30.85, 18.80, 326,
   NOW() - INTERVAL '12 minutes'),
  ('a5000000-0000-0000-0000-000000000202', 'c1000000-0000-0000-0000-000000000002',
   '120210000000000202', 'IT Manager – Lookalike 2%', 'ACTIVE',
   '{"geo_locations":{"countries":["GB","IE"]},"age_min":30,"age_max":55}'::jsonb,
   3500, 5119.70, 212400, 4660, 2.19, 24.10, 20.21, 253,
   NOW() - INTERVAL '12 minutes'),

  -- Campaign 3: Webinar
  ('a5000000-0000-0000-0000-000000000301', 'c1000000-0000-0000-0000-000000000003',
   '120210000000000301', 'Security Pros – Interest', 'ACTIVE',
   '{"flexible_spec":[{"interests":[{"id":"6003020834693","name":"Information security"}]}],"age_min":28,"age_max":55}'::jsonb,
   1500, 2010.30, 102400, 2520, 2.46, 19.63, 21.40, 94,
   NOW() - INTERVAL '12 minutes'),
  ('a5000000-0000-0000-0000-000000000302', 'c1000000-0000-0000-0000-000000000003',
   '120210000000000302', 'InfoSec Audience – Custom', 'ACTIVE',
   '{"custom_audiences":["infosec_engaged"],"age_min":25,"age_max":55}'::jsonb,
   1500, 1859.90, 95900, 2100, 2.19, 19.39, 22.96, 81,
   NOW() - INTERVAL '12 minutes'),

  -- Campaign 4: Retargeting (paused)
  ('a5000000-0000-0000-0000-000000000401', 'c1000000-0000-0000-0000-000000000004',
   '120210000000000401', 'Website Visitors 30d', 'PAUSED',
   '{"custom_audiences":["website_30d"]}'::jsonb,
   1000, 2810.50, 71600, 1800, 2.51, 39.25, 16.55, 170,
   NOW() - INTERVAL '12 minutes'),
  ('a5000000-0000-0000-0000-000000000402', 'c1000000-0000-0000-0000-000000000004',
   '120210000000000402', 'Engaged Video Viewers', 'PAUSED',
   '{"custom_audiences":["video_viewers_75pct"]}'::jsonb,
   1000, 2400.30, 62400, 1360, 2.18, 38.47, 18.05, 133,
   NOW() - INTERVAL '12 minutes'),

  -- Campaign 5: Partner Recruitment
  ('a5000000-0000-0000-0000-000000000501', 'c1000000-0000-0000-0000-000000000005',
   '120210000000000501', 'MSP Owners – Custom', 'ACTIVE',
   '{"custom_audiences":["msp_decision_makers"],"age_min":30,"age_max":60}'::jsonb,
   2000, 980.45, 32100, 670, 2.09, 30.54, 30.64, 32,
   NOW() - INTERVAL '12 minutes'),
  ('a5000000-0000-0000-0000-000000000502', 'c1000000-0000-0000-0000-000000000005',
   '120210000000000502', 'MSP Lookalike – 1%', 'ACTIVE',
   '{"geo_locations":{"countries":["GB"]},"age_min":28,"age_max":58}'::jsonb,
   2000, 840.20, 32100, 510, 1.59, 26.18, 32.32, 26,
   NOW() - INTERVAL '12 minutes')
ON CONFLICT (campaign_id, meta_ad_set_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Ads (~24, 2-3 per ad set)
--    Performance varies so the UI's "top performer" highlight is visible per
--    campaign. Creative thumbnails use picsum.photos (deterministic by seed).
-- ---------------------------------------------------------------------------
INSERT INTO public.meta_ads (
  id, ad_set_id, meta_ad_id, name, status,
  creative_thumbnail_url, creative_title, creative_body, creative_link_url,
  hook_rate, ctr, cpm, cpa,
  spend, impressions, clicks, conversions, emq_score, synced_at
) VALUES
  -- Campaign 1 / Ad set 101 (ITDM LAL)
  ('ad000000-0000-0000-0000-000000010101', 'a5000000-0000-0000-0000-000000000101',
   '120210000000010101', 'Awareness — Hero Static A', 'ACTIVE',
   'https://picsum.photos/seed/itm-hero-a/1200/1200',
   'Modernise IT without the chaos',
   'See how UK teams cut downtime by 38% with IThealth''s rollout playbook. Free 30-min audit.',
   'https://ithealth.co.uk/modernisation?utm_source=meta&utm_campaign=awareness',
   27.4, 1.42, 12.85, 25.10, 2410.20, 178200, 2530, 96, 7.2, NOW() - INTERVAL '12 minutes'),

  ('ad000000-0000-0000-0000-000000010102', 'a5000000-0000-0000-0000-000000000101',
   '120210000000010102', 'Awareness — Hero Static B', 'ACTIVE',
   'https://picsum.photos/seed/itm-hero-b/1200/1200',
   'Your IT estate, finally under control',
   'Replace patchwork tools with one modern platform. Talk to a specialist.',
   'https://ithealth.co.uk/platform?utm_source=meta&utm_campaign=awareness',
   22.1, 1.12, 13.42, 28.60, 1809.90, 142200, 1590, 61, 6.4, NOW() - INTERVAL '12 minutes'),

  -- Campaign 1 / Ad set 102 (TDM Broad)
  ('ad000000-0000-0000-0000-000000010201', 'a5000000-0000-0000-0000-000000000102',
   '120210000000010201', 'Awareness — Carousel Outcomes', 'ACTIVE',
   'https://picsum.photos/seed/itm-carousel-out/1200/1200',
   '4 outcomes IT leaders care about',
   'Lower TCO, fewer tickets, faster onboarding, audit-ready posture — in one platform.',
   'https://ithealth.co.uk/outcomes?utm_source=meta&utm_campaign=awareness',
   20.5, 0.98, 14.61, 31.20, 2350.10, 161100, 1579, 75, 5.9, NOW() - INTERVAL '12 minutes'),

  ('ad000000-0000-0000-0000-000000010202', 'a5000000-0000-0000-0000-000000000102',
   '120210000000010202', 'Awareness — Video Testimonial', 'ACTIVE',
   'https://picsum.photos/seed/itm-vid-test/1200/1200',
   '"It paid for itself in 90 days"',
   'See why Helena, CIO at a 400-seat firm, picked IThealth over the legacy stack.',
   'https://ithealth.co.uk/case-studies/helena?utm_source=meta',
   31.8, 1.18, 14.18, 27.95, 1850.35, 130900, 1521, 66, 7.8, NOW() - INTERVAL '12 minutes'),

  -- Campaign 2 / Ad set 201 (CIO retargeting)
  ('ad000000-0000-0000-0000-000000020101', 'a5000000-0000-0000-0000-000000000201',
   '120210000000020101', 'LeadGen — Cloud Migration Guide', 'ACTIVE',
   'https://picsum.photos/seed/cloud-guide/1200/1200',
   'The 2026 Cloud Migration Playbook',
   'A 27-page guide covering planning, runbook, cost guardrails. Free PDF.',
   'https://ithealth.co.uk/guides/cloud-migration?utm_source=meta&utm_campaign=leadgen',
   34.2, 2.92, 31.20, 16.40, 3210.30, 102900, 3005, 196, 8.1, NOW() - INTERVAL '12 minutes'),

  ('ad000000-0000-0000-0000-000000020102', 'a5000000-0000-0000-0000-000000000201',
   '120210000000020102', 'LeadGen — Cost Calculator', 'ACTIVE',
   'https://picsum.photos/seed/cost-calc/1200/1200',
   'See your cloud spend in 60 seconds',
   'Plug in your seat count and workloads — get an instant TCO estimate.',
   'https://ithealth.co.uk/tools/tco?utm_source=meta&utm_campaign=leadgen',
   28.6, 2.41, 30.85, 19.80, 2910.10, 95500, 2302, 147, 7.4, NOW() - INTERVAL '12 minutes'),

  -- Campaign 2 / Ad set 202 (IT Manager LAL)
  ('ad000000-0000-0000-0000-000000020201', 'a5000000-0000-0000-0000-000000000202',
   '120210000000020201', 'LeadGen — Webinar Sign-up', 'ACTIVE',
   'https://picsum.photos/seed/webinar-signup/1200/1200',
   'Live: Migrating without downtime',
   'Join 200+ IT leaders next Thursday. Q&A with the IThealth migration team.',
   'https://ithealth.co.uk/events/migration-webinar?utm_source=meta&utm_campaign=leadgen',
   24.7, 2.18, 24.10, 19.85, 2580.20, 107100, 2335, 130, 6.9, NOW() - INTERVAL '12 minutes'),

  ('ad000000-0000-0000-0000-000000020202', 'a5000000-0000-0000-0000-000000000202',
   '120210000000020202', 'LeadGen — Free Audit Offer', 'ACTIVE',
   'https://picsum.photos/seed/free-audit/1200/1200',
   'Free 30-min IT modernisation audit',
   'Book a slot with a UK-based specialist. No sales pitch — just findings.',
   'https://ithealth.co.uk/audit?utm_source=meta&utm_campaign=leadgen',
   26.0, 2.20, 24.10, 20.60, 2539.50, 105300, 2317, 123, 7.0, NOW() - INTERVAL '12 minutes'),

  -- Campaign 3 / Ad set 301 (Security interest)
  ('ad000000-0000-0000-0000-000000030101', 'a5000000-0000-0000-0000-000000000301',
   '120210000000030101', 'Webinar — Zero Trust Hero', 'ACTIVE',
   'https://picsum.photos/seed/zt-hero/1200/1200',
   'Zero Trust without the buzzwords',
   'A practical 45-min walkthrough. Live demo + Q&A.',
   'https://ithealth.co.uk/events/zero-trust?utm_source=meta&utm_campaign=webinar',
   29.4, 2.62, 19.12, 19.80, 1040.20, 54400, 1425, 53, 7.6, NOW() - INTERVAL '12 minutes'),

  ('ad000000-0000-0000-0000-000000030102', 'a5000000-0000-0000-0000-000000000301',
   '120210000000030102', 'Webinar — Speaker Bio', 'ACTIVE',
   'https://picsum.photos/seed/zt-speaker/1200/1200',
   'Meet the speaker: Owen, ex-NCSC',
   'Owen led incident response at NCSC for 6 years. Free webinar Thursday.',
   'https://ithealth.co.uk/events/zero-trust?utm_source=meta&utm_campaign=webinar',
   22.9, 2.31, 19.95, 23.10, 970.10, 48000, 1095, 41, 6.5, NOW() - INTERVAL '12 minutes'),

  ('ad000000-0000-0000-0000-000000030103', 'a5000000-0000-0000-0000-000000000301',
   '120210000000030103', 'Webinar — Last-chance Reminder', 'PAUSED',
   'https://picsum.photos/seed/zt-reminder/1200/1200',
   'Last 24h to register',
   'Live Thursday. Recording sent to all attendees.',
   'https://ithealth.co.uk/events/zero-trust?utm_source=meta&utm_campaign=webinar',
   18.5, 1.40, 20.00, 28.40, 0.00, 0, 0, 0, NULL, NOW() - INTERVAL '12 minutes'),

  -- Campaign 3 / Ad set 302 (InfoSec Custom)
  ('ad000000-0000-0000-0000-000000030201', 'a5000000-0000-0000-0000-000000000302',
   '120210000000030201', 'Webinar — Recap Carousel', 'ACTIVE',
   'https://picsum.photos/seed/zt-recap/1200/1200',
   '5 takeaways from our Zero Trust session',
   'Quick read — 5 slides, no fluff. Plus the full recording.',
   'https://ithealth.co.uk/blog/zero-trust-recap?utm_source=meta&utm_campaign=webinar',
   21.0, 2.10, 19.38, 23.40, 920.40, 47500, 998, 39, 6.3, NOW() - INTERVAL '12 minutes'),

  ('ad000000-0000-0000-0000-000000030202', 'a5000000-0000-0000-0000-000000000302',
   '120210000000030202', 'Webinar — Toolkit Download', 'ACTIVE',
   'https://picsum.photos/seed/zt-toolkit/1200/1200',
   'Zero Trust starter toolkit',
   'Templates + checklist used by 30+ UK firms. Free download.',
   'https://ithealth.co.uk/resources/zero-trust-toolkit?utm_source=meta&utm_campaign=webinar',
   25.5, 2.28, 19.40, 22.50, 939.50, 48400, 1102, 42, 6.8, NOW() - INTERVAL '12 minutes'),

  -- Campaign 4 / Ad set 401 (Retargeting Website)
  ('ad000000-0000-0000-0000-000000040101', 'a5000000-0000-0000-0000-000000000401',
   '120210000000040101', 'Retargeting — Audit Reminder', 'PAUSED',
   'https://picsum.photos/seed/rt-audit/1200/1200',
   'Still thinking about your free audit?',
   'Slots fill up — grab one before month-end.',
   'https://ithealth.co.uk/audit?utm_source=meta&utm_campaign=retargeting',
   30.2, 2.66, 39.20, 16.00, 1440.30, 36800, 980, 90, 8.0, NOW() - INTERVAL '12 minutes'),

  ('ad000000-0000-0000-0000-000000040102', 'a5000000-0000-0000-0000-000000000401',
   '120210000000040102', 'Retargeting — Case Study', 'PAUSED',
   'https://picsum.photos/seed/rt-case/1200/1200',
   'How Loop Logistics saved £80K',
   'A 12-week rollout with measurable ROI. Read the case study.',
   'https://ithealth.co.uk/case-studies/loop?utm_source=meta&utm_campaign=retargeting',
   25.6, 2.36, 39.30, 17.10, 1370.20, 34800, 820, 80, 7.0, NOW() - INTERVAL '12 minutes'),

  -- Campaign 4 / Ad set 402 (Video viewers)
  ('ad000000-0000-0000-0000-000000040201', 'a5000000-0000-0000-0000-000000000402',
   '120210000000040201', 'Retargeting — Pricing FAQ', 'PAUSED',
   'https://picsum.photos/seed/rt-pricing/1200/1200',
   'Pricing made simple',
   'Per-seat pricing, no setup fees, cancel any time. See the breakdown.',
   'https://ithealth.co.uk/pricing?utm_source=meta&utm_campaign=retargeting',
   22.0, 2.20, 38.10, 18.40, 1230.10, 32300, 711, 67, 6.4, NOW() - INTERVAL '12 minutes'),

  ('ad000000-0000-0000-0000-000000040202', 'a5000000-0000-0000-0000-000000000402',
   '120210000000040202', 'Retargeting — Demo Booking', 'PAUSED',
   'https://picsum.photos/seed/rt-demo/1200/1200',
   '15-minute live demo',
   'See the platform end-to-end. Bring your team.',
   'https://ithealth.co.uk/demo?utm_source=meta&utm_campaign=retargeting',
   24.4, 2.16, 38.84, 17.70, 1170.20, 30100, 649, 66, 6.7, NOW() - INTERVAL '12 minutes'),

  -- Campaign 5 / Ad set 501 (MSP Custom)
  ('ad000000-0000-0000-0000-000000050101', 'a5000000-0000-0000-0000-000000000501',
   '120210000000050101', 'Partner — Margin Calculator', 'ACTIVE',
   'https://picsum.photos/seed/p-margin/1200/1200',
   'See your MSP margin uplift',
   'Plug in your seat count — see the partner-program margin in real time.',
   'https://ithealth.co.uk/partners/margin?utm_source=meta&utm_campaign=partner',
   23.8, 2.18, 30.50, 29.40, 490.20, 16100, 351, 18, 6.6, NOW() - INTERVAL '12 minutes'),

  ('ad000000-0000-0000-0000-000000050102', 'a5000000-0000-0000-0000-000000000501',
   '120210000000050102', 'Partner — Co-marketing Deck', 'ACTIVE',
   'https://picsum.photos/seed/p-comarket/1200/1200',
   'Co-marketing kit for MSPs',
   'Landing pages, decks, email templates. Yours to white-label.',
   'https://ithealth.co.uk/partners/kit?utm_source=meta&utm_campaign=partner',
   20.1, 1.99, 30.59, 32.20, 490.25, 16000, 319, 14, 6.2, NOW() - INTERVAL '12 minutes'),

  -- Campaign 5 / Ad set 502 (MSP LAL)
  ('ad000000-0000-0000-0000-000000050201', 'a5000000-0000-0000-0000-000000000502',
   '120210000000050201', 'Partner — Apply Now', 'ACTIVE',
   'https://picsum.photos/seed/p-apply/1200/1200',
   'Become an IThealth partner',
   'Tiered margins, dedicated CSM, joint marketing budget.',
   'https://ithealth.co.uk/partners/apply?utm_source=meta&utm_campaign=partner',
   19.0, 1.62, 26.30, 33.10, 422.10, 16100, 261, 13, 5.7, NOW() - INTERVAL '12 minutes'),

  ('ad000000-0000-0000-0000-000000050202', 'a5000000-0000-0000-0000-000000000502',
   '120210000000050202', 'Partner — Webinar Invite', 'ACTIVE',
   'https://picsum.photos/seed/p-webinar/1200/1200',
   'Partner program walkthrough',
   '30-min live session. Q&A with the IThealth channel team.',
   'https://ithealth.co.uk/partners/webinar?utm_source=meta&utm_campaign=partner',
   21.5, 1.55, 26.00, 31.50, 418.10, 16000, 249, 13, 5.9, NOW() - INTERVAL '12 minutes')
ON CONFLICT (ad_set_id, meta_ad_id) DO NOTHING;
