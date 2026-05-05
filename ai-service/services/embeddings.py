from langchain_google_genai import GoogleGenerativeAIEmbeddings
from config import settings


_embedder: GoogleGenerativeAIEmbeddings | None = None


def get_embedder() -> GoogleGenerativeAIEmbeddings:
    """Return a process-wide GoogleGenerativeAIEmbeddings instance.

    text-embedding-004 produces 768-dim vectors which match the
    knowledge_chunks.embedding column.
    """
    global _embedder
    if _embedder is None:
        _embedder = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=settings.google_api_key,
        )
    return _embedder


def embed_query(text: str) -> list[float]:
    return get_embedder().embed_query(text)


def embed_documents(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    return get_embedder().embed_documents(texts)


def to_pgvector(values: list[float]) -> str:
    """Format an embedding as a pgvector string literal: '[0.1,0.2,...]'."""
    return "[" + ",".join(repr(float(v)) for v in values) + "]"
