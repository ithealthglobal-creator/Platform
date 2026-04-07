# AI Agents Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full AI agents system with LangGraph/Gemini backend, chat workspace, agent CRUD, organogram visualization, and execution monitoring.

**Architecture:** Python FastAPI service (`ai-service/`) using LangGraph StateGraph + Gemini 2.5, proxied through Next.js API routes. Agents are database-driven with per-agent tool permissions. PostgresSaver checkpointer for conversation persistence. SSE streaming for real-time chat.

**Tech Stack:** Python 3.12, FastAPI, LangGraph 1.0, LangChain 1.0, langchain-google-genai, PostgresSaver, Supabase, Next.js 16, React 19, shadcn/ui, Carbon icons, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-07-ai-agents-platform-design.md`

---

## Phase 1: Database Schema & Migrations

### Task 1: Create AI tables migration

**Files:**
- Create: `supabase/migrations/20260407600000_ai_agents_tables.sql`

- [ ] **Step 1: Write the migration SQL**

Note: The `update_updated_at()` function used by triggers below already exists from prior migrations. If not, add `CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;` at the top.

```sql
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
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applies successfully, all tables created.

- [ ] **Step 3: Verify tables exist**

Run: `npx supabase db reset` (to verify migration is repeatable)
Expected: Clean reset with all AI tables present.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260407600000_ai_agents_tables.sql
git commit -m "feat: add AI agents database schema (7 tables, indexes, triggers)"
```

---

### Task 2: Create RLS policies migration

**Files:**
- Create: `supabase/migrations/20260407600001_ai_agents_rls.sql`

- [ ] **Step 1: Write RLS policies**

```sql
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
```

- [ ] **Step 2: Apply and verify**

Run: `npx supabase db push`
Expected: RLS policies created successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260407600001_ai_agents_rls.sql
git commit -m "feat: add RLS policies for AI agents tables"
```

---

### Task 3: Seed default agents

**Files:**
- Create: `supabase/migrations/20260407600002_ai_agents_seed.sql`

- [ ] **Step 1: Write seed data for default orchestrators and specialists**

See spec Section 5 for full agent definitions. Insert The King, Growth, Accounts, Delivery orchestrators + Service Builder and Blog Writer specialists. Insert their hierarchy positions and tool permissions.

The migration should insert all `ai_agents` rows with `is_default = true`, then `ai_agent_hierarchy` rows, then `ai_agent_tools` rows for each agent's permitted tables and operations.

- [ ] **Step 2: Apply and verify**

Run: `npx supabase db push`
Expected: 6 agents created with hierarchy and tools configured.

- [ ] **Step 3: Verify via Supabase Studio**

Open `http://localhost:54323` → check `ai_agents` table has 6 rows, `ai_agent_hierarchy` has 6 rows, `ai_agent_tools` has correct tool counts per agent.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260407600002_ai_agents_seed.sql
git commit -m "feat: seed default AI agents (King, Growth, Accounts, Delivery, Service Builder, Blog Writer)"
```

---

### Task 4: Add AI menu items migration

**Files:**
- Create: `supabase/migrations/20260407600003_ai_menu_items.sql`

- [ ] **Step 1: Write menu item inserts**

Insert L1 "AI" menu item and L2 children (Chat, Agents, Organogram, Execution) following existing menu_items pattern. Add `role_menu_access` entries for admin role. Use Carbon icon names from spec Section 4.1: `AiGovernanceLifecycle`, `Chat`, `Bot`, `NetworkEnterprise`, `FlowStream`.

- [ ] **Step 2: Register icons in icon-map**

**Modify:** `src/lib/icon-map.ts`

Add the 5 new Carbon icon imports and map entries. Check that these icons exist in `@carbon/icons-react` first.

- [ ] **Step 3: Apply and verify**

Run: `npx supabase db push`
Expected: Menu items visible in admin sidebar after login.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260407600003_ai_menu_items.sql src/lib/icon-map.ts
git commit -m "feat: add AI menu items (L1 AI + L2 Chat, Agents, Organogram, Execution)"
```

---

## Phase 2: Python AI Service Foundation

### Task 5: Scaffold Python service

