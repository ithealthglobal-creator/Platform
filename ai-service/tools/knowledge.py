"""LangChain tools that let agents read, write, and reorganize the knowledge base.

These tools are scoped per-call via a closure over the caller's company_id so
agents cannot leak data across tenants. Tools are built by build_knowledge_tools(
company_id, tool_names, document_id=None).
"""
import json
import traceback
from langchain_core.tools import tool
from services.supabase_client import get_supabase_admin
from services.embeddings import embed_query, to_pgvector
from api.routes.knowledge import reingest_document


def _make_retrieve(company_id: str, document_id: str | None):
    @tool
    def knowledge_retrieve(query: str, k: int = 6) -> str:
        """Semantic search over the company's knowledge chunks.

        Args:
            query: Natural-language search string.
            k: Number of chunks to return (1-12).

        Returns JSON: a list of {chunk_id, document_id, document_title, heading_path, content, similarity}.
        """
        try:
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
        except Exception as e:
            print(f"[knowledge_retrieve] {type(e).__name__}: {e}\n{traceback.format_exc()}", flush=True)
            raise

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


def _make_list_tree(company_id: str):
    @tool
    def knowledge_list_tree() -> str:
        """List the company's full knowledge tree: every folder and document with their ids, parents, titles, and sort orders.

        Call this before creating, moving, or restructuring anything so you understand the existing layout.

        Returns JSON: {folders: [{id, parent_id, name, sort_order}], documents: [{id, folder_id, title, sort_order}]}.
        """
        try:
            client = get_supabase_admin()
            folders = (
                client.table("knowledge_folders")
                .select("id, parent_id, name, sort_order")
                .eq("company_id", company_id)
                .order("parent_id")
                .order("sort_order")
                .execute()
            )
            documents = (
                client.table("knowledge_documents")
                .select("id, folder_id, title, sort_order")
                .eq("company_id", company_id)
                .order("folder_id")
                .order("sort_order")
                .execute()
            )
            return json.dumps({
                "folders": folders.data or [],
                "documents": documents.data or [],
            })
        except Exception as e:
            print(f"[knowledge_list_tree] {type(e).__name__}: {e}\n{traceback.format_exc()}", flush=True)
            raise

    return knowledge_list_tree


def _make_create_folder(company_id: str):
    @tool
    def knowledge_create_folder(
        name: str,
        parent_folder_id: str | None = None,
        sort_order: int = 9999,
    ) -> str:
        """Create a folder in the knowledge workspace.

        Args:
            name: Display name for the folder.
            parent_folder_id: id of the parent folder, or null for root.
            sort_order: position among siblings (default 9999 = append).

        Returns JSON: {id, name, parent_id, sort_order}.
        """
        try:
            client = get_supabase_admin()
            if parent_folder_id:
                parent = (
                    client.table("knowledge_folders")
                    .select("id")
                    .eq("id", parent_folder_id)
                    .eq("company_id", company_id)
                    .single()
                    .execute()
                )
                if not parent.data:
                    return json.dumps({"error": "parent folder not found in this company"})
            row = (
                client.table("knowledge_folders")
                .insert({
                    "name": (name or "Untitled").strip() or "Untitled",
                    "parent_id": parent_folder_id,
                    "sort_order": int(sort_order),
                    "company_id": company_id,
                })
                .select("id, name, parent_id, sort_order")
                .single()
                .execute()
            )
            return json.dumps(row.data)
        except Exception as e:
            print(f"[knowledge_create_folder] {type(e).__name__}: {e}\n{traceback.format_exc()}", flush=True)
            raise

    return knowledge_create_folder


def _make_create_document(company_id: str):
    @tool
    def knowledge_create_document(
        title: str,
        content: str = "",
        folder_id: str | None = None,
        sort_order: int = 9999,
    ) -> str:
        """Create a new markdown document.

        Args:
            title: Document title (used as the filename for [[Wiki-link]] resolution).
            content: Markdown body. Use # headings, lists, tables. Use [[Other Title]] to link to other notes.
            folder_id: id of the folder to place it in, or null for root.
            sort_order: position among siblings (default 9999 = append).

        The new document is automatically chunked, embedded, and link-resolved.

        Returns JSON: {id, title, folder_id, sort_order, chunks, links, broken_links}.
        """
        try:
            client = get_supabase_admin()
            if folder_id:
                folder = (
                    client.table("knowledge_folders")
                    .select("id")
                    .eq("id", folder_id)
                    .eq("company_id", company_id)
                    .single()
                    .execute()
                )
                if not folder.data:
                    return json.dumps({"error": "folder not found in this company"})
            row = (
                client.table("knowledge_documents")
                .insert({
                    "title": (title or "Untitled").strip() or "Untitled",
                    "content": content or "",
                    "folder_id": folder_id,
                    "sort_order": int(sort_order),
                    "company_id": company_id,
                })
                .select("id, title, folder_id, sort_order")
                .single()
                .execute()
            )
            doc = row.data
            ingest = reingest_document(doc["id"], expected_company_id=company_id)
            return json.dumps({**doc, **{k: ingest[k] for k in ("chunks", "links", "broken_links")}})
        except Exception as e:
            print(f"[knowledge_create_document] {type(e).__name__}: {e}\n{traceback.format_exc()}", flush=True)
            raise

    return knowledge_create_document


