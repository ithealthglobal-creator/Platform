from langchain_core.messages import ToolMessage
from langgraph.types import interrupt
from agents.state import AgentState


def call_model(state: AgentState, model):
    """Invoke the LLM with the current message history."""
    response = model.invoke(state["messages"])
    return {"messages": [response]}


def route_after_model(state: AgentState):
    """Route based on whether the model made tool calls."""
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        # Check if any tool call is destructive → route to approval
        destructive = any(
            tc["name"].endswith(("_create", "_update", "_delete"))
            for tc in last.tool_calls
        )
        return "approve" if destructive else "tools"
    return "__end__"


def approve_action(state: AgentState):
    """HITL node: interrupt for user approval on destructive operations."""
    last = state["messages"][-1]
    decision = interrupt({
        "tool_calls": [
            {"name": tc["name"], "args": tc["args"], "id": tc["id"]}
            for tc in last.tool_calls
        ],
        "message": "Approve these changes?",
    })
    if decision.get("approved"):
        return {}  # Proceed to tools node
    # Rejected — add rejection messages
    rejections = [
        ToolMessage(content="Rejected by user.", tool_call_id=tc["id"])
        for tc in last.tool_calls
    ]
    return {"messages": rejections}


def route_after_approval(state: AgentState):
    """Route based on whether user approved or rejected."""
    last = state["messages"][-1]
    if isinstance(last, ToolMessage) and "Rejected" in last.content:
        return "model"  # Let LLM respond to rejection
    return "tools"