**Files:**
- Create: `ai-service/main.py`
- Create: `ai-service/config.py`
- Create: `ai-service/requirements.txt`
- Create: `ai-service/.env.example`
- Create: `ai-service/Dockerfile`
- Create: `ai-service/api/__init__.py`
- Create: `ai-service/api/routes/__init__.py`
- Create: `ai-service/api/middleware/__init__.py`
- Create: `ai-service/agents/__init__.py`
- Create: `ai-service/tools/__init__.py`
- Create: `ai-service/services/__init__.py`

- [ ] **Step 1: Create requirements.txt**

```
langchain>=1.0,<2.0
langchain-core>=1.0,<2.0
langgraph>=1.0,<2.0
langsmith>=0.3.0
langchain-google-genai
langgraph-checkpoint-postgres
fastapi>=0.115
uvicorn>=0.34
gunicorn
sse-starlette>=2.0
supabase>=2.0
pydantic>=2.0
pydantic-settings>=2.0
python-dotenv>=1.0
```

- [ ] **Step 2: Create config.py**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    google_api_key: str
    supabase_url: str
    supabase_service_role_key: str
    supabase_db_url: str
    environment: str = "local"
    max_delegation_depth: int = 4
    max_tool_calls_per_run: int = 50
    max_tokens_per_turn: int = 32000
    recursion_limit: int = 25

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 3: Create main.py**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import chat, executions
from services.checkpointer import get_checkpointer

@asynccontextmanager
async def lifespan(app: FastAPI):
    checkpointer = get_checkpointer()
    checkpointer.setup()
    yield

