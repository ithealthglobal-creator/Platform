from services.supabase_client import get_supabase_admin
from tools.supabase_crud import generate_crud_tools, ALLOWED_TABLES
from tools.web_search import web_search
from tools.knowledge import build_knowledge_tools
from tools.dashboard import build_dashboard_tools
from tools.agent_admin import generate_agent_admin_tool


def build_tools_for_agent(
    agent_id: str,
    company_id: str | None = None,
    document_id: str | None = None,
) -> list:
    """Build the list of LangChain tools for a given agent based on their ai_agent_tools config.

    company_id and document_id scope the new 'knowledge' tools; they are ignored
    for legacy tool types.
    """
    client = get_supabase_admin()
    result = client.table("ai_agent_tools").select("*").eq("agent_id", agent_id).eq("is_active", True).execute()

    tools = []
    knowledge_tool_names: list[str] = []
    dashboard_tool_names: list[str] = []
    for row in result.data:
        if row["tool_type"] == "supabase_crud":
            table_name = row["tool_name"]
            operations = row["operations"] or []
            if table_name in ALLOWED_TABLES:
                tools.extend(generate_crud_tools(table_name, operations))
        elif row["tool_type"] == "web_search":
            tools.append(web_search)
        elif row["tool_type"] == "knowledge":
            knowledge_tool_names.append(row["tool_name"])
        elif row["tool_type"] == "dashboard":
            dashboard_tool_names.append(row["tool_name"])
        elif row["tool_type"] == "agent_admin":
            t = generate_agent_admin_tool(row["tool_name"])
            if t is not None:
                tools.append(t)

    if knowledge_tool_names and company_id:
        tools.extend(
            build_knowledge_tools(company_id, knowledge_tool_names, document_id=document_id)
        )

    if dashboard_tool_names and company_id:
        tools.extend(build_dashboard_tools(company_id, dashboard_tool_names))

    return tools
