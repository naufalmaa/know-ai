-- enable pgvector
create extension if not exists vector;

-- document chunks table
create table if not exists doc_chunks (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files(id) on delete cascade,
  tenant_id text not null default 'demo',
  page int default 0,
  section text,
  checksum text,                         -- content hash used for idempotency
  text text not null,
  embedding vector(1024),                -- 1024 for mxbai-embed-large (adjust if needed)
  created_at timestamptz default now()
);

-- retrieve fast by file and tenant
create index if not exists idx_doc_chunks_file on doc_chunks(file_id);
create index if not exists idx_doc_chunks_tenant on doc_chunks(tenant_id);

-- IVFFLAT vector index (requires analyzed table; choose your distance)
-- cosine distance = 1 - cosine_similarity, use vector_cosine_ops
create index if not exists idx_doc_chunks_embedding
on doc_chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- optional unique constraint to avoid duplicates on re-ingestion
-- (file_id, checksum, section) should be stable for a given version
create unique index if not exists ux_doc_chunks_dedup on doc_chunks(file_id, checksum, section);
