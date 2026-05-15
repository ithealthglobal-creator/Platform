from langchain_google_genai import GoogleGenerativeAIEmbeddings
from config import settings


_embedder: GoogleGenerativeAIEmbeddings | None = None


def get_embedder() -> GoogleGenerativeAIEmbeddings:
    """Return a process-wide GoogleGenerativeAIEmbeddings instance.

    Uses gemini-embedding-001 with output_dimensionality=768 so vectors match
    the knowledge_chunks.embedding column. (text-embedding-004 was removed
    from the v1beta endpoint.)
    """
    global _embedder
    if _embedder is None:
        _embedder = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=settings.google_api_key,
            output_dimensionality=768,
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
