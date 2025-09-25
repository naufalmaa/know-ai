create extension if not exists pgcrypto;

create table if not exists users(
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text,
  role text not null default 'user',
  created_at timestamptz default now()
);

create table if not exists folders(
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references folders(id) on delete cascade,
  owner_id uuid references users(id),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists files(
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references folders(id) on delete set null,
  owner_id uuid references users(id),
  filename text not null,
  mime_type text,
  size bigint,
  checksum text,
  s3_key text not null unique,
  version int not null default 1,
  processing_status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists file_metadata(
  id uuid primary key default gen_random_uuid(),
  file_id uuid references files(id) on delete cascade,
  doc_type text,
  basin text,
  block text,
  well_name text,
  survey_type text,
  formation text,
  indexed boolean default false,
  chunks_count int default 0,
  updated_at timestamptz default now(),
  unique(file_id)
);

create table if not exists sessions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  token text unique,
  created_at timestamptz default now(),
  expires_at timestamptz
);
