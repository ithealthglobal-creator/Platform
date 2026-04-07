from functools import partial
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langgraph.types import RetryPolicy
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage
from agents.state import AgentState
from agents.nodes import call_model, route_after_model, approve_action, route_after_approval
from config import settings


def build_agent_graph(agent_config: dict, tools: list, checkpointer=None):
    """Build a compiled LangGraph StateGraph for an agent.

    Args:
        agent_config: Dict with keys: model, temperature, system_prompt, name, agent_type
        tools: List of LangChain tool instances this agent can use
        checkpointer: PostgresSaver instance (None for sub-agents)

    Returns:
        Compiled LangGraph graph ready for .invoke() or .stream()
    """
    # Build the LLM with tools bound
    model = ChatGoogleGenerativeAI(
        model=agent_config.get("model", "gemini-2.5-flash"),
        temperature=agent_config.get("temperature", 0.7),
        max_tokens=settings.max_tokens_per_turn,
    )

    if tools:
        model = model.bind_tools(tools)

    # Wrap call_model to inject the system prompt and model
    system_prompt = agent_config.get("system_prompt", "You are a helpful AI assistant.")

    def _call_model(state: AgentState):
        messages = [SystemMessage(content=system_prompt)] + state["messages"]
        response = model.invoke(messages)
        return {"messages": [response]}

    # Build the graph
    tool_node = ToolNode(tools, handle_tool_errors=True) if tools else None

    builder = StateGraph(AgentState)
    builder.add_node("model", _call_model, retry=RetryPolicy(max_attempts=3))

    if tools:
        builder.add_node("tools", tool_node)
        builder.add_node("approve", approve_action)

        builder.add_edge(START, "model")
        builder.add_conditional_edges("model", route_after_model, ["tools", "approve", "__end__"])
        builder.add_conditional_edges("approve", route_after_approval, ["tools", "model"])
        builder.add_edge("tools", "model")
    else:
        # No tools — simple model-only graph
        builder.add_edge(START, "model")
        builder.add_edge("model", END)

    return builder.compile(checkpointer=checkpointer)
