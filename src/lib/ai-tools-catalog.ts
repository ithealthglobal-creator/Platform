export interface AiToolCatalogEntry {
  slug: string
  toolType: string
  name: string
  summary: string
  description: string
  capabilities: string[]
  configuredVia: string
}

export const AI_TOOLS_CATALOG: AiToolCatalogEntry[] = [
  {
    slug: 'supabase-crud',
    toolType: 'supabase_crud',
    name: 'Supabase CRUD',
    summary: 'Read & write rows in allow-listed tables.',
    description:
      'Generates LangChain tools that let an agent read, create, update, and delete rows in specific Supabase tables. Each table + operation must be explicitly granted per agent — agents only see the tools they have been authorised for.',
    capabilities: [
      'Per-table grants across 24 allow-listed tables (services, products, companies, orders, etc.)',
      'Per-operation grants (read, create, update, delete) — granted independently',
      'Runs against the service_role Supabase client, so RLS is bypassed; auth is enforced by the grant config',
      'Tools are generated dynamically at agent build time from ai_agent_tools rows',
    ],
    configuredVia: 'AI → Agents → edit an agent → Tool Permissions',
  },
  {
    slug: 'web-search',
    toolType: 'web_search',
    name: 'Web Search',
    summary: 'Search the live web for current information.',
    description:
      'A single LangChain tool backed by a web search provider. Useful when an agent needs information that is not stored in our database — pricing, news, public company facts, recent events.',
    capabilities: [
      'Single boolean grant — either the agent has web search or it does not',
      'Returns ranked snippets and source URLs the agent can cite',
      'Best paired with a system prompt that tells the agent to prefer internal data first',
    ],
    configuredVia: 'AI → Agents → edit an agent → Tool Permissions → LangChain Tools',
  },
  {
    slug: 'langchain',
    toolType: 'langchain',
    name: 'LangChain Community Tools',
    summary: 'Reserved bucket for additional LangChain tools.',
    description:
      'A general-purpose tool_type for plugging in additional LangChain community tools beyond web search (e.g. calculators, file utilities, third-party APIs). The registry currently maps only web_search; new entries are added by extending the tool registry on the AI service.',
    capabilities: [
      'Tool_type slot reserved in the ai_agent_tools schema',
      'Add new tools by registering them in ai-service/tools/registry.py',
      'Same per-agent grant model as the other tool types',
    ],
    configuredVia: 'Backend: ai-service/tools/registry.py + ai_agent_tools row',
  },
  {
    slug: 'knowledge',
    toolType: 'knowledge',
    name: 'Knowledge Retrieval',
    summary: 'RAG search over the company knowledge base.',
    description:
      'Tools that retrieve passages from the company-scoped knowledge base (uploaded documents, articles, notes). Built per agent based on the named knowledge tools granted to it, scoped to the active company and optionally to a single document.',
    capabilities: [
      'Company-scoped retrieval — agents only see their company\'s knowledge',
      'Optional document_id scope to narrow retrieval to a single source',
      'Multiple named knowledge tools per agent (each pointing at a different corpus / strategy)',
      'Backed by the knowledge_documents tables and the search RPCs',
    ],
    configuredVia: 'AI → Agents → edit an agent → Tool Permissions (knowledge entries)',
  },
  {
    slug: 'dashboard',
    toolType: 'dashboard',
    name: 'Dashboard Metrics',
    summary: 'Query saved dashboard metrics for the company.',
    description:
      'Tools that let an agent query the metrics powering saved dashboards — revenue, orders, service requests and similar aggregates — scoped to the active company. Useful for analyst-style agents that answer "how is X trending?" questions.',
    capabilities: [
      'Company-scoped — never leaks metrics across tenants',
      'Multiple named dashboard tools per agent (each maps to a metric set on the allow-list)',
      'Allow-list lives in ai-service/tools/dashboard_allowlist.py',
    ],
    configuredVia: 'AI → Agents → edit an agent → Tool Permissions (dashboard entries)',
  },
]

export function getToolBySlug(slug: string): AiToolCatalogEntry | undefined {
  return AI_TOOLS_CATALOG.find((t) => t.slug === slug)
}
