-- Seed default AI agents
-- See task: seed 6 default agents (King, Growth, Accounts, Delivery, Service Builder, Blog Writer)

-- ============================================================
-- 1. ai_agents
-- ============================================================

INSERT INTO ai_agents (id, name, description, agent_type, model, temperature, icon, system_prompt, is_default, is_active)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'The King',
    'Top-level orchestrator. Understands the request and routes to the right department.',
    'orchestrator',
    'gemini-2.5-flash',
    0.7,
    'AiGovernanceLifecycle',
    'You are The King, the top-level orchestrator for IThealth. Understand the user request and delegate to the appropriate department: Growth (marketing, content), Accounts (billing, invoicing), or Delivery (service creation, projects). Use the delegate_to_agent tool to route tasks.',
    true,
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Growth',
    'Marketing, content, lead generation. Delegates to Blog Writer.',
    'orchestrator',
    'gemini-2.5-flash',
    0.7,
    'Growth',
    'You are the Growth department orchestrator. Handle marketing, content creation, and lead generation tasks. Delegate blog writing to the Blog Writer agent using delegate_to_agent.',
    true,
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Accounts',
    'Billing, invoicing, customer account management.',
    'orchestrator',
    'gemini-2.5-flash',
    0.7,
    'Currency',
    'You are the Accounts department orchestrator. Handle billing, invoicing, and customer account management tasks.',
    true,
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'Delivery',
    'Service creation, project delivery. Delegates to Service Builder.',
    'orchestrator',
    'gemini-2.5-flash',
    0.7,
    'Delivery',
    'You are the Delivery department orchestrator. Handle service creation and project delivery tasks. Delegate service building to the Service Builder agent using delegate_to_agent.',
    true,
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'Service Builder',
    'Builds complete IT service records by guiding users through the creation process.',
    'specialist',
    'gemini-2.5-flash',
    0.7,
    'ToolKit',
    'You are the Service Builder specialist agent. Guide users through creating complete IT service records.',
    true,
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000006',
    'Blog Writer',
    'Creates professional blog articles about IT modernisation for SMBs.',
    'specialist',
    'gemini-2.5-flash',
    0.7,
    'Edit',
    'You are the Blog Writer specialist agent. Create professional blog articles about IT modernisation for SMBs.',
    true,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. ai_agent_hierarchy
-- ============================================================

INSERT INTO ai_agent_hierarchy (id, agent_id, parent_agent_id, hierarchy_level, sort_order)
VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', NULL,                                     'king',       0),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',   'department', 1),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',   'department', 2),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',   'department', 3),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004',   'worker',     1),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002',   'worker',     1)
ON CONFLICT (agent_id) DO NOTHING;

-- ============================================================
-- 3. ai_agent_tools — Service Builder
-- ============================================================

INSERT INTO ai_agent_tools (id, agent_id, tool_type, tool_name, operations)
VALUES
  -- supabase_crud tools
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'supabase_crud', 'services',          ARRAY['read', 'create', 'update']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'supabase_crud', 'phases',            ARRAY['read']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'supabase_crud', 'products',          ARRAY['read']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'supabase_crud', 'verticals',         ARRAY['read']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'supabase_crud', 'personas',          ARRAY['read']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'supabase_crud', 'pains',             ARRAY['read']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'supabase_crud', 'gains',             ARRAY['read']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'supabase_crud', 'skills',            ARRAY['read']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'supabase_crud', 'service_verticals', ARRAY['read', 'create', 'delete']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'supabase_crud', 'service_personas',  ARRAY['read', 'create', 'delete']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'supabase_crud', 'service_pains',     ARRAY['read', 'create', 'delete']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'supabase_crud', 'service_gains',     ARRAY['read', 'create', 'delete']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'supabase_crud', 'service_products',  ARRAY['read', 'create', 'delete']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'supabase_crud', 'service_skills',    ARRAY['read', 'create', 'delete']),
  -- web_search tool
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 'web_search',    'web_search',        NULL)
ON CONFLICT (agent_id, tool_type, tool_name) DO NOTHING;

-- ============================================================
-- 4. ai_agent_tools — Blog Writer
-- ============================================================

INSERT INTO ai_agent_tools (id, agent_id, tool_type, tool_name, operations)
VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', 'supabase_crud', 'blog_posts',  ARRAY['read', 'create', 'update']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', 'supabase_crud', 'services',    ARRAY['read']),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', 'web_search',    'web_search',  NULL)
ON CONFLICT (agent_id, tool_type, tool_name) DO NOTHING;
