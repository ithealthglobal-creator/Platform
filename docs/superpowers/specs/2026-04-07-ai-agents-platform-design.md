# AI Agents Platform — Design Spec

**Date:** 2026-04-07
**Status:** Approved
**Scope:** New "AI" admin menu section with Chat, Agents, Organogram, and Execution pages. LangChain Python backend with Gemini 2.5. Default agents for service building and blog writing.

---

## 1. Overview

A comprehensive AI agents system for IThealth.ai that allows admins to create, manage, and interact with AI agents. Agents are organized in a hierarchical organogram (King → Department → Manager → Worker), can access Supabase data with per-agent permissions, search the web, and delegate work to other agents in the hierarchy.

### Key Decisions

- **Architecture:** Monorepo — Python FastAPI service at `ai-service/` alongside existing Next.js app
- **AI Engine:** Google Gemini 2.5 (Flash default, Pro available) via `langchain-google-genai`
- **Agent hierarchy:** Users can talk to any agent directly; agents can delegate up/down the hierarchy
- **Permissions:** Per-agent tool configuration — each agent gets specific table access and operation permissions
- **Chat UX:** Workspace layout — conversation list, chat messages, and live preview pane
- **Organogram style:** Classic top-down org chart with color-coded levels
- **Execution view:** Real-time live flowchart + historical browsing
- **Default agents:** Pre-configured, always available, customizable but not deletable
- **Search:** Google Search via Gemini's built-in grounding
- **Infrastructure:** Docker Compose locally, GCP Cloud Run in production

---

## 2. Database Schema

### 2.1 `ai_agents`

Core agent definition table.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Default `gen_random_uuid()` |
| `name` | text NOT NULL | e.g., "Service Builder" |
| `description` | text | What the agent does |
| `agent_type` | text NOT NULL CHECK (`specialist`, `orchestrator`) | |
| `model` | text DEFAULT `'gemini-2.5-flash'` | LLM model identifier |
| `system_prompt` | text | Agent's system instructions |
| `temperature` | numeric DEFAULT 0.7 | |
| `is_default` | boolean DEFAULT false | Pre-configured agents, can't delete |
| `is_active` | boolean DEFAULT true | |
| `icon` | text | Carbon icon name |
| `created_by` | uuid FK → profiles | |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

Trigger: `prevent_default_agent_delete` — prevents deletion when `is_default = true`.
Trigger: `set_updated_at` — auto-updates `updated_at` on row modification (same pattern as existing tables).

### 2.2 `ai_agent_tools`

Per-agent tool permissions.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `agent_id` | uuid FK → ai_agents ON DELETE CASCADE | |
| `tool_type` | text NOT NULL CHECK (`supabase_crud`, `web_search`, `langchain`) | |
| `tool_name` | text NOT NULL | e.g., `blog_posts`, `google_search`, `calculator` |
| `operations` | text[] | For CRUD: `{'read','create','update','delete'}` |
| `is_active` | boolean DEFAULT true | |

Unique constraint: `(agent_id, tool_type, tool_name)`.

### 2.3 `ai_agent_hierarchy`

Organogram structure.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `agent_id` | uuid FK → ai_agents ON DELETE CASCADE (UNIQUE) | |
| `parent_agent_id` | uuid FK → ai_agents (nullable) | null = The King (top level) |
| `hierarchy_level` | text NOT NULL CHECK (`king`, `department`, `manager`, `worker`) | |
| `sort_order` | integer DEFAULT 0 | |

Constraint: `CREATE UNIQUE INDEX ON ai_agent_hierarchy (hierarchy_level) WHERE hierarchy_level = 'king'` — enforces exactly one King at the database level.

### 2.4 `ai_conversations`

Chat threads.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles ON DELETE CASCADE | |
| `agent_id` | uuid FK → ai_agents ON DELETE SET NULL | Primary agent (null if agent deleted) |
| `title` | text | Auto-generated from first user message via LLM summary, or user-set |
| `is_active` | boolean DEFAULT true | |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

### 2.5 `ai_messages`

