from langchain_core.tools import tool
from services.supabase_client import get_supabase_admin

# Hardcoded allowlist — agents can NEVER access tables outside this list (spec Section 7.5)
ALLOWED_TABLES = {
    "services", "phases", "products", "verticals", "personas", "pains", "gains", "skills",
    "service_verticals", "service_personas", "service_pains", "service_gains",
    "service_products", "service_skills",
    "blog_posts", "courses", "course_sections", "course_modules",
    "orders", "service_requests", "customer_contracts",
    "companies", "testimonials", "partners",
}

# Tables that agents can NEVER access
BLOCKED_TABLES = {
    "profiles", "menu_items", "role_menu_access",
    "ai_agents", "ai_agent_tools", "ai_agent_hierarchy",
    "ai_conversations", "ai_messages", "ai_execution_runs", "ai_execution_steps",
    "meta_integrations",
}


def generate_crud_tools(table_name: str, operations: list[str]) -> list:
    """Generate LangChain @tool functions for a given table and allowed operations.

    Returns a list of tool functions, one per operation.
    Uses upsert semantics for create/update (idempotency for interrupt-resume).
    """
    if table_name not in ALLOWED_TABLES:
        raise ValueError(f"Table '{table_name}' is not in the allowlist")

    tools = []

    if "read" in operations:
        def _make_read_tool(tname: str):
            @tool
            def read_tool(query: str = "", limit: int = 50) -> str:
                f"""Read rows from the {tname} table. Use query to filter by column values (e.g. 'name=eq.Endpoint Security'). Returns up to {limit} rows as JSON."""
                client = get_supabase_admin()
                q = client.table(tname).select("*").limit(limit)
                if query:
                    # Parse simple filters like "name=eq.value"
                    for part in query.split(","):
                        if "=" in part:
                            col, op_val = part.split("=", 1)
                            if op_val.startswith("eq."):
                                q = q.eq(col.strip(), op_val[3:])
                            elif op_val.startswith("ilike."):
                                q = q.ilike(col.strip(), op_val[6:])
                result = q.execute()
                return str(result.data)

            read_tool.name = f"{tname}_read"
            read_tool.description = f"Read rows from the {tname} table. Use query param to filter (e.g. 'name=eq.value'). Returns JSON array."
            return read_tool

        tools.append(_make_read_tool(table_name))

    if "create" in operations:
        def _make_create_tool(tname: str):
            @tool
            def create_tool(data: dict) -> str:
                f"""Create a new row in the {tname} table. Pass a dict of column:value pairs."""
                client = get_supabase_admin()
                result = client.table(tname).upsert(data).execute()
                return str(result.data)

            create_tool.name = f"{tname}_create"
            create_tool.description = f"Create a new row in {tname}. Pass column:value dict. Uses upsert for idempotency."
            return create_tool

        tools.append(_make_create_tool(table_name))

    if "update" in operations:
        def _make_update_tool(tname: str):
            @tool
            def update_tool(id: str, data: dict) -> str:
                f"""Update a row in {tname} by its UUID id."""
                client = get_supabase_admin()
                result = client.table(tname).update(data).eq("id", id).execute()
                return str(result.data)

            update_tool.name = f"{tname}_update"
            update_tool.description = f"Update an existing row in {tname} by id. Pass the row UUID and a dict of fields to update."
            return update_tool

        tools.append(_make_update_tool(table_name))

    if "delete" in operations:
        def _make_delete_tool(tname: str):
            @tool
            def delete_tool(id: str) -> str:
                f"""Delete a row from {tname} by its UUID id."""
                client = get_supabase_admin()
                result = client.table(tname).delete().eq("id", id).execute()
                return str(result.data)

            delete_tool.name = f"{tname}_delete"
            delete_tool.description = f"Delete a row from {tname} by id."
            return delete_tool

        tools.append(_make_delete_tool(table_name))

    return tools
