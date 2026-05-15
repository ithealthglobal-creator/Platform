"""Dedicated tools for the Agent Builder meta-agent.

These tools mutate `ai_agents` and `ai_agent_tools`, which the generic
`supabase_crud` factory blocks for safety. Granting access here is a
deliberate, narrow exception — see migration
`20260515000001_agent_builder_agent.sql`. Do not point a different agent at
this tool_type without a fresh migration and a review of the safety story.
"""

from langchain_core.tools import tool

from services.supabase_client import get_supabase_admin


def _read_tool():
    @tool
    def agent_read(id: str | None = None) -> str:
        """Read AI agents and their tool grants. Pass `id` to fetch a single agent (with its tools); omit `id` to list all agents (without tool details). Returns JSON-like string."""
        client = get_supabase_admin()
        if id:
            agent = client.table("ai_agents").select("*").eq("id", id).maybe_single().execute()
            if not agent.data:
                return f"No agent with id={id}"
            tools = (
                client.table("ai_agent_tools")
                .select("tool_type,tool_name,operations,is_active")
                .eq("agent_id", id)
                .execute()
            )
            return str({"agent": agent.data, "tools": tools.data})
        rows = (
            client.table("ai_agents")
            .select("id,name,description,agent_type,model,is_default,is_active")
            .order("created_at")
            .execute()
        )
        return str(rows.data)

    return agent_read


def _create_tool():
    @tool
    def agent_create(
        name: str,
        description: str | None = None,
        agent_type: str = "specialist",
        system_prompt: str | None = None,
        model: str = "gemini-2.5-flash",
        temperature: float = 0.7,
        icon: str | None = None,
    ) -> str:
        """Create a new AI agent. `agent_type` must be 'specialist' or 'orchestrator'. `model` should be 'gemini-2.5-flash' or 'gemini-2.5-pro'. `icon` is a Carbon icon name (e.g. 'Edit'). Returns the created row including its id."""
        if agent_type not in ("specialist", "orchestrator"):
            return f"Error: agent_type must be 'specialist' or 'orchestrator', got '{agent_type}'"
        if temperature < 0 or temperature > 1:
            return f"Error: temperature must be between 0 and 1, got {temperature}"

        client = get_supabase_admin()
        payload = {
            "name": name.strip(),
            "description": (description or "").strip() or None,
            "agent_type": agent_type,
            "system_prompt": (system_prompt or "").strip() or None,
            "model": model,
            "temperature": temperature,
            "icon": (icon or "").strip() or None,
            "is_default": False,
            "is_active": True,
        }
        result = client.table("ai_agents").insert(payload).execute()
        return str(result.data)

    return agent_create


_UPDATABLE_FIELDS = {
    "name",
    "description",
    "agent_type",
    "system_prompt",
    "model",
    "temperature",
    "icon",
    "is_active",
}


def _update_tool():
    @tool
    def agent_update(id: str, fields: dict) -> str:
        """Update fields on an existing agent by id. `fields` is a dict of column:value pairs. Allowed columns: name, description, agent_type, system_prompt, model, temperature, icon, is_active. Default agents cannot be renamed (the `name` field is silently dropped)."""
        client = get_supabase_admin()

        existing = client.table("ai_agents").select("id,is_default").eq("id", id).maybe_single().execute()
        if not existing.data:
            return f"Error: no agent with id={id}"
        is_default = bool(existing.data.get("is_default"))

        payload: dict = {}
        for key, value in (fields or {}).items():
            if key not in _UPDATABLE_FIELDS:
                continue
            if key == "name" and is_default:
                continue
            payload[key] = value

        if not payload:
            return "Error: no updatable fields provided"

        if "agent_type" in payload and payload["agent_type"] not in ("specialist", "orchestrator"):
            return f"Error: agent_type must be 'specialist' or 'orchestrator'"
        if "temperature" in payload:
            try:
                t = float(payload["temperature"])
            except (TypeError, ValueError):
                return "Error: temperature must be a number"
            if t < 0 or t > 1:
                return f"Error: temperature must be between 0 and 1, got {t}"
            payload["temperature"] = t

        result = client.table("ai_agents").update(payload).eq("id", id).execute()
        return str(result.data)

    return agent_update


def _delete_tool():
    @tool
    def agent_delete(id: str) -> str:
        """Delete a non-default agent by id. Default agents (is_default=true) are protected and cannot be deleted."""
        client = get_supabase_admin()
        existing = client.table("ai_agents").select("id,name,is_default").eq("id", id).maybe_single().execute()
        if not existing.data:
            return f"Error: no agent with id={id}"
        if existing.data.get("is_default"):
            return f"Error: agent '{existing.data.get('name')}' is a default agent and cannot be deleted."

        result = client.table("ai_agents").delete().eq("id", id).execute()
        return str(result.data)

    return agent_delete


def _set_tools_tool():
    @tool
    def agent_set_tools(agent_id: str, tools: list[dict]) -> str:
        """Replace ALL tool grants for an agent (delete-then-insert). Each item in `tools` must be a dict like {"tool_type": "supabase_crud", "tool_name": "services", "operations": ["read","update"], "is_active": true}. `operations` may be null for tool types that don't need it (web_search, knowledge, dashboard). Granting `agent_admin` to any other agent is rejected."""
        client = get_supabase_admin()
        existing = client.table("ai_agents").select("id").eq("id", agent_id).maybe_single().execute()
        if not existing.data:
            return f"Error: no agent with id={agent_id}"

        for t in tools or []:
            if t.get("tool_type") == "agent_admin":
                return "Error: agent_admin tools cannot be granted via agent_set_tools — they require an explicit migration."

        client.table("ai_agent_tools").delete().eq("agent_id", agent_id).execute()

        if tools:
            rows = []
            for t in tools:
                rows.append(
                    {
                        "agent_id": agent_id,
                        "tool_type": t.get("tool_type"),
                        "tool_name": t.get("tool_name"),
                        "operations": t.get("operations"),
                        "is_active": t.get("is_active", True),
                    }
                )
            client.table("ai_agent_tools").insert(rows).execute()

        return f"Replaced tools for agent {agent_id}: {len(tools or [])} grant(s) active."

    return agent_set_tools


_TOOL_FACTORIES = {
    "agent_read": _read_tool,
    "agent_create": _create_tool,
    "agent_update": _update_tool,
    "agent_delete": _delete_tool,
    "agent_set_tools": _set_tools_tool,
}


def generate_agent_admin_tool(tool_name: str):
    """Return the single LangChain tool matching `tool_name`, or None if unknown."""
    factory = _TOOL_FACTORIES.get(tool_name)
    return factory() if factory else None
