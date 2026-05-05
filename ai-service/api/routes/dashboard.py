"""Dashboard query endpoint — executes structured QuerySpecs from saved dashboards.

Used when a user opens a saved dashboard: each chart's QuerySpec gets POSTed here
so the canvas can render real data without involving the agent.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.middleware.auth import get_current_user, AuthUser
from tools.dashboard import _validate_query_spec, _execute_query

router = APIRouter()


class QueryRequest(BaseModel):
    spec: dict


@router.post("/query")
async def run_query(request: QueryRequest, user: AuthUser = Depends(get_current_user)):
    ok, err, normalized = _validate_query_spec(request.spec, user.company_id or "")
    if not ok:
        raise HTTPException(status_code=400, detail=err)
    try:
        rows = _execute_query(normalized)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"query failed: {str(e)[:200]}")
    return {"rows": rows, "row_count": len(rows)}
