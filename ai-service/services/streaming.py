import json
import logging
import traceback
from collections.abc import AsyncGenerator

logger = logging.getLogger(__name__)


async def stream_graph_events(graph, input_state: dict, config: dict) -> AsyncGenerator[str, None]:
    """Stream LangGraph execution as SSE events.

    Translates graph.stream() output into SSE format matching spec Section 3.4:
    - token: streaming text content
    - tool_start/tool_end: tool call events
    - delegation: agent delegation events
    - interrupt: HITL approval required
    - done: execution complete
    - error: error occurred
    """
    try:
        async for event in graph.astream_events(input_state, config=config, version="v2"):
            kind = event["event"]

            if kind == "on_chat_model_stream":
                # Streaming tokens from the LLM. chunk.content can be a plain
                # string OR a list of content blocks (Gemini multimodal / tool-
                # use responses). Always emit a string to the client.
                text = _extract_text(event["data"]["chunk"].content)
                if text:
                    yield f"event: token\ndata: {json.dumps({'content': text})}\n\n"

            elif kind == "on_tool_start":
                tool_name = event.get("name", "unknown")
                tool_input = event["data"].get("input", {})
                yield f"event: tool_start\ndata: {json.dumps({'tool': tool_name, 'input': _safe_serialize(tool_input)})}\n\n"

            elif kind == "on_tool_end":
                tool_name = event.get("name", "unknown")
                tool_output = event["data"].get("output", "")
                yield f"event: tool_end\ndata: {json.dumps({'tool': tool_name, 'output': _safe_serialize(tool_output)})}\n\n"

            elif kind == "on_custom_event":
                # Custom events for delegation
                event_name = event.get("name", "")
                if event_name == "delegation":
                    yield f"event: delegation\ndata: {json.dumps(event['data'])}\n\n"

        yield f"event: done\ndata: {json.dumps({'status': 'completed'})}\n\n"

    except Exception as e:
        if "interrupt" in str(type(e).__name__).lower() or "GraphInterrupt" in str(type(e)):
            # HITL interrupt — extract interrupt value and send to client
            # The interrupt value is the payload passed to interrupt()
            yield f"event: interrupt\ndata: {json.dumps({'type': 'approval_required'})}\n\n"
        else:
            logger.exception("stream_graph_events failed: %s", e)
            print(f"[stream_graph_events] {type(e).__name__}: {e}\n{traceback.format_exc()}", flush=True)
            yield f"event: error\ndata: {json.dumps({'code': 'EXECUTION_ERROR', 'message': str(e)[:500]})}\n\n"


def _extract_text(content) -> str:
    """Coerce a chat-model chunk's content into a plain string.

    LangChain returns either str or list[ContentBlock]. Block dicts may be
    {"type": "text", "text": "..."} (Gemini, Anthropic) or carry plain text.
    Tool-use blocks have no text and are skipped.
    """
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                if block.get("type") == "text" and isinstance(block.get("text"), str):
                    parts.append(block["text"])
                elif isinstance(block.get("text"), str):
                    parts.append(block["text"])
        return "".join(parts)
    return str(content)


def _safe_serialize(obj) -> dict | str | list:
    """Safely serialize an object for JSON, handling non-serializable types."""
    try:
        if isinstance(obj, (dict, list, str, int, float, bool, type(None))):
            return obj
        # LangChain ToolMessage / BaseMessage: surface the .content payload so
        # the client doesn't see a Python repr like "content='...' name='...'".
        content = getattr(obj, "content", None)
        if isinstance(content, (str, dict, list)):
            return content
        return str(obj)[:2000]
    except Exception:
        return str(obj)[:2000]
