-- Remove the Growth > Market sub-nav and its backing data model.
-- The equivalent content now lives under AI > Knowledge > Market (see 20260515000002).
--
-- Drops in order:
--   1. Menu items (Market L2 + its 5 L3 children)
--   2. AI agent tool rows that reference the dropped tables
--   3. The Market Specialist agent (now without purpose)
--   4. Services junction tables
--   5. Reference tables

-- 1. Menu cleanup. role_menu_access rows cascade via FK ON DELETE CASCADE.
delete from public.menu_items
where id in (
  -- L2 Market and the original 4 L3 children (from 20260403000010_menu_restructure.sql)
  '20000000-0000-0000-0000-000000000105',
  '30000000-0000-0000-0000-000000000101',
  '30000000-0000-0000-0000-000000000102',
  '30000000-0000-0000-0000-000000000103',
  '30000000-0000-0000-0000-000000000104',
  -- Testimonials L3 added later in 20260403300007_public_menu_additions.sql
  '30000000-0000-0000-0000-000000000202'
);

-- 2. Drop ai_agent_tools rows pointing at any of the soon-to-be-dropped tables.
delete from public.ai_agent_tools
where tool_type = 'supabase_crud'
  and tool_name in (
    'verticals', 'personas', 'pains', 'gains', 'testimonials',
    'service_verticals', 'service_personas', 'service_pains', 'service_gains'
  );

-- 3. Drop the Market Specialist agent (its tools are gone in step 2; its purpose was these tables).
--    Flip is_default first to satisfy the prevent_default_agent_delete trigger.
update public.ai_agents
set is_default = false
where id = 'a0000000-0000-0000-0000-000000000010';

delete from public.ai_agents
where id = 'a0000000-0000-0000-0000-000000000010';

-- 4. Drop the Services junction tables first to break inbound FKs.
drop table if exists public.service_verticals cascade;
drop table if exists public.service_personas cascade;
drop table if exists public.service_pains cascade;
drop table if exists public.service_gains cascade;

-- 5. Drop the reference tables.
drop table if exists public.verticals cascade;
drop table if exists public.personas cascade;
drop table if exists public.pains cascade;
drop table if exists public.gains cascade;
drop table if exists public.testimonials cascade;
