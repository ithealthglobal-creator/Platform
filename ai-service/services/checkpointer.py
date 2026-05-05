from langgraph.checkpoint.postgres import PostgresSaver
from psycopg import Connection
from config import settings

_checkpointer: PostgresSaver | None = None
_conn: Connection | None = None

def init_checkpointer() -> PostgresSaver:
    """Create and set up the PostgresSaver checkpointer.

    Uses prepare_threshold=0 to work with Supabase connection pooler (PgBouncer).
    """
    global _checkpointer, _conn
    _conn = Connection.connect(
        settings.supabase_db_url,
        autocommit=True,
        prepare_threshold=0,
    )
    _checkpointer = PostgresSaver(conn=_conn)
    _checkpointer.setup()
    return _checkpointer

def get_checkpointer() -> PostgresSaver:
    """Get the initialized checkpointer instance."""
    if _checkpointer is None:
        raise RuntimeError("Checkpointer not initialized. Call init_checkpointer() first.")
    return _checkpointer
