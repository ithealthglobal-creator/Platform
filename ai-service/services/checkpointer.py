"""PostgresSaver checkpointer — stub, implemented in Task 7."""

_checkpointer = None

def get_checkpointer():
    global _checkpointer
    if _checkpointer is None:
        # Stub: returns a mock-like object with setup() method
        class _Stub:
            def setup(self):
                pass
        _checkpointer = _Stub()
    return _checkpointer
