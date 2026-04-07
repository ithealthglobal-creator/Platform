-- Enable RLS on all AI tables
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_execution_steps ENABLE ROW LEVEL SECURITY;

-- ai_agents: admins full CRUD, others read active only
CREATE POLICY "admins_full_access_ai_agents" ON ai_agents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "others_read_active_ai_agents" ON ai_agents
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- ai_agent_tools: admins only
CREATE POLICY "admins_only_ai_agent_tools" ON ai_agent_tools
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ai_agent_hierarchy: admins full, others read
CREATE POLICY "admins_full_access_ai_agent_hierarchy" ON ai_agent_hierarchy
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "others_read_ai_agent_hierarchy" ON ai_agent_hierarchy
  FOR SELECT USING (true);

-- ai_conversations: own conversations only
CREATE POLICY "own_conversations" ON ai_conversations
  FOR ALL USING (user_id = auth.uid());

-- ai_messages: through conversation ownership
CREATE POLICY "own_messages" ON ai_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM ai_conversations WHERE id = conversation_id AND user_id = auth.uid())
  );

-- ai_execution_runs: through conversation ownership
CREATE POLICY "own_execution_runs" ON ai_execution_runs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM ai_conversations WHERE id = conversation_id AND user_id = auth.uid())
  );

-- ai_execution_steps: through run → conversation ownership
CREATE POLICY "own_execution_steps" ON ai_execution_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_execution_runs r
      JOIN ai_conversations c ON c.id = r.conversation_id
      WHERE r.id = run_id AND c.user_id = auth.uid()
    )
  );
