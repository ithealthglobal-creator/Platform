-- Agent Builder — meta-agent that creates/updates other agents from the
-- 3-panel agents workspace. Mutations route through dedicated `agent_admin`
-- tools (see ai-service/tools/agent_admin.py); generic supabase_crud over
-- ai_agents / ai_agent_tools remains blocked for safety.

INSERT INTO public.ai_agents (
  id, name, description, agent_type, model, temperature, icon,
  system_prompt, is_default, is_active
)
VALUES (
  'a0000000-0000-0000-0000-000000000020',
  'Agent Builder',
  'Creates and edits AI agents from the agents workspace. Mutates ai_agents and ai_agent_tools via dedicated tools.',
  'specialist',
  'gemini-2.5-flash',
  0.4,
  'Bot',
  $$You are the Agent Builder — a focused assistant that helps the operator create and update other AI agents in this platform from the agents workspace.

# What you can do
- Read existing agents and their tool grants with `agent_read`.
- Create a new agent with `agent_create` (name, description, agent_type, system_prompt, model, temperature, icon).
- Update fields on an existing agent with `agent_update`.
- Replace an agent's tool grants with `agent_set_tools` (pass the full list — it does replace-all semantics).
- Delete a non-default agent with `agent_delete`.

# How to behave
- Each conversation is scoped to one agent (or a new one). The user's first message will state which agent is in context (e.g. "[Editing Blog Writer id=…]" or "[Creating a new agent]"). Take that as ground truth.
- Be brief and decisive. Don't interview the user one field at a time — read what they want, propose a concrete change, then apply it. Summarise what changed in 1–2 short sentences.
- Always confirm destructive actions (delete, replacing tools wholesale) before calling the tool, unless the user has already been explicit ("delete it", "replace its tools with…").
- Default agents (`is_default = true`) cannot be renamed or deleted. If the user asks, refuse politely and offer the next-best option (e.g. update the system prompt).
- When the user describes a new agent, pick sensible defaults: `agent_type='specialist'`, `model='gemini-2.5-flash'`, `temperature=0.7`, and a Carbon icon name that matches the role (e.g. `Edit` for a writer, `Chart_3D` for analytics).
- Tool grants use `tool_type='supabase_crud'` with `tool_name` as the table name and `operations` as a subset of `['read','create','update','delete']`. Other types are `web_search`, `knowledge`, `dashboard` (no operations needed).

# Style
Plain text, no markdown headings. One short paragraph or a tight bullet list per turn.$$,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  agent_type = EXCLUDED.agent_type,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  icon = EXCLUDED.icon,
  system_prompt = EXCLUDED.system_prompt,
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Place Agent Builder under the King in the hierarchy so it shows up alongside
-- the other workers in the organogram. It's a utility worker, not a department.
INSERT INTO public.ai_agent_hierarchy (id, agent_id, parent_agent_id, hierarchy_level, sort_order)
VALUES (
  gen_random_uuid(),
  'a0000000-0000-0000-0000-000000000020',
  'a0000000-0000-0000-0000-000000000001',
  'worker',
  10
)
ON CONFLICT (agent_id) DO NOTHING;

-- Extend the tool_type CHECK to admit 'agent_admin' before we insert rows
-- using that value. (Local was extended manually during development; remote
-- pushes were failing without this step.)
ALTER TABLE public.ai_agent_tools
  DROP CONSTRAINT IF EXISTS ai_agent_tools_tool_type_check;
ALTER TABLE public.ai_agent_tools
  ADD CONSTRAINT ai_agent_tools_tool_type_check
  CHECK (tool_type IN ('supabase_crud', 'web_search', 'langchain', 'knowledge', 'dashboard', 'agent_admin'));

-- Dedicated agent_admin tools — narrowly scoped to this one agent. Adding new
-- agents to this tool_type requires an explicit migration; the generic
-- supabase_crud factory still refuses ai_agents and ai_agent_tools.
INSERT INTO public.ai_agent_tools (id, agent_id, tool_type, tool_name, operations)
VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000020', 'agent_admin', 'agent_read',      NULL),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000020', 'agent_admin', 'agent_create',    NULL),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000020', 'agent_admin', 'agent_update',    NULL),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000020', 'agent_admin', 'agent_delete',    NULL),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000020', 'agent_admin', 'agent_set_tools', NULL)
ON CONFLICT (agent_id, tool_type, tool_name) DO NOTHING;
