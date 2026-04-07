import uuid
import time
from langchain_core.callbacks import BaseCallbackHandler
from services.supabase_client import get_supabase_admin
from config import settings


class ExecutionTracker(BaseCallbackHandler):
    """Tracks LangGraph execution by writing steps to Supabase.

    Registered as a callback on graph invocation. Writes ai_execution_runs
    and ai_execution_steps rows in real-time.
    """

    def __init__(self, run_id: str, conversation_id: str, agent_id: str):
        super().__init__()
        self.run_id = run_id
        self.conversation_id = conversation_id
        self.agent_id = agent_id
        self.tool_call_count = 0
        self._client = get_supabase_admin()
        self._step_start_times: dict[str, float] = {}

    def start_run(self, trigger_message_id: str | None = None):
        """Create the execution run record."""
        self._client.table("ai_execution_runs").upsert({
            "id": self.run_id,
            "conversation_id": self.conversation_id,
            "trigger_message_id": trigger_message_id,
            "status": "running",
        }).execute()

    def complete_run(self, status: str = "completed"):
        """Mark the execution run as complete."""
        self._client.table("ai_execution_runs").update({
            "status": status,
            "completed_at": "now()",
        }).eq("id", self.run_id).execute()

    def _write_step(self, step_id: str, step_type: str, agent_id: str | None = None,
                    tool_name: str | None = None, input_data: dict | None = None,
                    output_data: dict | None = None, status: str = "running",
                    parent_step_id: str | None = None):
        """Write or update an execution step (upsert for idempotency)."""
        duration_ms = None
        if step_id in self._step_start_times and status in ("completed", "failed"):
            duration_ms = int((time.time() - self._step_start_times[step_id]) * 1000)

        data = {
            "id": step_id,
            "run_id": self.run_id,
            "agent_id": agent_id or self.agent_id,
            "step_type": step_type,
            "status": status,
        }
        if tool_name is not None:
            data["tool_name"] = tool_name
        if input_data is not None:
            data["input"] = input_data
        if output_data is not None:
            data["output"] = output_data
        if duration_ms is not None:
            data["duration_ms"] = duration_ms
        if parent_step_id is not None:
            data["parent_step_id"] = parent_step_id

        self._client.table("ai_execution_steps").upsert(data).execute()

    def on_tool_start(self, serialized, input_str, *, run_id, **kwargs):
        """Called when a tool starts executing."""
        self.tool_call_count += 1
        if self.tool_call_count > settings.max_tool_calls_per_run:
            self.complete_run(status="failed")
            raise RuntimeError(
                f"Circuit breaker: exceeded {settings.max_tool_calls_per_run} tool calls in a single run"
            )

        step_id = str(run_id)
        self._step_start_times[step_id] = time.time()
        tool_name = serialized.get("name", "unknown")
        self._write_step(
            step_id=step_id,
            step_type="tool_call",
            tool_name=tool_name,
            input_data={"input": str(input_str)[:1000]},
            status="running",
        )

    def on_tool_end(self, output, *, run_id, **kwargs):
        """Called when a tool finishes."""
        step_id = str(run_id)
        self._write_step(
            step_id=step_id,
            step_type="tool_call",
            output_data={"output": str(output)[:2000]},
            status="completed",
        )

    def on_tool_error(self, error, *, run_id, **kwargs):
        """Called when a tool errors."""
        step_id = str(run_id)
        self._write_step(
            step_id=step_id,
            step_type="tool_call",
            output_data={"error": str(error)[:1000]},
            status="failed",
        )