app = FastAPI(title="IThealth AI Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(executions.router, prefix="/executions", tags=["executions"])
# Note: Agent CRUD is handled by Next.js directly via Supabase.
# No /agents router needed in the Python service.

@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 4: Create .env.example and Dockerfile**

`.env.example`:
```
GOOGLE_API_KEY=
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
ENVIRONMENT=local
# Optional: LangSmith observability
# LANGSMITH_API_KEY=
# LANGSMITH_PROJECT=ithealth-ai-agents
# LANGSMITH_TRACING=true
```

`Dockerfile`:
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8080", "--timeout", "300"]
```

- [ ] **Step 5: Create empty __init__.py files for all packages**

- [ ] **Step 6: Create stub route files**

`api/routes/chat.py` and `api/routes/executions.py` — each with an empty `APIRouter`. (Agent CRUD is handled by Next.js directly, not the Python service.)

- [ ] **Step 7: Test service starts**

Run: `cd ai-service && pip install -r requirements.txt && uvicorn main:app --port 8100`
Expected: Server starts, `GET /health` returns `{"status": "ok"}`

- [ ] **Step 8: Commit**

```bash
git add ai-service/
git commit -m "feat: scaffold Python AI service (FastAPI, config, Dockerfile)"
```

---

### Task 6: Auth middleware

**Files:**
- Create: `ai-service/api/middleware/auth.py`
- Create: `ai-service/services/supabase_client.py`

- [ ] **Step 1: Create Supabase client service**

```python
from supabase import create_client
from config import settings

def get_supabase_admin():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
```

- [ ] **Step 2: Create auth middleware**

FastAPI dependency that extracts and validates the JWT from the `Authorization` header. Returns user profile (id, role, company_id). Raises `HTTPException(401)` on invalid token.

- [ ] **Step 3: Test with a valid Supabase JWT**

Run the service, call `/health` with and without auth header to verify middleware works.

- [ ] **Step 4: Commit**

```bash
git add ai-service/api/middleware/auth.py ai-service/services/supabase_client.py
git commit -m "feat: add auth middleware for AI service (JWT validation via Supabase)"
```

---

### Task 7: PostgresSaver checkpointer

**Files:**
- Create: `ai-service/services/checkpointer.py`

- [ ] **Step 1: Create checkpointer service**

```python
from langgraph.checkpoint.postgres import PostgresSaver
from config import settings

_checkpointer = None

def get_checkpointer() -> PostgresSaver:
    global _checkpointer
    if _checkpointer is None:
        _checkpointer = PostgresSaver.from_conn_string(settings.supabase_db_url)
    return _checkpointer
```

- [ ] **Step 2: Verify setup() creates checkpoint tables**

Run service startup, check Supabase Studio for LangGraph checkpoint tables.

- [ ] **Step 3: Commit**

```bash
git add ai-service/services/checkpointer.py
git commit -m "feat: add PostgresSaver checkpointer for LangGraph persistence"
```

---

## Phase 3: LangGraph Agent Core

### Task 8: Agent state and CRUD tools

**Files:**
- Create: `ai-service/agents/state.py`
- Create: `ai-service/tools/supabase_crud.py`
- Create: `ai-service/tools/registry.py`

- [ ] **Step 1: Define AgentState**

```python
from typing import Annotated, TypedDict
import operator

class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    agent_id: str
    delegation_depth: int
```

- [ ] **Step 2: Create table allowlist and CRUD tool generator**

`tools/supabase_crud.py` — hardcode the allowlist from spec Section 7.5. Create `generate_crud_tools(table_name, operations)` that returns a list of LangChain `@tool` functions. Each tool has a clear description auto-generated from the table name and operation.

- [ ] **Step 3: Create tool registry**

`tools/registry.py` — `build_tools_for_agent(agent_id)` queries `ai_agent_tools`, validates against allowlist, generates tools.

- [ ] **Step 4: Test CRUD tool generation**

Manually test that `generate_crud_tools("services", ["read"])` produces a working tool that can query the services table.

- [ ] **Step 5: Create web_search tool**

Create `ai-service/tools/web_search.py` — implements Google Search via Gemini's built-in grounding. Creates a LangChain `@tool` function `web_search(query: str) -> str` that uses Gemini's grounding feature to search the web and return results.

- [ ] **Step 6: Commit**

```bash
git add ai-service/agents/state.py ai-service/tools/
git commit -m "feat: add AgentState, CRUD tool generator, web search tool with table allowlist"
```

---

### Task 9: Delegation tool

**Files:**
- Create: `ai-service/tools/delegation.py`

- [ ] **Step 1: Create delegate_to_agent tool**

Implements the delegation logic from spec Section 3.7:
- Validates hierarchy (target is direct report)
- Validates cycle prevention (agent not already in chain)
- Validates depth < `settings.max_delegation_depth`
- Builds sub-agent graph via factory
- Invokes with child thread_id and recursion_limit
- Records delegation step in `ai_execution_steps`
- Returns sub-agent's final message

- [ ] **Step 2: Commit**

```bash
git add ai-service/tools/delegation.py
git commit -m "feat: add delegate_to_agent tool with hierarchy validation"
```

---

### Task 10: Agent factory (LangGraph StateGraph builder)

**Files:**
- Create: `ai-service/agents/factory.py`
- Create: `ai-service/agents/nodes.py`

- [ ] **Step 1: Create graph nodes**

`agents/nodes.py` — `call_model`, `route_after_model`, `approve_action`, `route_after_approval` functions as described in spec Section 3.5.

- [ ] **Step 2: Create factory**

`agents/factory.py` — `build_agent_graph(agent_config, tools, checkpointer)` that assembles the StateGraph with nodes and edges, compiles with checkpointer. Follows the exact pattern from spec Section 3.5.

- [ ] **Step 3: Test factory builds a valid graph**

Create a simple test agent config, build graph, verify it compiles without error.

- [ ] **Step 4: Commit**

```bash
git add ai-service/agents/factory.py ai-service/agents/nodes.py
git commit -m "feat: add LangGraph agent factory with HITL approval node"
```

---

### Task 11: Execution tracker callback

**Files:**
- Create: `ai-service/agents/callbacks/__init__.py`
- Create: `ai-service/agents/callbacks/execution_tracker.py`

- [ ] **Step 1: Create execution tracker**

LangGraph callback handler that writes `ai_execution_runs` and `ai_execution_steps` to Supabase in real-time.

**Integration:** Registered as a LangGraph callback on the compiled graph. Receives `on_tool_start`, `on_tool_end`, `on_chain_start`, `on_chain_end` events.

**Idempotency:** All writes use upsert (keyed on step `id`), safe for interrupt-resume re-execution (spec Section 7.8).

**Circuit breaker:** Counts tool calls per run. When count exceeds `settings.max_tool_calls_per_run` (default 50), raises an exception that terminates the graph and marks the run as `failed`.

- [ ] **Step 2: Commit**

```bash
git add ai-service/agents/callbacks/
git commit -m "feat: add execution tracker callback (writes steps to Supabase)"
```

---

## Phase 4: Chat API & Streaming

### Task 12: Chat route with SSE streaming

**Files:**
- Modify: `ai-service/api/routes/chat.py`
- Create: `ai-service/services/streaming.py`

- [ ] **Step 1: Create SSE streaming service**

`services/streaming.py` — translates LangGraph `graph.stream()` output into SSE events matching spec Section 3.4 format (token, tool_start, tool_end, delegation, interrupt, done, error).

- [ ] **Step 2: Implement POST /chat endpoint**

`api/routes/chat.py`:
- Accepts `{conversation_id, message, agent_id?}`
- Auth dependency validates JWT
- Creates/loads conversation
- Loads agent config from DB
- Builds graph via factory
- Streams response via SSE
- Writes summary `ai_messages` rows after completion
- Auto-generates conversation title on first turn

- [ ] **Step 3: Implement POST /chat/resume endpoint**

For HITL: accepts `{conversation_id, resume_value}`, calls `graph.invoke(Command(resume=resume_value), config)`, streams continuation.

- [ ] **Step 4: Test with curl**

```bash
curl -N -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"conversation_id": null, "message": "Hello", "agent_id": "<king-id>"}' \
  http://localhost:8100/chat