Individual messages.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `conversation_id` | uuid FK → ai_conversations ON DELETE CASCADE | |
| `role` | text NOT NULL CHECK (`user`, `assistant`, `system`, `tool`) | |
| `content` | text | Message text |
| `agent_id` | uuid FK → ai_agents ON DELETE SET NULL (nullable) | Which agent sent this (null if agent deleted) |
| `token_count` | integer | Token usage for this message (for cost tracking) |
| `metadata` | jsonb DEFAULT '{}' | Tool calls, structured output, etc. |
| `created_at` | timestamptz DEFAULT now() | |

### 2.6 `ai_execution_runs`

Top-level execution tracking.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `conversation_id` | uuid FK → ai_conversations | |
| `trigger_message_id` | uuid FK → ai_messages | User message that started this |
| `status` | text NOT NULL CHECK (`running`, `completed`, `failed`, `cancelled`) | |
| `started_at` | timestamptz DEFAULT now() | |
| `completed_at` | timestamptz | |

### 2.7 `ai_execution_steps`

Individual steps within a run.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `run_id` | uuid FK → ai_execution_runs ON DELETE CASCADE | |
| `agent_id` | uuid FK → ai_agents | Which agent executed this |
| `step_type` | text NOT NULL CHECK (`agent_call`, `tool_call`, `delegation`, `response`) | |
| `tool_name` | text | If `tool_call`, which tool |
| `input` | jsonb | Input to the step |
| `output` | jsonb | Output from the step |
| `parent_step_id` | uuid FK → self (nullable) | Nested delegation chains |
| `duration_ms` | integer | |
| `status` | text NOT NULL CHECK (`running`, `completed`, `failed`) | |
| `created_at` | timestamptz DEFAULT now() | |

### 2.8 RLS Policies

| Table | Policy |
|---|---|
| `ai_agents` | Admins: full CRUD. Customers/Partners: read active agents only |
| `ai_agent_tools` | Admins: full CRUD. Others: no access |
| `ai_agent_hierarchy` | Admins: full CRUD. Others: read only |
| `ai_conversations` | Users read/write their own conversations only |
| `ai_messages` | Access through conversation ownership |
| `ai_execution_runs` | Access through conversation ownership |
| `ai_execution_steps` | Access through run → conversation ownership |

### 2.9 Indexes

| Index | Columns | Purpose |
|---|---|---|
| `idx_ai_messages_conversation_time` | `(conversation_id, created_at)` | Load message history in order |
| `idx_ai_conversations_user_time` | `(user_id, updated_at DESC)` | List conversations sorted by recency |
| `idx_ai_execution_steps_run_time` | `(run_id, created_at)` | Timeline display |
| `idx_ai_execution_runs_conversation` | `(conversation_id, started_at DESC)` | Link runs to conversations |

### 2.10 Conversation Lifecycle

- **Title auto-generation:** After the first assistant response in a new conversation, the Python service makes a separate lightweight LLM call to generate a short title from the first user message. Stored in `ai_conversations.title`.
- **Deletion:** Users can delete their own conversations from the conversation list. Cascades delete all messages, runs, and steps.
- **Archiving:** Conversations older than 90 days are marked `is_active = false` and moved to an "Archived" section in the conversation list. Still accessible, just visually separated.

---

## 3. Python AI Service

### 3.1 Directory Structure

```
ai-service/
├── main.py                     # FastAPI app, CORS, lifespan
├── requirements.txt
├── Dockerfile
├── .env.example
├── config.py                   # Settings (Supabase URL, Gemini key, etc.)
├── api/
│   ├── routes/
│   │   ├── chat.py             # POST /chat (streaming SSE)
│   │   ├── agents.py           # CRUD endpoints for agent management
│   │   └── executions.py       # GET execution runs/steps
│   └── middleware/
│       └── auth.py             # Validates JWT from Next.js
├── agents/
│   ├── factory.py              # Builds LangChain agent from DB config
│   ├── orchestrator.py         # Orchestrator agent logic (delegation)
│   ├── defaults/
│   │   ├── service_builder.py  # Default Service Builder agent config
│   │   └── blog_writer.py      # Default Blog Writer agent config
│   └── callbacks/
│       └── execution_tracker.py # LangChain callback → writes execution steps
├── tools/
│   ├── supabase_crud.py        # Dynamic CRUD tool generator per table
│   ├── web_search.py           # Google Search via Gemini grounding
│   └── registry.py             # Maps tool_name → LangChain Tool
└── services/
    ├── supabase_client.py      # Supabase Python client
    └── streaming.py            # SSE response formatter
```

