-- RLS for knowledge tables. v1 is admin-only and scoped per-company.

alter table public.knowledge_folders enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.knowledge_links enable row level security;

-- ─── knowledge_folders ────────────────────────────────────────────
create policy "Admins read own company folders"
  on public.knowledge_folders for select
  using (
    public.get_my_role() = 'admin'
    and company_id = public.get_my_company_id()
  );

create policy "Admins insert own company folders"
  on public.knowledge_folders for insert
  with check (
    public.get_my_role() = 'admin'
    and company_id = public.get_my_company_id()
  );

create policy "Admins update own company folders"
  on public.knowledge_folders for update
  using (
    public.get_my_role() = 'admin'
    and company_id = public.get_my_company_id()
  )
  with check (
    public.get_my_role() = 'admin'
    and company_id = public.get_my_company_id()
  );

create policy "Admins delete own company folders"
  on public.knowledge_folders for delete
  using (
    public.get_my_role() = 'admin'
    and company_id = public.get_my_company_id()
  );

-- ─── knowledge_documents ──────────────────────────────────────────
create policy "Admins read own company documents"
  on public.knowledge_documents for select
  using (
    public.get_my_role() = 'admin'
    and company_id = public.get_my_company_id()
  );

create policy "Admins insert own company documents"
  on public.knowledge_documents for insert
  with check (
    public.get_my_role() = 'admin'
    and company_id = public.get_my_company_id()
  );

create policy "Admins update own company documents"
  on public.knowledge_documents for update
  using (
    public.get_my_role() = 'admin'
    and company_id = public.get_my_company_id()
  )
  with check (
    public.get_my_role() = 'admin'
    and company_id = public.get_my_company_id()
  );

create policy "Admins delete own company documents"
  on public.knowledge_documents for delete
  using (
    public.get_my_role() = 'admin'
    and company_id = public.get_my_company_id()
  );

-- ─── knowledge_chunks ─────────────────────────────────────────────
-- Read-only from the client (chunks are written by the ai-service via service_role).
create policy "Admins read own company chunks"
  on public.knowledge_chunks for select
  using (
    public.get_my_role() = 'admin'
    and company_id = public.get_my_company_id()
  );

-- ─── knowledge_links ──────────────────────────────────────────────
-- Read-only from the client (written by the ai-service auto-linker).
create policy "Admins read own company links"
  on public.knowledge_links for select
  using (
    public.get_my_role() = 'admin'
    and exists (
      select 1 from public.knowledge_documents d
      where d.id = source_document_id
        and d.company_id = public.get_my_company_id()
    )
  );