```
Expected: SSE events stream back with token events.

- [ ] **Step 5: Commit**

```bash
git add ai-service/api/routes/chat.py ai-service/services/streaming.py
git commit -m "feat: add chat API with SSE streaming and HITL resume"
```

---

### Task 13: Executions route

**Files:**
- Modify: `ai-service/api/routes/executions.py`

- [ ] **Step 1: Implement GET /executions**

Returns list of execution runs for the authenticated user (via conversation ownership). Supports query params: `conversation_id`, `status` filter.

- [ ] **Step 2: Implement GET /executions/{run_id}/steps**

Returns all steps for a given run, ordered by `created_at`.

- [ ] **Step 3: Commit**

```bash
git add ai-service/api/routes/executions.py
git commit -m "feat: add executions API (list runs, get steps)"
```

---

## Phase 5: Docker & Infrastructure

### Task 14: Docker Compose for local dev

**Files:**
- Create: `docker-compose.ai.yml`
- Modify: `.gitignore` (add `ai-service/.env`)

- [ ] **Step 1: Create docker-compose.ai.yml**

As specified in spec Section 6.1 — AI service with env vars, extra_hosts for Docker-to-host networking, volume mount for hot reload.

- [ ] **Step 2: Create ai-service/.env from .env.example**

Fill in the actual Gemini API key and local Supabase credentials.

- [ ] **Step 3: Test full local stack**

```bash
npx supabase start
docker compose -f docker-compose.ai.yml up --build
# In another terminal:
curl http://localhost:8100/health
```
Expected: `{"status": "ok"}`

- [ ] **Step 4: Commit**

```bash
git add docker-compose.ai.yml .gitignore
git commit -m "feat: add Docker Compose for AI service local development"
```

---

## Phase 6: Next.js API Proxy Routes

### Task 15: Next.js proxy routes

**Files:**
- Create: `src/app/api/admin/ai/chat/route.ts`
- Create: `src/app/api/admin/ai/chat/resume/route.ts`
- Create: `src/app/api/admin/ai/agents/route.ts`
- Create: `src/app/api/admin/ai/agents/[id]/route.ts`
- Create: `src/app/api/admin/ai/executions/route.ts`

- [ ] **Step 1: Add AI_SERVICE_URL to .env.local**

```
AI_SERVICE_URL=http://localhost:8100
```

- [ ] **Step 2: Create chat proxy route**

`src/app/api/admin/ai/chat/route.ts` — POST handler that:
1. Validates admin auth (existing `verifyAdmin` pattern)
2. Forwards request body + JWT to Python service `POST /chat`
3. Streams SSE response back to browser

- [ ] **Step 3: Create chat resume proxy route**

`src/app/api/admin/ai/chat/resume/route.ts` — same pattern, proxies to `POST /chat/resume`.

- [ ] **Step 4: Create agents CRUD routes**

`agents/route.ts` — GET (list), POST (create) — direct Supabase queries, same pattern as existing admin routes.
`agents/[id]/route.ts` — GET, PUT, DELETE for single agent.

- [ ] **Step 5: Create executions proxy route**

`executions/route.ts` — GET, proxies to Python service.

- [ ] **Step 6: Test proxy routes**

Start Next.js + AI service, call `/api/admin/ai/agents` with auth header.
Expected: Returns list of default agents from Supabase.

- [ ] **Step 7: Commit**

Note: Add `AI_SERVICE_URL=http://localhost:8100` to your `.env.local` manually. Do NOT commit `.env.local`.

