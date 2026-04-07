-- AI Agents tables
-- See spec Section 2 for full schema

-- 2.1 ai_agents
CREATE TABLE ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  agent_type text NOT NULL CHECK (agent_type IN ('specialist', 'orchestrator')),
  model text DEFAULT 'gemini-2.5-flash',
  system_prompt text,
  temperature numeric DEFAULT 0.7,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  icon text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.2 ai_agent_tools
CREATE TABLE ai_agent_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  tool_type text NOT NULL CHECK (tool_type IN ('supabase_crud', 'web_search', 'langchain')),
  tool_name text NOT NULL,
  operations text[],
  is_active boolean DEFAULT true,
  UNIQUE (agent_id, tool_type, tool_name)
);

-- 2.3 ai_agent_hierarchy
CREATE TABLE ai_agent_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL UNIQUE REFERENCES ai_agents(id) ON DELETE CASCADE,
  parent_agent_id uuid REFERENCES ai_agents(id),
  hierarchy_level text NOT NULL CHECK (hierarchy_level IN ('king', 'department', 'manager', 'worker')),
  sort_order integer DEFAULT 0
);

CREATE UNIQUE INDEX idx_ai_agent_hierarchy_king
  ON ai_agent_hierarchy (hierarchy_level) WHERE hierarchy_level = 'king';

-- 2.4 ai_conversations
CREATE TABLE ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES ai_agents(id) ON DELETE SET NULL,
  title text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.5 ai_messages
CREATE TABLE ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content text,
  agent_id uuid REFERENCES ai_agents(id) ON DELETE SET NULL,
  token_count integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 2.6 ai_execution_runs
CREATE TABLE ai_execution_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id),
  trigger_message_id uuid REFERENCES ai_messages(id),
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 2.7 ai_execution_steps
CREATE TABLE ai_execution_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES ai_execution_runs(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES ai_agents(id),
  step_type text NOT NULL CHECK (step_type IN ('agent_call', 'tool_call', 'delegation', 'response')),
  tool_name text,
  input jsonb,
  output jsonb,
  parent_step_id uuid REFERENCES ai_execution_steps(id),
  duration_ms integer,
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Indexes (Section 2.9)
CREATE INDEX idx_ai_messages_conversation_time ON ai_messages (conversation_id, created_at);
CREATE INDEX idx_ai_conversations_user_time ON ai_conversations (user_id, updated_at DESC);
CREATE INDEX idx_ai_execution_steps_run_time ON ai_execution_steps (run_id, created_at);
CREATE INDEX idx_ai_execution_runs_conversation ON ai_execution_runs (conversation_id, started_at DESC);

-- Triggers
CREATE TRIGGER set_ai_agents_updated_at
  BEFORE UPDATE ON ai_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Prevent deleting default agents
CREATE OR REPLACE FUNCTION prevent_default_agent_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default = true THEN
    RAISE EXCEPTION 'Cannot delete default agents';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_default_agent_delete_trigger
  BEFORE DELETE ON ai_agents
  FOR EACH ROW EXECUTE FUNCTION prevent_default_agent_delete();
