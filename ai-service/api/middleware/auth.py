from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from services.supabase_client import get_supabase_admin

security = HTTPBearer()


class AuthUser(BaseModel):
    id: str
    role: str
    company_id: str | None
    email: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthUser:
    """
    FastAPI dependency that validates a JWT via Supabase and returns the
    authenticated user with their profile data.

    Raises:
        HTTPException(401): If the token is missing or invalid.
        HTTPException(403): If the user's profile does not exist.
    """
    token = credentials.credentials

    supabase = get_supabase_admin()

    # Validate the JWT by asking Supabase for the user it belongs to.
    try:
        response = supabase.auth.get_user(token)
        auth_user = response.user
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    if auth_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    user_id = auth_user.id
    email = auth_user.email or ""

    # Fetch the profile row to get role and company_id.
    try:
        profile_response = (
            supabase.table("profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )
        profile = profile_response.data
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile not found.",
        )

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile not found.",
        )

    return AuthUser(
        id=user_id,
        role=profile.get("role", ""),
        company_id=profile.get("company_id"),
        email=email,
    )
