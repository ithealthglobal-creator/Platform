from langgraph.checkpoint.postgres import PostgresSaver
from config import settings

_checkpointer: PostgresSaver | None = None

def init_checkpointer() -> PostgresSaver:
    """Create and set up the PostgresSaver checkpointer."""
    global _checkpointer
    cm = PostgresSaver.from_conn_string(settings.supabase_db_url)
    _checkpointer = cm.__enter__()
    _checkpointer.setup()
    return _checkpointer

def get_checkpointer() -> PostgresSaver:
    """Get the initialized checkpointer instance."""
    if _checkpointer is None:
        raise RuntimeError("Checkpointer not initialized. Call init_checkpointer() first.")
    return _checkpointer