```bash
git add src/app/api/admin/ai/
git commit -m "feat: add Next.js API proxy routes for AI service"
```

---

## Phase 7: Frontend — Agents CRUD Page

### Task 16: Agent list page

**Files:**
- Create: `src/app/(admin)/ai/agents/page.tsx`
- Create: `src/components/ai/agents/agent-table.tsx`

- [ ] **Step 1: Create agent table component**

Table with columns: Name, Type (badge), Model, Tools (count), Status, Actions. Default agents show lock icon. "New Agent" button. Follow existing admin table patterns (e.g., services list page).

- [ ] **Step 2: Create agents list page**

Fetches agents from Supabase with tool count join. Renders `AgentTable`. Delete handler (with default agent protection).

- [ ] **Step 3: Verify page renders**

Navigate to `/ai/agents` in browser. Should show 6 default agents.

- [ ] **Step 4: Commit**

```bash
git add src/app/(admin)/ai/agents/page.tsx src/components/ai/agents/agent-table.tsx
git commit -m "feat: add AI agents list page with table"
```

---

### Task 17: Agent create/edit form

**Files:**
- Create: `src/app/(admin)/ai/agents/new/page.tsx`
- Create: `src/app/(admin)/ai/agents/[id]/edit/page.tsx`
- Create: `src/components/ai/agents/agent-form.tsx`
- Create: `src/components/ai/agents/tool-permissions.tsx`

- [ ] **Step 1: Create tool permissions component**

Panel with two sections: Supabase Tables (checkboxes for R/C/U/D per table from allowlist) and LangChain Tools (toggles for web_search, etc.).

- [ ] **Step 2: Create agent form component**

Form with all fields from spec Section 4.4: name, description, type radio, system prompt textarea, model dropdown, temperature slider, icon picker, tool permissions panel. Save/Cancel buttons.

- [ ] **Step 3: Create new agent page**

Wraps `AgentForm` in create mode. On save: inserts into `ai_agents` + `ai_agent_tools`.

- [ ] **Step 4: Create edit agent page**

Wraps `AgentForm` in edit mode. Loads existing agent data. For default agents: shows "Reset to Default" button, prevents deletion.

- [ ] **Step 5: Test create and edit flows**

Create a new test agent, verify it appears in the list. Edit it, verify changes persist.

- [ ] **Step 6: Commit**

```bash
git add src/app/(admin)/ai/agents/ src/components/ai/agents/
git commit -m "feat: add AI agent create/edit forms with tool permissions"
```

---

## Phase 8: Frontend — Chat Workspace

### Task 18: Chat components — conversation list and message input

**Files:**
- Create: `src/components/ai/chat/conversation-list.tsx`
- Create: `src/components/ai/chat/message-input.tsx`
- Create: `src/components/ai/chat/agent-selector.tsx`

- [ ] **Step 1: Create agent selector dropdown**

Fetches active agents from Supabase, renders as a dropdown. Shows agent name + type badge.

- [ ] **Step 2: Create conversation list sidebar**

Fetches `ai_conversations` for the current user, ordered by `updated_at DESC`. Grouped by date (Today, Yesterday, This Week, Older). Archived conversations (`is_active = false`) shown in a separate "Archived" section at the bottom. Each item shows agent icon, title, last message preview, timestamp. "New Chat" button at top with agent selector. Delete button (with confirmation) on each conversation — cascades to messages, runs, steps.

- [ ] **Step 3: Create message input bar**

Text input with send button. Disabled while agent is processing. Shift+Enter for newline, Enter to send.

- [ ] **Step 4: Commit**

```bash
git add src/components/ai/chat/
git commit -m "feat: add chat conversation list, agent selector, message input"
```

---

### Task 19: Chat message display with streaming

**Files:**
- Create: `src/components/ai/chat/message-list.tsx`
- Create: `src/components/ai/chat/tool-call-card.tsx`
- Create: `src/components/ai/chat/approval-card.tsx`

- [ ] **Step 1: Create tool call card**

Collapsible card showing: tool name, input JSON (formatted), output JSON (formatted), duration. Starts expanded, collapses after completion.

- [ ] **Step 2: Create approval card**

