"""LangChain tools that let agents read and link the knowledge base.

These tools are scoped per-call via a closure over the caller's company_id so
agents cannot leak data across tenants. Tools are built by build_knowledge_tools(
company_id, tool_names, document_id=None).
"""
import json
from langchain_core.tools import tool
from services.supabase_client import get_supabase_admin
from services.embeddings import embed_query, to_pgvector


def _make_retrieve(company_id: str, document_id: str | None):
    @tool
    def knowledge_retrieve(query: str, k: int = 6) -> str:
        """Semantic search over the company's knowledge chunks.

        Args:
            query: Natural-language search string.
            k: Number of chunks to return (1-12).

        Returns JSON: a list of {chunk_id, document_id, document_title, heading_path, content, similarity}.
        """
        client = get_supabase_admin()
        embedding = embed_query(query)
        params: dict = {
            "query_embedding": to_pgvector(embedding),
            "company": company_id,
            "match_count": max(1, min(int(k or 6), 12)),
        }
        if document_id:
            params["document_filter"] = document_id
        result = client.rpc("match_knowledge_chunks", params).execute()
        return json.dumps(result.data or [])

    return knowledge_retrieve


def _make_search_titles(company_id: str):
    @tool
    def knowledge_search_titles(query: str, limit: int = 8) -> str:
        """Fuzzy-match document titles in the company's knowledge base.

        Use this to resolve [[Wiki-link]] strings to document ids before saving links.

        Returns JSON: list of {id, title}.
        """
        client = get_supabase_admin()
        q = (
            client.table("knowledge_documents")
            .select("id, title")
            .eq("company_id", company_id)
            .ilike("title", f"%{query}%")
            .limit(max(1, min(int(limit or 8), 25)))
        )
        result = q.execute()
        return json.dumps(result.data or [])

    return knowledge_search_titles


def _make_save_links(company_id: str):
    @tool
    def knowledge_save_links(source_document_id: str, links: list[dict]) -> str:
        """Persist the resolved [[Wiki-link]] graph for a source document.

        Args:
            source_document_id: id of the document containing the [[links]].
            links: list of {target_title, target_document_id|null}. Pass null for unresolved links — they will be marked broken.

        Replaces all existing links for source_document_id. Returns a JSON summary.
        """
        client = get_supabase_admin()
        # Verify source belongs to this company before any writes.
        src = (
            client.table("knowledge_documents")
            .select("id, company_id")
            .eq("id", source_document_id)
            .eq("company_id", company_id)
            .single()
            .execute()
        )
        if not src.data:
            return json.dumps({"error": "source document not found in this company"})

        client.table("knowledge_links").delete().eq(
            "source_document_id", source_document_id
        ).execute()

        rows = []
        for item in links or []:
            title = (item or {}).get("target_title")
            if not title:
                continue
            rows.append({
                "source_document_id": source_document_id,
                "target_title": title,
                "target_document_id": (item or {}).get("target_document_id"),
            })
        if rows:
            client.table("knowledge_links").insert(rows).execute()

        broken = sum(1 for r in rows if r["target_document_id"] is None)
        return json.dumps({
            "saved": len(rows),
            "broken": broken,
            "ok": broken == 0,
        })

    return knowledge_save_links


_BUILDERS = {
    "knowledge_retrieve": _make_retrieve,
    "knowledge_search_titles": lambda cid, _doc=None: _make_search_titles(cid),
    "knowledge_save_links": lambda cid, _doc=None: _make_save_links(cid),
}


def build_knowledge_tools(
    company_id: str,
    tool_names: list[str],
    document_id: str | None = None,
) -> list:
    """Construct knowledge tools scoped to a company (and optionally a document)."""
    tools = []
    for name in tool_names:
        builder = _BUILDERS.get(name)
        if builder is None:
            continue
        if name == "knowledge_retrieve":
            tools.append(builder(company_id, document_id))
        else:
            tools.append(builder(company_id))
    return tools