### 3.2 Key Dependencies

```
langchain>=0.3
langchain-google-genai>=2.0
fastapi>=0.115
uvicorn>=0.34
supabase>=2.0
pydantic>=2.0
sse-starlette>=2.0
```

### 3.3 Chat Flow

1. Next.js sends `POST /chat` with `{conversation_id, message, auth_token}`
2. Auth middleware validates JWT via Supabase `auth.getUser(token)`
3. Factory loads agent config from `ai_agents` + `ai_agent_tools`
4. Builds LangChain agent with only permitted tools
5. Creates `ai_execution_runs` record with status `running`
6. Executes agent with `ExecutionTracker` callback that writes `ai_execution_steps` in real-time
7. Streams response back via SSE

### 3.4 SSE Streaming Format

```
event: token
data: {"content": "Here's the blog"}

event: tool_start
data: {"tool": "blog_posts_create", "input": {...}}

event: tool_end
data: {"tool": "blog_posts_create", "output": {...}}

event: delegation
data: {"from_agent": "King", "to_agent": "Blog Writer", "reason": "..."}

event: done
data: {"message_id": "...", "run_id": "..."}
```

### 3.5 Agent Factory

The factory (`agents/factory.py`) is the core component:

1. Queries `ai_agents` for agent config (model, system_prompt, temperature)
2. Queries `ai_agent_tools` for permitted tools
3. For each `supabase_crud` tool: generates a LangChain tool with only the allowed operations (read/create/update/delete)
4. For `web_search`: enables Gemini's built-in Google Search grounding
5. For orchestrator agents: adds a `delegate_to_agent` tool that can invoke sub-agents in the hierarchy
6. Returns a configured LangChain agent ready for execution

### 3.6 Supabase CRUD Tool Generator

`tools/supabase_crud.py` dynamically creates LangChain tools per table:

- Reads table column metadata from Supabase to generate tool descriptions
- Creates separate tools per operation: `{table}_read`, `{table}_create`, `{table}_update`, `{table}_delete`
- Only generates tools for operations listed in `ai_agent_tools.operations`
- Uses Supabase service_role key for data access (bypasses RLS — agents are admin-scoped)

### 3.7 Orchestrator Delegation

When an orchestrator agent needs to delegate:

1. It calls the `delegate_to_agent` tool with a target agent name and task description
2. The tool validates: (a) target is a direct report in `ai_agent_hierarchy`, (b) target has not already been invoked in this execution chain (cycle prevention), (c) current delegation depth < 4
3. Builds the target agent via the factory
4. Executes it as a sub-chain, passing the current depth + 1
5. Records delegation as an `ai_execution_steps` entry with `step_type = 'delegation'`
6. Returns the sub-agent's response to the orchestrator

If validation fails in step 2, the tool returns an error message to the orchestrator instead of executing — the orchestrator can then try a different agent or handle the task itself.

---

## 4. Next.js Frontend

### 4.1 Menu Registration

New menu items added via migration:

| Level | Label | Route | Icon | Parent |
|---|---|---|---|---|
| L1 | AI | `/ai` | `AiGovernanceLifecycle` | — |
| L2 | Chat | `/ai/chat` | `Chat` | AI |
| L2 | Agents | `/ai/agents` | `Bot` | AI |
| L2 | Organogram | `/ai/organogram` | `NetworkEnterprise` | AI |
| L2 | Execution | `/ai/execution` | `FlowStream` | AI |

### 4.2 Route Structure