HITL component: shows what the agent wants to do (tool name, args preview). Three buttons: Approve, Edit (opens editable JSON), Reject. Calls `/api/admin/ai/chat/resume` with the user's decision.

- [ ] **Step 3: Create message list with SSE streaming**

Connects to `/api/admin/ai/chat` via `EventSource`. Renders messages: user (right-aligned), assistant (left-aligned with agent avatar/name). Streams tokens into the current assistant message in real-time. Renders tool call cards inline. Shows "Thinking..." indicator. Shows approval card on `interrupt` events.

- [ ] **Step 4: Commit**

```bash
git add src/components/ai/chat/
git commit -m "feat: add chat message list with SSE streaming, tool calls, HITL approval"
```

---

### Task 20: Chat workspace page with preview pane

**Files:**
- Create: `src/app/(admin)/ai/chat/page.tsx`
- Create: `src/components/ai/chat/preview-pane.tsx`

- [ ] **Step 1: Create preview pane**

Right panel that renders structured output contextually. Parses `tool_end` events to detect what's being built. For service creation: shows live service card. For blog writing: renders markdown preview. For generic: formatted JSON/table.

- [ ] **Step 2: Create chat workspace page**

Three-panel layout: ConversationList (left, 280px), MessageList + MessageInput (center, flex), PreviewPane (right, 400px, collapsible). Manages conversation state, SSE connection lifecycle, new chat creation.

- [ ] **Step 3: Test end-to-end chat**

Open `/ai/chat`, select an agent, send a message. Verify SSE streaming works, messages appear, tool calls show.

- [ ] **Step 4: Commit**

```bash
git add src/app/(admin)/ai/chat/ src/components/ai/chat/preview-pane.tsx
git commit -m "feat: add chat workspace page with three-panel layout and preview pane"
```

---

## Phase 9: Frontend — Organogram

### Task 21: Organogram page

**Files:**
- Create: `src/app/(admin)/ai/organogram/page.tsx`
- Create: `src/components/ai/organogram/org-chart.tsx`
- Create: `src/components/ai/organogram/org-node.tsx`
- Create: `src/components/ai/organogram/agent-detail-panel.tsx`

- [ ] **Step 1: Create org node component**

SVG node: rounded rectangle with agent name, type icon. Color-coded by hierarchy level (Gold=King, Blue=Department, Pink=Manager, Navy=Worker). Click handler.

- [ ] **Step 2: Create org chart renderer**

SVG-based tree layout. Fetches `ai_agent_hierarchy` with agent details. Calculates positions for top-down tree layout. Draws connecting lines between parent-child nodes. Renders OrgNode for each agent. Shows unassigned agents in bottom tray.

- [ ] **Step 3: Create agent detail panel**

Side panel (slides in from right) showing agent details: name, type, description, tools list, system prompt preview. "Edit Agent" link to `/ai/agents/{id}/edit`.

- [ ] **Step 4: Create organogram page**

Combines OrgChart + AgentDetailPanel. Fetches hierarchy data on mount. Handles node click to open detail panel. "Assign Agent" button on empty positions. Unassigned agents shown in a bottom tray.

**Deferred from spec:** Drag-and-drop hierarchy reassignment. For now, use numeric sort order inputs (matching existing menu editor convention from CLAUDE.md). Drag-and-drop can be added in a follow-up phase.

- [ ] **Step 5: Test visualization**

Navigate to `/ai/organogram`. Should show The King at top, departments below, workers at bottom with connecting lines.

- [ ] **Step 6: Commit**

```bash
git add src/app/(admin)/ai/organogram/ src/components/ai/organogram/
git commit -m "feat: add organogram page with SVG org chart visualization"
```

---

## Phase 10: Frontend — Execution Monitor

### Task 22: Execution history and detail view

**Files:**
- Create: `src/app/(admin)/ai/execution/page.tsx`
- Create: `src/components/ai/execution/execution-table.tsx`
- Create: `src/components/ai/execution/execution-timeline.tsx`
- Create: `src/components/ai/execution/live-flow.tsx`

- [ ] **Step 1: Create execution history table**

Table with columns: Timestamp, Trigger Message (truncated), Agents Involved (avatar badges), Duration, Status (badge: running/completed/failed/cancelled). Sortable by date. Filterable by status dropdown. Click row → detail view.

