import uuid
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from api.middleware.auth import get_current_user, AuthUser
from services.supabase_client import get_supabase_admin
from services.checkpointer import get_checkpointer
from services.streaming import stream_graph_events
from agents.factory import build_agent_graph
from agents.callbacks.execution_tracker import ExecutionTracker
from tools.registry import build_tools_for_agent
from tools.delegation import create_delegation_tool
from config import settings
from langgraph.types import Command

router = APIRouter()


class ChatRequest(BaseModel):
    conversation_id: str | None = None
    message: str
    agent_id: str | None = None
    document_id: str | None = None


class ResumeRequest(BaseModel):
    conversation_id: str
    resume_value: dict


@router.post("")
async def chat(request: ChatRequest, user: AuthUser = Depends(get_current_user)):
    """Send a message and stream the response via SSE."""
    client = get_supabase_admin()

    # 1. Create or load conversation
    if request.conversation_id:
        conversation_id = request.conversation_id
        # Resolve the document scope from the existing conversation if any.
        existing = (
            client.table("ai_conversations")
            .select("document_id")
            .eq("id", conversation_id)
            .single()
            .execute()
        )
        document_id = (existing.data or {}).get("document_id") or request.document_id
    else:
        # Create new conversation
        conv_data: dict = {
            "user_id": user.id,
            "agent_id": request.agent_id,
        }
        if request.document_id:
            conv_data["document_id"] = request.document_id
        result = client.table("ai_conversations").insert(conv_data).execute()
        conversation_id = result.data[0]["id"]
        document_id = request.document_id

    # 2. Determine which agent to use
    agent_id = request.agent_id
    if not agent_id:
        # Load from conversation
        conv = client.table("ai_conversations").select("agent_id").eq("id", conversation_id).single().execute()
        agent_id = conv.data["agent_id"]

    # 3. Load agent config
    agent_config = client.table("ai_agents").select("*").eq("id", agent_id).single().execute()
    agent = agent_config.data

    # 4. Build tools
    tools = build_tools_for_agent(
        agent_id,
        company_id=user.company_id,
        document_id=document_id,
    )

    # Add delegation tool for orchestrators
    if agent["agent_type"] == "orchestrator":
        delegation_tool = create_delegation_tool(
            current_agent_id=agent_id,
            current_depth=0,
            execution_chain=[agent_id],
        )
        tools.append(delegation_tool)

    # 5. Build graph
    checkpointer = get_checkpointer()
    graph = build_agent_graph(agent, tools, checkpointer=checkpointer)

    # 6. Save user message to ai_messages
    user_msg_id = str(uuid.uuid4())
    client.table("ai_messages").insert({
        "id": user_msg_id,
        "conversation_id": conversation_id,
        "role": "user",
        "content": request.message,
    }).execute()

    # 7. Create execution run
    run_id = str(uuid.uuid4())
    tracker = ExecutionTracker(run_id=run_id, conversation_id=conversation_id, agent_id=agent_id)
    tracker.start_run(trigger_message_id=user_msg_id)

    # 8. Stream response
    input_state = {
        "messages": [{"role": "user", "content": request.message}],
        "agent_id": agent_id,
        "delegation_depth": 0,
    }
    config = {
        "configurable": {"thread_id": conversation_id},
        "callbacks": [tracker],
        "recursion_limit": settings.recursion_limit,
    }

    async def generate():
        try:
            async for event in stream_graph_events(graph, input_state, config):
                yield event
            tracker.complete_run(status="completed")
        except Exception as e:
            tracker.complete_run(status="failed")
            raise

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Conversation-Id": conversation_id,
            "X-Run-Id": run_id,
        },
    )


@router.post("/resume")
async def resume(request: ResumeRequest, user: AuthUser = Depends(get_current_user)):
    """Resume a paused execution (HITL approval)."""
    client = get_supabase_admin()

    # Load conversation and agent
    conv = client.table("ai_conversations").select("agent_id, document_id").eq("id", request.conversation_id).single().execute()
    agent_id = conv.data["agent_id"]

    agent_config = client.table("ai_agents").select("*").eq("id", agent_id).single().execute()
    agent = agent_config.data

    # Rebuild graph with same tools (resume preserves document scope from the conversation row)
    document_id = (conv.data or {}).get("document_id") if hasattr(conv, "data") else None
    tools = build_tools_for_agent(
        agent_id,
        company_id=user.company_id,
        document_id=document_id,
    )
    if agent["agent_type"] == "orchestrator":
        tools.append(create_delegation_tool(agent_id, 0, [agent_id]))

    checkpointer = get_checkpointer()
    graph = build_agent_graph(agent, tools, checkpointer=checkpointer)

    # Resume with Command
    input_state = Command(resume=request.resume_value)
    config = {
        "configurable": {"thread_id": request.conversation_id},
        "recursion_limit": settings.recursion_limit,
    }

    async def generate():
        async for event in stream_graph_events(graph, input_state, config):
            yield event

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
