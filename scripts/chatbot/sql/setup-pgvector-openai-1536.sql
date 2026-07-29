create extension if not exists vector with schema extensions;

set search_path = chatbot, extensions, public;

alter table chatbot.chunks
  add column if not exists embedding vector(1536);

create index if not exists chunks_embedding_hnsw_idx
  on chatbot.chunks
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create or replace function chatbot.match_chunks(
  query_embedding vector(1536),
  match_count integer default 5
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
set search_path = chatbot, extensions, public
as $$
  select
    c.id,
    c.document_id,
    c.chunk_index,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity
  from chatbot.chunks c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

grant usage on schema chatbot to service_role;
grant select, update on table chatbot.chunks to service_role;
grant execute on function chatbot.match_chunks(vector, integer) to service_role;

notify pgrst, 'reload schema';
