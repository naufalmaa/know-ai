import os, httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from .chunker import chunk_markdown
from .pg_client import upsert_chunks
import asyncio

app = FastAPI()

ROLMOCR_URL = os.environ["ROLMOCR_URL"]
LITELLM_BASE = os.environ["LITELLM_BASE"]
LITELLM_API_KEY = os.getenv("LITELLM_API_KEY","sk")
EMBED_MODEL = os.getenv("RAG_EMBED_MODEL","mxbai-embed-large:latest")
AGNO_BASE = os.getenv("AGNO_BASE")

class Req(BaseModel):
  file_id: str
  s3_signed_url: str
  filename: str
  checksum: str | None = None
  tenant_id: str = "demo"
  mime_type: str | None = None

async def ocr_pdf_to_md(url:str)->str:
  async with httpx.AsyncClient(timeout=180) as cli:
    r = await cli.post(ROLMOCR_URL, json={"url": url})
    if r.status_code!=200: raise HTTPException(502, f"RolmOCR failed: {r.text}")
    return r.json().get("markdown","")

async def xlsx_to_md(url:str)->str:
  async with httpx.AsyncClient(timeout=120) as cli:
    f = await cli.get(url); f.raise_for_status()
  import io, pandas as pd
  buf = io.BytesIO(f.content)
  xls = pd.ExcelFile(buf)
  md=[]
  for sh in xls.sheet_names:
    df = xls.parse(sh).head(2000)
    md.append(f"## Sheet: {sh}\n")
    md.append(df.to_markdown(index=False))
  return "\n\n".join(md)

async def csv_to_md(url:str)->str:
  async with httpx.AsyncClient(timeout=120) as cli:
    f = await cli.get(url); f.raise_for_status()
  import io, pandas as pd
  df = pd.read_csv(io.BytesIO(f.content))
  return "## CSV preview\n\n" + df.head(50).to_markdown(index=False)

async def agno_chunk(md:str)->list[dict]:
  if not AGNO_BASE: return []
  async with httpx.AsyncClient(timeout=120) as cli:
    r = await cli.post(f"{AGNO_BASE}/chunk_markdown", json={"markdown": md})
    if r.status_code!=200: return []
    data = r.json().get("chunks", [])
    # normalize to our schema
    out=[]
    for i,c in enumerate(data):
      out.append({
        "idx": i,
        "text": c.get("text",""),
        "page": c.get("page",0),
        "section": c.get("section", f"chunk-{i}")
      })
    return out

async def embed_texts(texts:list[str])->list[list[float]]:
  async with httpx.AsyncClient(timeout=120) as cli:
    r = await cli.post(f"{LITELLM_BASE}/embeddings",
      headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
      json={"model": EMBED_MODEL, "input": texts})
    r.raise_for_status()
    data = r.json()
    return [e["embedding"] for e in data["data"]]
  
@app.post("/ingest/file")
async def ingest_file(r: Req):
  # 1) to Markdown
  if (r.mime_type or "").startswith("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") or r.filename.lower().endswith(".xlsx"):
    md = await xlsx_to_md(r.s3_signed_url)
  elif r.filename.lower().endswith(".csv") or (r.mime_type=="text/csv"):
    md = await csv_to_md(r.s3_signed_url)
  elif (r.mime_type=="application/pdf") or r.filename.lower().endswith(".pdf"):
    md = await ocr_pdf_to_md(r.s3_signed_url)
  else:
    async with httpx.AsyncClient(timeout=60) as cli:
      t = await cli.get(r.s3_signed_url); t.raise_for_status(); md = t.text
  if not md.strip():
    raise HTTPException(400,"empty markdown")

  # 2) chunk
  chunks = await agno_chunk(md)
  if not chunks:
    # our chunker already returns dicts [{"idx","text","page","section"}]
    chunks = chunk_markdown(md)

  # 3) embed
  texts = [c["text"] for c in chunks]
  vecs=[]; B=32
  for i in range(0, len(texts), B):
    part = await embed_texts(texts[i:i+B])
    vecs.extend(part)

  # 4) upsert
  upsert_chunks(r.file_id, r.tenant_id, r.checksum, chunks, vecs)
  return {"ok": True, "chunks": len(chunks)}
