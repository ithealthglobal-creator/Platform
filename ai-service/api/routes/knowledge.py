"""Ingest endpoint: chunk a document, embed each chunk, refresh wiki-link graph.

Called by the Next.js layer whenever a document's content changes (debounced
client-side). Idempotent: re-running on the same content is safe.
"""
import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

from api.middleware.auth import get_current_user, AuthUser
from services.supabase_client import get_supabase_admin
from services.embeddings import embed_documents, to_pgvector

router = APIRouter()

WIKILINK_RE = re.compile(r"\[\[([^\[\]]{1,200})\]\]")

HEADERS_TO_SPLIT_ON = [
    ("#", "h1"),
    ("##", "h2"),
    ("###", "h3"),
]


class IngestRequest(BaseModel):
    document_id: str


def _heading_path(metadata: dict) -> str | None:
    parts = [metadata[k] for k in ("h1", "h2", "h3") if metadata.get(k)]
    return " > ".join(parts) if parts else None


def _chunk_markdown(content: str) -> list[dict]:
    """Split markdown by headers, then re-split long sections by characters."""
    if not content.strip():
        return []
    header_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=HEADERS_TO_SPLIT_ON)
    sections = header_splitter.split_text(content)

    char_splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=120)
    chunks: list[dict] = []
    for section in sections:
        text = section.page_content
        meta = section.metadata or {}
        if not text.strip():
            continue
        for piece in char_splitter.split_text(text):
            chunks.append({
                "content": piece,
                "heading_path": _heading_path(meta),
            })
    return chunks


def _resolve_wikilinks(client, company_id: str, content: str) -> list[dict]:
    """Extract every [[Title]] from content and resolve each against existing documents."""
    titles = []
    seen = set()
    for match in WIKILINK_RE.finditer(content):
        t = match.group(1).strip()
        if t and t.lower() not in seen:
            seen.add(t.lower())
            titles.append(t)
    if not titles:
        return []

    docs = (
        client.table("knowledge_documents")
        .select("id, title")
        .eq("company_id", company_id)
        .in_("title", titles)
        .execute()
    )
    by_title_lower = {row["title"].lower(): row["id"] for row in (docs.data or [])}

    return [
        {"target_title": t, "target_document_id": by_title_lower.get(t.lower())}
        for t in titles
    ]


@router.post("/ingest")
async def ingest(request: IngestRequest, user: AuthUser = Depends(get_current_user)):
    client = get_supabase_admin()

    # Verify the document exists and is in the caller's company.
    doc_resp = (
        client.table("knowledge_documents")
        .select("id, company_id, content")
        .eq("id", request.document_id)
        .single()
        .execute()
    )
    doc = doc_resp.data
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc["company_id"] != user.company_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    company_id = doc["company_id"]
    content = doc["content"] or ""

    chunks = _chunk_markdown(content)

    # Replace existing chunks atomically-ish (delete + insert).
    client.table("knowledge_chunks").delete().eq(
        "document_id", request.document_id
    ).execute()

    if chunks:
        embeddings = embed_documents([c["content"] for c in chunks])
        rows = []
        for idx, (chunk, vec) in enumerate(zip(chunks, embeddings)):
            rows.append({
                "document_id": request.document_id,
                "company_id": company_id,
                "chunk_index": idx,
                "heading_path": chunk["heading_path"],
                "content": chunk["content"],
                "embedding": to_pgvector(vec),
            })
        client.table("knowledge_chunks").insert(rows).execute()

    # Refresh wiki-link graph.
    client.table("knowledge_links").delete().eq(
        "source_document_id", request.document_id
    ).execute()
    link_rows = _resolve_wikilinks(client, company_id, content)
    if link_rows:
        client.table("knowledge_links").insert([
            {"source_document_id": request.document_id, **r} for r in link_rows
        ]).execute()

    client.table("knowledge_documents").update(
        {"last_ingested_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", request.document_id).execute()

    broken = sum(1 for r in link_rows if r["target_document_id"] is None)
    return {
        "document_id": request.document_id,
        "chunks": len(chunks),
        "links": len(link_rows),
        "broken_links": broken,
    }
