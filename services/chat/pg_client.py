import os, psycopg
PG_URL = os.environ["POSTGRES_URL"]

def get_conn(): return psycopg.connect(PG_URL)

def to_pgvector(v):
    return "[" + ",".join(f"{float(x):.6f}" for x in v) + "]"

def search_chunks(tenant_id:str, query_emb:list[float], k:int=6, file_id:str|None=None):
    qv = to_pgvector(query_emb)
    sql = """
      select id, file_id, page, section, text,
             1 - (embedding <=> %s::vector) as cosine_sim
      from doc_chunks
      where tenant_id = %s
        and (%s::text is null or file_id = %s)
      order by embedding <=> %s::vector
      limit %s
    """
    params = (qv, tenant_id, file_id, file_id, qv, k)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
        return [dict(id=r[0], file_id=r[1], page=r[2], section=r[3], text=r[4], score=float(r[5])) for r in rows]
