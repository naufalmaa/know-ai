import os, psycopg
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

PG_URL = os.environ["POSTGRES_URL"]

def get_conn(): return psycopg.connect(PG_URL)

def to_pgvector(v):
    # pgvector accepts string literal like '[0.1, 0.2, ...]'
    return "[" + ",".join(f"{float(x):.6f}" for x in v) + "]"

def upsert_chunks(file_id:str, tenant_id:str, checksum:str|None, chunks:list[dict], vectors:list[list[float]]):
    with get_conn() as conn, conn.cursor() as cur:
        for i, ch in enumerate(chunks):
            vec = to_pgvector(vectors[i])
            cur.execute("""
                insert into doc_chunks(file_id, tenant_id, page, section, checksum, text, embedding)
                values (%s,%s,%s,%s,%s,%s,%s::vector)
                on conflict (file_id, checksum, section) do update
                  set text=excluded.text, embedding=excluded.embedding
            """, (
                file_id, tenant_id, ch.get("page",0), ch.get("section",f"chunk-{i}"),
                checksum, ch["text"], vec
            ))