```
src/app/(admin)/ai/
├── chat/
│   └── page.tsx                # Workspace chat page
├── agents/
│   ├── page.tsx                # Agent list table
│   └── new/
│       └── page.tsx            # Create/edit agent form
│   └── [id]/
│       └── edit/
│           └── page.tsx        # Edit agent form
├── organogram/
│   └── page.tsx                # Org chart visualization
└── execution/
    └── page.tsx                # Execution monitor (live + history)
```

### 4.3 Chat Page — Workspace Layout

Three-panel layout:

**Left panel — Conversation List:**
- List of past conversations grouped by date
- Each shows: agent avatar, title, last message preview, timestamp
- "New Chat" button at top
- Agent selector dropdown to pick which agent to start a conversation with

**Center panel — Chat Messages:**
- Streaming message display with typing indicators
- User messages right-aligned, agent messages left-aligned
- Agent avatar + name shown on each message (important when delegation happens — different agents respond)
- Inline tool call cards: collapsible cards showing tool name, input, output
- "Thinking..." indicator when agent is processing

**Right panel — Preview Pane:**
- Renders structured output contextually:
  - Service Builder: live service card filling in (name, description, phase, products, market tags)
  - Blog Writer: rendered markdown blog post preview
  - Generic: formatted JSON or table display for data operations
- Updates in real-time as SSE events arrive
- Collapsible to give more room to chat

### 4.4 Agents Page — CRUD

**List view:**
- Table with columns: Name, Type (badge: specialist/orchestrator), Model, Tools (count), Status (active/inactive), Actions
- Default agents show a lock icon
- "New Agent" button

**Create/Edit form:**
- Name (text input, required)
- Description (textarea)
- Type selector (specialist / orchestrator radio)
- System prompt (large textarea with markdown preview toggle)
- Model picker (dropdown: Gemini 2.5 Flash, Gemini 2.5 Pro)
- Temperature slider (0.0 - 1.0)
- Icon picker (Carbon icon grid)
- **Tool Permissions panel:**
  - Section: Supabase Tables — list of all tables with checkboxes per operation (Read, Create, Update, Delete)
  - Section: LangChain Tools — toggles for web_search, calculator, etc.
- Save / Cancel buttons
- For default agents: "Reset to Default" button to restore original system prompt

### 4.5 Organogram Page — Org Chart

