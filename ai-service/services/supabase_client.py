from supabase import create_client
from config import settings


def get_supabase_admin():
    """Returns a Supabase client using the service_role key (bypasses RLS)."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
