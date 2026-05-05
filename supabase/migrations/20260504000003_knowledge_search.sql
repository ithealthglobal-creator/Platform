-- Vector-similarity search RPC scoped to a company.
-- Called from the ai-service with service_role; the company arg is taken from
-- the caller's profile, never from user input.

create or replace function public.match_knowledge_chunks(
  query_embedding vector(768),
  company uuid,
  match_count integer default 6,
  document_filter uuid default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  heading_path text,
  content text,
  similarity float
)
language sql
stable
security definer
as $$
  select
    c.id              as chunk_id,
    c.document_id     as document_id,
    d.title           as document_title,
    c.heading_path    as heading_path,
    c.content         as content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks c
  join public.knowledge_documents d on d.id = c.document_id
  where c.company_id = company
    and c.embedding is not null
    and (document_filter is null or c.document_id = document_filter)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

revoke all on function public.match_knowledge_chunks(vector, uuid, integer, uuid) from public;
grant execute on function public.match_knowledge_chunks(vector, uuid, integer, uuid) to service_role;
