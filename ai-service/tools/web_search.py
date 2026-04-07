from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage


@tool
def web_search(query: str) -> str:
    """Search the web for current information. Use this for researching topics, finding statistics, or getting up-to-date information."""
    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_search_retrieval=True,
    )
    response = model.invoke([HumanMessage(content=f"Search and summarize: {query}")])
    return response.content
