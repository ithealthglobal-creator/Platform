from langgraph.checkpoint.postgres import PostgresSaver
from config import settings

_checkpointer = None

def get_checkpointer() -> PostgresSaver:
    """Get or create the PostgresSaver checkpointer instance.

    Connects to Supabase Postgres via the direct connection string.
    Call .setup() once on startup to create checkpoint tables.
    """
    global _checkpointer
    if _checkpointer is None:
        _checkpointer = PostgresSaver.from_conn_string(settings.supabase_db_url)
    return _checkpointer
