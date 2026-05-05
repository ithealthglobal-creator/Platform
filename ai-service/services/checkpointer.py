from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg import AsyncConnection
from config import settings

_checkpointer: AsyncPostgresSaver | None = None
_conn: AsyncConnection | None = None


async def init_checkpointer() -> AsyncPostgresSaver:
    """Create and set up the AsyncPostgresSaver checkpointer.

    Async is required because the chat route uses graph.astream_events, which
    invokes await checkpointer.aget_tuple(...) under the hood. The sync
    PostgresSaver does not implement aget_tuple and raises NotImplementedError.

    Uses prepare_threshold=0 to work with Supabase connection pooler (PgBouncer).
    """
    global _checkpointer, _conn
    _conn = await AsyncConnection.connect(
        settings.supabase_db_url,
        autocommit=True,
        prepare_threshold=0,
    )
    _checkpointer = AsyncPostgresSaver(conn=_conn)
    await _checkpointer.setup()
    return _checkpointer


def get_checkpointer() -> AsyncPostgresSaver:
    """Get the initialized checkpointer instance."""
    if _checkpointer is None:
        raise RuntimeError("Checkpointer not initialized. Call init_checkpointer() first.")
    return _checkpointer