- SVG-based classic top-down tree
- Color-coded nodes by hierarchy level:
  - Gold (#FFB800) — King
  - Blue (#4A90D9) — Department
  - Pink (#E8578A) — Manager
  - Navy (#2D3A5C) — Worker
- Click node → side panel shows agent details (name, type, description, tools, system prompt preview)
- Drag-and-drop to reassign hierarchy (move agent to different parent)
- "Assign Agent" button on empty slots
- Unassigned agents shown in a bottom tray
- Connecting lines between parent-child nodes

### 4.6 Execution Page — Monitor

**Live tab:**
- Shows currently running execution runs
- Real-time flowchart: agent nodes light up green when executing, edges animate to show delegation flow, tool call sub-nodes appear and complete
- SSE connection to get real-time step updates
- Shows: agent name, current tool being called, elapsed time

**History tab:**
- Table of past runs: Timestamp, Trigger Message (truncated), Agents Involved (avatars), Duration, Status (badge)
- Sortable by date, filterable by status
- Click row → detail view

**Detail view:**
- Vertical timeline of execution steps
- Each step shows: agent name, step type icon, tool name (if tool_call), duration
- Expandable input/output JSON for each step
- Delegation steps show an arrow from parent agent to child agent
- Color-coded by status: green (completed), red (failed), blue (running)

### 4.7 Component Structure

```
src/components/ai/
├── chat/
│   ├── conversation-list.tsx    # Left sidebar with chat history
│   ├── message-list.tsx         # Chat messages with streaming
│   ├── message-input.tsx        # Input bar with send button
│   ├── agent-selector.tsx       # Dropdown to pick agent
│   ├── tool-call-card.tsx       # Inline display of tool invocations
│   └── preview-pane.tsx         # Right panel live preview
├── agents/
│   ├── agent-table.tsx          # Agent list table
│   ├── agent-form.tsx           # Create/edit form
│   └── tool-permissions.tsx     # Table + operation checkboxes
├── organogram/
│   ├── org-chart.tsx            # SVG tree renderer
│   ├── org-node.tsx             # Individual agent node
│   └── agent-detail-panel.tsx   # Side panel on click
└── execution/
    ├── live-flow.tsx            # Real-time execution flowchart
    ├── execution-table.tsx      # History table
    └── execution-timeline.tsx   # Step-by-step detail view
```

### 4.8 Next.js API Proxy Routes

```
src/app/api/admin/ai/
├── chat/route.ts               # Proxies POST to Python /chat, streams SSE back
├── agents/route.ts             # CRUD via Supabase directly (same pattern as existing admin)
├── agents/[id]/route.ts        # Single agent GET/PUT/DELETE
└── executions/route.ts         # Proxies to Python /executions
```

Chat and execution routes proxy to the Python service. Agent CRUD goes direct to Supabase from Next.js (matches existing admin patterns).

---

## 5. Default Agents — Seed Data

### 5.1 Service Builder

- **Type:** specialist
- **Model:** gemini-2.5-flash
- **Hierarchy:** Worker under "Delivery" department
- **System prompt:** Guides users through service creation step-by-step. Asks about target market, suggests products from catalog, builds skills requirements. Confirms with user before creating records.
- **Tools:**
  - `services` (R, C, U)
  - `phases` (R)
  - `products` (R)
  - `verticals`, `personas`, `pains`, `gains`, `skills` (R)
  - `service_verticals`, `service_personas`, `service_pains`, `service_gains`, `service_products`, `service_skills` (R, C, D)
  - `web_search`
- **Preview pane:** Live service card that fills in as the agent works — name, description, phase badge, linked products, market tags

### 5.2 Blog Writer

- **Type:** specialist
- **Model:** gemini-2.5-flash
- **Hierarchy:** Worker under "Growth" department
- **System prompt:** Creates professional blog articles about IT modernisation for SMBs. Researches using web search, creates outline for approval, writes full article with markdown formatting.
- **Tools:**
  - `blog_posts` (R, C, U)
  - `services` (R — for referencing IThealth services in articles)
  - `web_search`
- **Preview pane:** Blog post preview rendered in real-time — title, featured image placeholder, formatted markdown

### 5.3 Default Orchestrators

| Agent | Type | Level | Parent | Description |
|---|---|---|---|---|
| The King | orchestrator | king | — | Top-level orchestrator. Understands the request and routes to the right department. |
| Growth | orchestrator | department | The King | Marketing, content, lead generation. Delegates to Blog Writer. |
| Accounts | orchestrator | department | The King | Billing, invoicing, customer account management. |
| Delivery | orchestrator | department | The King | Service creation, project delivery. Delegates to Service Builder. |

Orchestrator system prompts instruct them to: understand the request, identify the best sub-agent, delegate via `delegate_to_agent` tool, and synthesize results back to the user.

All default agents have `is_default = true` — cannot be deleted, but system prompts and configuration can be customized.

---

## 6. Infrastructure

### 6.1 Local Development — Docker Compose

```yaml
# docker-compose.ai.yml
services:
  ai-service:
    build: ./ai-service
    ports:
      - "8100:8100"
    environment:
      - SUPABASE_URL=http://host.docker.internal:54321
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - ENVIRONMENT=local
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
    volumes:
      - ./ai-service:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8100 --reload
```

**Dev workflow:**
```bash
npx supabase start                          # Supabase (existing)
docker compose -f docker-compose.ai.yml up  # AI service
npm run dev                                  # Next.js (existing)
```

### 6.2 Production — GCP Cloud Run

Two Cloud Run services:

| Service | Image | Port |
|---|---|---|
| `ithealth-web` | Next.js app | 3000 |
| `ithealth-ai` | `ai-service/Dockerfile` | 8080 |

**AI service Dockerfile:**
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8080", "--timeout", "300"]
```

Note: Uses gunicorn with 4 uvicorn workers for production concurrency. `gunicorn` is included in `requirements.txt`.

**Cloud Run config:**
- Memory: 1Gi
- CPU: 1 vCPU
- Min instances: 0 (scale to zero)
- Max instances: 10
- Concurrency: 80
- Request timeout: 300s
- Secrets via Secret Manager: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Service-to-service auth:** Next.js calls AI service via Cloud Run internal URL, authenticated with GCP IAM (service account with `roles/run.invoker`). No public access to the AI service.

### 6.3 Environment Configuration

**Next.js (.env.local):**
```
AI_SERVICE_URL=http://localhost:8100
```

Note: No `NEXT_PUBLIC_` prefix — the AI service URL is server-side only. All browser requests go through Next.js API proxy routes.

**AI service (.env):**
```
GEMINI_API_KEY=<key>
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=<from supabase start>
ENVIRONMENT=local
```

Production env vars set via Cloud Run environment/secrets, never committed.

---

## 7. Security

### 7.1 Auth Flow

```
Browser → Next.js API Route → Python AI Service
              ↓                       ↓
      Validates Supabase JWT    Validates forwarded JWT
      Extracts user profile     Gets user_id + role
```

- Supabase JWT sent from browser to Next.js (existing pattern)
- Next.js proxy routes forward JWT to Python service
- Python middleware validates via `auth.getUser(token)`

### 7.2 Agent Permission Enforcement

- Factory queries `ai_agent_tools` and only instantiates permitted tools
- CRUD operations filtered: read-only agents can't get insert/update/delete tools
- Python service uses Supabase service_role key (bypasses RLS — agents are admin-scoped for now)

### 7.3 Default Agent Protection

- `is_default = true` agents cannot be deleted
- Enforced via DB trigger and API validation
- System prompts customizable, resettable to defaults

### 7.4 API Key Management

- Gemini key: `.env` locally, Secret Manager in production
- Supabase service_role key: same treatment
- Neither exposed to browser client

### 7.5 Table Allowlist

The Python service enforces a hardcoded allowlist of tables that agents can ever access, regardless of `ai_agent_tools` configuration. This is a defense-in-depth measure — even if there's a bug in the factory, agents cannot touch tables outside this list.

**Allowed tables:**
`services`, `phases`, `products`, `verticals`, `personas`, `pains`, `gains`, `skills`,
`service_verticals`, `service_personas`, `service_pains`, `service_gains`, `service_products`, `service_skills`,
`blog_posts`, `courses`, `course_sections`, `course_modules`,
`orders`, `service_requests`, `customer_contracts`,
`companies`, `testimonials`, `partners`

**Never accessible by agents:** `profiles`, `auth.users`, `menu_items`, `role_menu_access`, `ai_agents`, `ai_agent_tools`, `ai_agent_hierarchy`, `ai_conversations`, `ai_messages`, `ai_execution_runs`, `ai_execution_steps`, `meta_integrations` (contains encrypted tokens).

### 7.6 Rate Limiting & Cost Controls

- **Maximum delegation depth:** 4 (King → Department → Manager → Worker). Factory refuses to build a sub-agent if the current depth exceeds this.
- **Maximum tool calls per execution run:** 50. ExecutionTracker counts tool calls and raises a circuit breaker error if exceeded.
- **Maximum tokens per conversation turn:** 32,000 (configurable via environment variable). Enforced in the LangChain agent's `max_tokens` parameter.
- **Delegation cycle prevention:** The `delegate_to_agent` tool validates that the target agent is a direct report in the hierarchy and that the same agent has not already been invoked in the current execution chain. Prevents A → B → A loops.

### 7.7 SSE Error Handling

When errors occur during streaming, the Python service emits:

```
event: error
data: {"code": "RATE_LIMIT", "message": "Gemini API rate limit exceeded. Retry in 30s."}

event: error
data: {"code": "TOOL_FAILED", "message": "Failed to create blog_posts record: ..."}

event: error
data: {"code": "AGENT_TIMEOUT", "message": "Execution exceeded 300s timeout."}
```

On any terminal error, the `ai_execution_runs.status` is set to `failed` and the stream closes. The frontend displays the error message inline in the chat and stops the typing indicator. If the browser tab closes mid-execution, the Python service detects the closed SSE connection and marks the run as `cancelled`.
