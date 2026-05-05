-- Knowledge area tables: folder tree, markdown documents, embedding chunks, wiki-link graph.
-- Folders and documents are scoped per-company; embedding chunks are scoped to documents.

create extension if not exists vector;

-- ============================================================
-- knowledge_folders — adjacency list, per-company
-- ============================================================
create table public.knowledge_folders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_id uuid references public.knowledge_folders(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_knowledge_folders_company_parent
  on public.knowledge_folders (company_id, parent_id, sort_order);

-- ============================================================
-- knowledge_documents — markdown body lives in `content`
-- ============================================================
create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  folder_id uuid references public.knowledge_folders(id) on delete set null,
  title text not null,
  content text not null default '',
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_ingested_at timestamptz
);
create index idx_knowledge_documents_company_folder
  on public.knowledge_documents (company_id, folder_id, sort_order);
-- Used by the auto-linker to resolve [[Title]] strings to documents within the same company.
create index idx_knowledge_documents_company_title
  on public.knowledge_documents (company_id, lower(title));

-- ============================================================
-- knowledge_chunks — one row per ~500-token chunk, written by the Ingestor
-- ============================================================
create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  chunk_index integer not null,
  heading_path text,
  content text not null,
  embedding vector(768),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);
create index idx_knowledge_chunks_company on public.knowledge_chunks (company_id);
create index idx_knowledge_chunks_embedding
  on public.knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ============================================================
-- knowledge_links — wiki-link graph computed by the Auto-Linker
-- ============================================================
create table public.knowledge_links (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  target_document_id uuid references public.knowledge_documents(id) on delete set null,
  target_title text not null,
  is_broken boolean generated always as (target_document_id is null) stored,
  created_at timestamptz not null default now()
);
create index idx_knowledge_links_source on public.knowledge_links (source_document_id);
create index idx_knowledge_links_target on public.knowledge_links (target_document_id);

-- ============================================================
-- ai_conversations: associate a chat thread with a knowledge document (optional)
-- Workspace-wide threads keep document_id null.
-- ============================================================
alter table public.ai_conversations
  add column if not exists document_id uuid references public.knowledge_documents(id) on delete set null;
create index if not exists idx_ai_conversations_document
  on public.ai_conversations (document_id);

-- Updated_at triggers (reuse existing helper)
create trigger knowledge_folders_updated_at
  before update on public.knowledge_folders
  for each row execute function public.update_updated_at();
create trigger knowledge_documents_updated_at
  before update on public.knowledge_documents
  for each row execute function public.update_updated_at();