def _make_update_document(company_id: str):
    @tool
    def knowledge_update_document(
        document_id: str,
        title: str | None = None,
        content: str | None = None,
    ) -> str:
        """Update a document's title and/or content. Use this to fix formatting, rewrite, or replace a document body.

        Args:
            document_id: id of the document to update.
            title: New title (omit to keep existing).
            content: New full markdown body (omit to keep existing). The body REPLACES the existing content — include everything you want kept.

        Re-chunks and re-embeds when content changes.

        Returns JSON: {id, title, folder_id, chunks?, links?, broken_links?}.
        """
        try:
            client = get_supabase_admin()
            existing = (
                client.table("knowledge_documents")
                .select("id, company_id")
                .eq("id", document_id)
                .single()
                .execute()
            )
            if not existing.data or existing.data["company_id"] != company_id:
                return json.dumps({"error": "document not found in this company"})
            patch: dict = {}
            if title is not None:
                patch["title"] = (title or "Untitled").strip() or "Untitled"
            if content is not None:
                patch["content"] = content
            if not patch:
                return json.dumps({"error": "nothing to update"})
            row = (
                client.table("knowledge_documents")
                .update(patch)
                .eq("id", document_id)
                .select("id, title, folder_id")
                .single()
                .execute()
            )
            result = dict(row.data or {})
            if "content" in patch:
                ingest = reingest_document(document_id, expected_company_id=company_id)
                result.update({k: ingest[k] for k in ("chunks", "links", "broken_links")})
            return json.dumps(result)
        except Exception as e:
            print(f"[knowledge_update_document] {type(e).__name__}: {e}\n{traceback.format_exc()}", flush=True)
            raise

    return knowledge_update_document


def _make_move_document(company_id: str):
    @tool
    def knowledge_move_document(
        document_id: str,
        folder_id: str | None = None,
        sort_order: int | None = None,
    ) -> str:
        """Move a document into a folder (or root) and/or reorder it.

        Args:
            document_id: id of the document to move.
            folder_id: destination folder id, or null to move to root.
            sort_order: new position among siblings (omit to keep current).

        Returns JSON: {id, folder_id, sort_order}.
        """
        try:
            client = get_supabase_admin()
            existing = (
                client.table("knowledge_documents")
                .select("id, company_id")
                .eq("id", document_id)
                .single()
                .execute()
            )
            if not existing.data or existing.data["company_id"] != company_id:
                return json.dumps({"error": "document not found in this company"})
            if folder_id:
                folder = (
                    client.table("knowledge_folders")
                    .select("id")
                    .eq("id", folder_id)
                    .eq("company_id", company_id)
                    .single()
                    .execute()
                )
                if not folder.data:
                    return json.dumps({"error": "destination folder not found in this company"})
            patch: dict = {"folder_id": folder_id}
            if sort_order is not None:
                patch["sort_order"] = int(sort_order)
            row = (
                client.table("knowledge_documents")
                .update(patch)
                .eq("id", document_id)
                .select("id, folder_id, sort_order")
                .single()
                .execute()
            )
            return json.dumps(row.data)
        except Exception as e:
            print(f"[knowledge_move_document] {type(e).__name__}: {e}\n{traceback.format_exc()}", flush=True)
            raise

    return knowledge_move_document


def _make_move_folder(company_id: str):
    @tool
    def knowledge_move_folder(
        folder_id: str,
        parent_folder_id: str | None = None,
        sort_order: int | None = None,
    ) -> str:
        """Reparent or reorder a folder.

        Args:
            folder_id: id of the folder to move.
            parent_folder_id: new parent folder id, or null for root.
            sort_order: new position among siblings (omit to keep current).

        Refuses to move a folder into its own subtree.

        Returns JSON: {id, parent_id, sort_order}.
        """
        try:
            client = get_supabase_admin()
            existing = (
                client.table("knowledge_folders")
                .select("id, company_id")
                .eq("id", folder_id)
                .single()
                .execute()
            )
            if not existing.data or existing.data["company_id"] != company_id:
                return json.dumps({"error": "folder not found in this company"})
            if parent_folder_id:
                if parent_folder_id == folder_id:
                    return json.dumps({"error": "a folder cannot be its own parent"})
                # Walk ancestors of the proposed parent; if folder_id appears, refuse.
                cur: str | None = parent_folder_id
                seen = set()
                while cur and cur not in seen:
                    seen.add(cur)
                    parent = (
                        client.table("knowledge_folders")
                        .select("id, parent_id, company_id")
                        .eq("id", cur)
                        .single()
                        .execute()
                    )
                    if not parent.data or parent.data["company_id"] != company_id:
                        return json.dumps({"error": "destination folder not found in this company"})
                    if parent.data["id"] == folder_id:
                        return json.dumps({"error": "cannot move folder into its own descendant"})
                    cur = parent.data.get("parent_id")
            patch: dict = {"parent_id": parent_folder_id}
            if sort_order is not None:
                patch["sort_order"] = int(sort_order)
            row = (
                client.table("knowledge_folders")
                .update(patch)
                .eq("id", folder_id)
                .select("id, parent_id, sort_order")
                .single()
                .execute()
            )
            return json.dumps(row.data)
        except Exception as e:
            print(f"[knowledge_move_folder] {type(e).__name__}: {e}\n{traceback.format_exc()}", flush=True)
            raise

    return knowledge_move_folder


_BUILDERS = {
    "knowledge_retrieve": _make_retrieve,
    "knowledge_search_titles": lambda cid, _doc=None: _make_search_titles(cid),
    "knowledge_save_links": lambda cid, _doc=None: _make_save_links(cid),
    "knowledge_list_tree": lambda cid, _doc=None: _make_list_tree(cid),
    "knowledge_create_folder": lambda cid, _doc=None: _make_create_folder(cid),
    "knowledge_create_document": lambda cid, _doc=None: _make_create_document(cid),
    "knowledge_update_document": lambda cid, _doc=None: _make_update_document(cid),
    "knowledge_move_document": lambda cid, _doc=None: _make_move_document(cid),
    "knowledge_move_folder": lambda cid, _doc=None: _make_move_folder(cid),
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
