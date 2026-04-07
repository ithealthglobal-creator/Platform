from fastapi import APIRouter, Depends, Query
from api.middleware.auth import get_current_user, AuthUser
from services.supabase_client import get_supabase_admin

router = APIRouter()


@router.get("")
async def list_executions(
    user: AuthUser = Depends(get_current_user),
    conversation_id: str | None = Query(None),
    status: str | None = Query(None),
):
    """List execution runs for the authenticated user.

    Scoped through conversation ownership — only returns runs
    for conversations the user owns.
    """
    client = get_supabase_admin()

    # Get user's conversation IDs
    convs = client.table("ai_conversations").select("id").eq("user_id", user.id).execute()
    conv_ids = [c["id"] for c in convs.data]

    if not conv_ids:
        return {"data": []}

    query = client.table("ai_execution_runs").select(
        "*, ai_conversations(title, agent_id)"
    ).in_("conversation_id", conv_ids).order("started_at", desc=True)

    if conversation_id:
        query = query.eq("conversation_id", conversation_id)
    if status:
        query = query.eq("status", status)

    result = query.limit(50).execute()
    return {"data": result.data}


@router.get("/{run_id}/steps")
async def get_execution_steps(
    run_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """Get all steps for an execution run, ordered by created_at.

    Validates that the user owns the conversation associated with this run.
    """
    client = get_supabase_admin()

    # Verify ownership: run → conversation → user
    run = client.table("ai_execution_runs").select(
        "conversation_id"
    ).eq("id", run_id).single().execute()

    if not run.data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Execution run not found")

    conv = client.table("ai_conversations").select("user_id").eq(
        "id", run.data["conversation_id"]
    ).single().execute()

    if not conv.data or conv.data["user_id"] != user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")

    # Get steps
    steps = client.table("ai_execution_steps").select(
        "*, ai_agents(name, icon)"
    ).eq("run_id", run_id).order("created_at").execute()

    return {"data": steps.data}
