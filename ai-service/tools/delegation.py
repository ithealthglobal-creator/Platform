from langchain_core.tools import tool
from services.supabase_client import get_supabase_admin
from config import settings


def create_delegation_tool(current_agent_id: str, current_depth: int, execution_chain: list[str]):
    """Create a delegate_to_agent tool bound to the current agent context.

    Args:
        current_agent_id: UUID of the agent that will use this tool
        current_depth: Current delegation depth in the chain
        execution_chain: List of agent IDs already invoked in this chain (for cycle prevention)
    """

    @tool
    def delegate_to_agent(agent_name: str, task: str) -> str:
        """Delegate a task to a sub-agent in your team. Only direct reports in the hierarchy can be delegated to.

        Args:
            agent_name: The name of the agent to delegate to (must be a direct report)
            task: Description of what the sub-agent should do
        """
        client = get_supabase_admin()

        # 1. Find the target agent by name
        agent_result = (
            client.table("ai_agents")
            .select("id, name, is_active")
            .eq("name", agent_name)
            .eq("is_active", True)
            .execute()
        )
        if not agent_result.data:
            return f"Error: Agent '{agent_name}' not found or is inactive."
        target_agent = agent_result.data[0]
        target_id = target_agent["id"]

        # 2. Validate hierarchy: target must be a direct report of current agent
        hierarchy_result = (
            client.table("ai_agent_hierarchy")
            .select("*")
            .eq("agent_id", target_id)
            .eq("parent_agent_id", current_agent_id)
            .execute()
        )
        if not hierarchy_result.data:
            return (
                f"Error: '{agent_name}' is not a direct report. "
                "You can only delegate to agents directly under you in the hierarchy."
            )

        # 3. Cycle prevention: target must not already be in the execution chain
        if target_id in execution_chain:
            return (
                f"Error: '{agent_name}' has already been invoked in this execution chain. "
                "Cannot create delegation cycle."
            )

        # 4. Depth check
        if current_depth >= settings.max_delegation_depth:
            return (
                f"Error: Maximum delegation depth ({settings.max_delegation_depth}) reached. "
                "Handle this task yourself or ask the user for help."
            )

        # 5. Build and invoke the sub-agent
        # Import here to avoid circular imports (factory imports registry which may import delegation)
        from agents.factory import build_agent_graph
        from tools.registry import build_tools_for_agent

        # Load sub-agent config
        sub_config_result = (
            client.table("ai_agents").select("*").eq("id", target_id).single().execute()
        )
        sub_config = sub_config_result.data

        # Build sub-agent tools (with updated delegation context)
        sub_tools = build_tools_for_agent(target_id)

        # Add delegation tool for the sub-agent too (if it's an orchestrator)
        if sub_config["agent_type"] == "orchestrator":
            sub_delegation = create_delegation_tool(
                current_agent_id=target_id,
                current_depth=current_depth + 1,
                execution_chain=execution_chain + [target_id],
            )
            sub_tools.append(sub_delegation)

        # Build and invoke graph (no checkpointer for sub-agents — single invocation)
        graph = build_agent_graph(sub_config, sub_tools, checkpointer=None)
        result = graph.invoke(
            {
                "messages": [{"role": "user", "content": task}],
                "agent_id": target_id,
                "delegation_depth": current_depth + 1,
            },
            config={"recursion_limit": settings.recursion_limit},
        )

        # Return the sub-agent's final message
        final_message = result["messages"][-1]
        return f"[Response from {agent_name}]: {final_message.content}"

    return delegate_to_agent
