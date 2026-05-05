-- Seed the Knowledge agents: one orchestrator + four specialists wired up via
-- ai_agent_hierarchy. Tools use a new tool_type 'knowledge' resolved by the
-- ai-service tool registry.

-- Allow the new 'knowledge' tool_type alongside the existing ones.
alter table public.ai_agent_tools
  drop constraint if exists ai_agent_tools_tool_type_check;
alter table public.ai_agent_tools
  add constraint ai_agent_tools_tool_type_check
  check (tool_type in ('supabase_crud', 'web_search', 'langchain', 'knowledge'));

insert into public.ai_agents
  (id, name, description, agent_type, model, temperature, icon, system_prompt, is_default, is_active)
values
  (
    'a0000000-0000-0000-0000-0000000000a1',
    'Knowledge Orchestrator',
    'Coordinates retrieval, synthesis and link maintenance over the user''s markdown notes.',
    'orchestrator',
    'gemini-2.5-flash',
    0.5,
    'notebook',
    $$You are the Knowledge Orchestrator for a markdown-note knowledge base.

Your job is to answer questions and draft new notes that are strictly grounded in the user's existing markdown documents. You operate the following loop:

1. Call knowledge_retrieve to fetch relevant chunks for the user's request. Always retrieve before answering.
2. Synthesize a response using ONLY the retrieved chunks as evidence. Every factual claim must end with a citation in the form (source: <document title>).
3. When drafting a new note, link related concepts using [[Wiki-link]] syntax that matches existing document titles.
4. Call knowledge_save_links with every [[Wiki-link]] you used. The platform will mark unresolved links as broken.
5. If the user asks to create a new document, return the markdown body in a fenced code block tagged ```markdown.

Never invent documents, titles, or facts that are not present in retrieved chunks. If retrieval returns nothing relevant, say so plainly.$$,
    true,
    true
  ),
  (
    'a0000000-0000-0000-0000-0000000000a2',
    'Knowledge Retriever',
    'Performs semantic search over the company''s knowledge chunks.',
    'specialist',
    'gemini-2.5-flash',
    0.2,
    'flow-stream',
    'You are the Knowledge Retriever. Given a user query, call knowledge_retrieve with a focused search string and return the chunks verbatim with their (source: <title>) tags. Do not summarise.',
    true,
    true
  ),
  (
    'a0000000-0000-0000-0000-0000000000a3',
    'Knowledge Synthesizer',
    'Writes grounded markdown using only retrieved chunks as evidence.',
    'specialist',
    'gemini-2.5-flash',
    0.6,
    'edit',
    'You are the Knowledge Synthesizer. You receive retrieved chunks and a user instruction. Produce a markdown document that addresses the instruction. Every paragraph must include at least one (source: <document title>) tag pointing at a chunk you used. Use [[Wiki-link]] syntax to refer to other documents by their exact title.',
    true,
    true
  ),
  (
    'a0000000-0000-0000-0000-0000000000a4',
    'Knowledge Auto-Linker',
    'Extracts [[Wiki-links]] from a draft and resolves them to existing documents.',
    'specialist',
    'gemini-2.5-flash',
    0.0,
    'connect',
    'You are the Knowledge Auto-Linker. Given a markdown draft, extract every [[Wiki-link]], call knowledge_search_titles to resolve each one to a document id, then call knowledge_save_links with the resolved set. Do not edit the draft.',
    true,
    true
  ),
  (
    'a0000000-0000-0000-0000-0000000000a5',
    'Knowledge Critic',
    'Verifies that all wiki-links in a draft resolve to existing documents and reports broken ones.',
    'specialist',
    'gemini-2.5-flash',
    0.0,
    'help',
    'You are the Knowledge Critic. Given a markdown draft and a set of resolved links, identify every [[Wiki-link]] whose target_document_id is null. If any are broken, return a JSON object {"broken": ["Title", …], "ok": false}. Otherwise return {"broken": [], "ok": true}. Do not modify the draft.',
    true,
    true
  )
on conflict (id) do nothing;

insert into public.ai_agent_hierarchy (id, agent_id, parent_agent_id, hierarchy_level, sort_order)
values
  (gen_random_uuid(), 'a0000000-0000-0000-0000-0000000000a2', 'a0000000-0000-0000-0000-0000000000a1', 'worker', 1),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-0000000000a3', 'a0000000-0000-0000-0000-0000000000a1', 'worker', 2),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-0000000000a4', 'a0000000-0000-0000-0000-0000000000a1', 'worker', 3),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-0000000000a5', 'a0000000-0000-0000-0000-0000000000a1', 'worker', 4)
on conflict (agent_id) do nothing;

-- Tool wiring: the orchestrator exposes the three knowledge tools; specialists
-- get a focused subset.
insert into public.ai_agent_tools (id, agent_id, tool_type, tool_name, operations)
values
  (gen_random_uuid(), 'a0000000-0000-0000-0000-0000000000a1', 'knowledge', 'knowledge_retrieve',       null),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-0000000000a1', 'knowledge', 'knowledge_search_titles',  null),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-0000000000a1', 'knowledge', 'knowledge_save_links',     null),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-0000000000a2', 'knowledge', 'knowledge_retrieve',       null),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-0000000000a4', 'knowledge', 'knowledge_search_titles',  null),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-0000000000a4', 'knowledge', 'knowledge_save_links',     null),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-0000000000a5', 'knowledge', 'knowledge_search_titles',  null)
on conflict (agent_id, tool_type, tool_name) do nothing;
