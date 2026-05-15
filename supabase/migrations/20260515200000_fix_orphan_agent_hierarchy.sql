-- Slot orphaned agents into their proper departments so the organogram
-- can render every active agent under The King.
--
-- 1. Knowledge Orchestrator (a1) had no hierarchy entry — its 4 children
--    pointed at an agent that wasn't in the tree. Add it as a department.
-- 2. Dashboard Generator (007) sat at the root with parent=null. Re-parent
--    under The King as a department so it lives next to Growth/Accounts/Delivery.
-- 3. Social Post Composer (008) sat at the root with parent=null. Re-parent
--    under Growth as a worker alongside Blog Writer and Template Builder.

INSERT INTO ai_agent_hierarchy (id, agent_id, parent_agent_id, hierarchy_level, sort_order)
VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-000000000001', 'department', 4)
ON CONFLICT (agent_id) DO UPDATE
  SET parent_agent_id = EXCLUDED.parent_agent_id,
      hierarchy_level = EXCLUDED.hierarchy_level,
      sort_order      = EXCLUDED.sort_order;

UPDATE ai_agent_hierarchy
   SET parent_agent_id = 'a0000000-0000-0000-0000-000000000001',
       hierarchy_level = 'department',
       sort_order      = 5
 WHERE agent_id = 'a0000000-0000-0000-0000-000000000007';

UPDATE ai_agent_hierarchy
   SET parent_agent_id = 'a0000000-0000-0000-0000-000000000002',
       hierarchy_level = 'worker',
       sort_order      = 3
 WHERE agent_id = 'a0000000-0000-0000-0000-000000000008';