- [ ] **Step 2: Create execution timeline detail view**

Vertical timeline of execution steps for a selected run. Each step shows: agent name + avatar, step type icon, tool name (if tool_call), duration badge, status color. Expandable input/output JSON panels. Delegation steps show arrow icon.

- [ ] **Step 3: Create live flow visualization**

Real-time view for running executions. Connects to SSE for step updates. Shows agent nodes that light up when active. Tool call sub-nodes appear and complete. Elapsed time counter.

- [ ] **Step 4: Create execution page with tabs**

Two tabs: "Live" (LiveFlow) and "History" (ExecutionTable). History tab shows detail view when a row is clicked (inline expand or slide panel).

- [ ] **Step 5: Test with a running conversation**

Start a chat that triggers tool calls, switch to Execution page. Should show the run in Live tab. After completion, should appear in History.

- [ ] **Step 6: Commit**

```bash
git add src/app/(admin)/ai/execution/ src/components/ai/execution/
git commit -m "feat: add execution monitor with live flow and history timeline"
```

---

## Phase 11: Default Agent System Prompts

### Task 23: Write default agent system prompts

**Files:**
- Create: `ai-service/agents/defaults/__init__.py`
- Create: `ai-service/agents/defaults/service_builder.py`
- Create: `ai-service/agents/defaults/blog_writer.py`
- Create: `ai-service/agents/defaults/orchestrators.py`

- [ ] **Step 1: Write Service Builder system prompt**

Full system prompt as described in spec Section 5.1. Guides users through step-by-step service creation. Reads existing data (phases, products, verticals, etc.) to make suggestions. Confirms before creating records.

- [ ] **Step 2: Write Blog Writer system prompt**

Full system prompt as described in spec Section 5.2. Researches via web search, creates outline for approval, writes full markdown article.

- [ ] **Step 3: Write orchestrator system prompts**

The King, Growth, Accounts, Delivery — each with instructions to understand requests, identify the right sub-agent, delegate, and synthesize results.

- [ ] **Step 4: Create a migration to update seed agents with full prompts**

Update the existing default agent rows with the full system prompts (if not already included in Task 3's seed migration).

- [ ] **Step 5: Test King → Blog Writer delegation chain**

Chat with The King: "Write a blog about endpoint security for SMBs". Verify it delegates to Growth → Blog Writer and returns a blog post.

- [ ] **Step 6: Commit**

```bash
git add ai-service/agents/defaults/
git commit -m "feat: add default agent system prompts (Service Builder, Blog Writer, orchestrators)"
```

---

## Phase 12: Integration & Polish

### Task 24: End-to-end integration test

**Files:** (no new files — testing existing)

- [ ] **Step 1: Start full stack**

```bash
npx supabase start
docker compose -f docker-compose.ai.yml up --build
npm run dev
```

- [ ] **Step 2: Test Agent CRUD flow**

1. Login as admin
2. Navigate to `/ai/agents`
3. Verify 6 default agents visible
4. Create a new specialist agent with blog_posts read access
5. Edit it, change the system prompt
6. Verify default agents can't be deleted

- [ ] **Step 3: Test Chat flow**

1. Navigate to `/ai/chat`
2. Start new chat with Service Builder
3. Ask it to create a service
4. Verify SSE streaming works
5. Verify HITL approval card appears for create operations
6. Approve, verify service is created

- [ ] **Step 4: Test Organogram**

1. Navigate to `/ai/organogram`
2. Verify tree renders with all default agents in correct positions
3. Click a node, verify detail panel opens

- [ ] **Step 5: Test Execution Monitor**

1. Navigate to `/ai/execution`
2. Verify history shows past runs from chat testing
3. Click a run, verify timeline detail shows all steps

- [ ] **Step 6: Test delegation chain**

1. Chat with The King: "Write a blog post about cloud migration"
2. Verify delegation to Growth → Blog Writer
3. Check Execution page shows the full delegation chain

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration test fixes for AI agents platform"
```

---

### Task 25: Add .gitignore entries and cleanup

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add entries**

```
# AI service
ai-service/.env
ai-service/__pycache__/
ai-service/**/__pycache__/
ai-service/*.pyc

# Brainstorm artifacts
.superpowers/
```

- [ ] **Step 2: Remove any committed .env or __pycache__ files**

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add AI service entries to .gitignore"
```
