from services.supabase_client import get_supabase_admin
from tools.supabase_crud import generate_crud_tools, ALLOWED_TABLES
from tools.web_search import web_search


def build_tools_for_agent(agent_id: str) -> list:
    """Build the list of LangChain tools for a given agent based on their ai_agent_tools config."""
    client = get_supabase_admin()
    result = client.table("ai_agent_tools").select("*").eq("agent_id", agent_id).eq("is_active", True).execute()

    tools = []
    for row in result.data:
        if row["tool_type"] == "supabase_crud":
            table_name = row["tool_name"]
            operations = row["operations"] or []
            if table_name in ALLOWED_TABLES:
                tools.extend(generate_crud_tools(table_name, operations))
        elif row["tool_type"] == "web_search":
            tools.append(web_search)

    return tools
