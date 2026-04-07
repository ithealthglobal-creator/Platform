from typing import Annotated, TypedDict
import operator


class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    agent_id: str
    delegation_depth: int
