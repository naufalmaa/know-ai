import os, json, asyncio, httpx, re
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from .pg_client import search_chunks

# Load .env from project root
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

app = FastAPI()

LITELLM_BASE = os.environ["LITELLM_BASE"]
LITELLM_API_KEY = os.getenv("LITELLM_API_KEY", "sk")
EMBED_MODEL = os.getenv("RAG_EMBED_MODEL", "mxbai-embed-large:latest")
GEN_MODEL = os.getenv("RAG_GENERATION_MODEL", "deepseek-r1:14b")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")   # optional fail-safe
API_BASE = os.getenv("API_BASE", "http://127.0.0.1:4000")

# ---------- LLM helpers ----------
async def embed(q:str)->list[float]:
  async with httpx.AsyncClient(timeout=60) as cli:
    r = await cli.post(f"{LITELLM_BASE}/embeddings",
      headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
      json={"model": EMBED_MODEL, "input": [q]})
    r.raise_for_status()
    return r.json()["data"][0]["embedding"]

async def llm_generate(prompt:str)->str:
  try:
    async with httpx.AsyncClient(timeout=120) as cli:
      r = await cli.post(f"{LITELLM_BASE}/chat/completions",
        headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
        json={"model": GEN_MODEL, "messages":[{"role":"user","content": prompt}]})
      r.raise_for_status()
      return r.json()["choices"][0]["message"]["content"]
  except Exception:
    if not OPENAI_API_KEY: raise
    async with httpx.AsyncClient(timeout=120) as cli:
      r = await cli.post("https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
        json={"model":"gpt-5-nano","messages":[{"role":"user","content": prompt}]})
      r.raise_for_status()
      return r.json()["choices"][0]["message"]["content"]

# ---------- Planner ----------
VIZ_SYSTEM = """You plan responses for a UI that supports TEXT, TABLE, VIZ, or TOOL calls.

Return JSON ONLY using one of:

{ "type":"text", "text":"..." }

{ "type":"table", "columns":[...], "rows":[ {...}, {...} ] }

{ "type":"viz",
  "title":"string",
  "traces":[ {"x":[...], "y":[...], "mode":"lines|markers", "name":"label"} ],
  "layout": { "xaxis_title":"", "yaxis_title":"", "legend":true }
}

{ "type":"tool", "name":"production.timeseries",
  "args": { "start":"YYYY-MM-DD", "end":"YYYY-MM-DD", "groupby":"day|week|month", "block": "optional", "well": "optional" } }

{ "type":"tool", "name":"csv.timeseries",
  "args": { "date_col":"DATEPRD", "value":"BORE_OIL_VOL|BORE_GAS_VOL|BORE_WAT_VOL",
            "groupby":"day|week|month", "block":"optional", "well":"optional",
            "start":"YYYY-MM-DD", "end":"YYYY-MM-DD" } }

{ "type":"tool", "name":"files.search", "args": { "q":"keyword" } }

Prefer TOOL for any visualization/tabular answer that relies on user data.
Never include code or markdown. Output must be a single JSON object.
"""


def build_prompt(question:str, chunks:list[dict])->str:
  ctx = "\n\n".join([f"[{i+1}] file_id={c['file_id']} page={c['page']} section={c['section']}\n{c['text']}"
                     for i,c in enumerate(chunks)])
  return (
    "Answer ONLY using the CONTEXT. If insufficient, say so. "
    "Append a JSON array 'citations' with items {file_id,page,section}.\n\n"
    f"CONTEXT:\n{ctx}\n\nQUESTION: {question}\nANSWER:"
  )

def _extract_json(s:str):
  m = re.search(r'\{[\s\S]*\}$', s.strip())
  if not m: return None
  try: return json.loads(m.group(0))
  except: return None

async def plan(question:str, chunks:list[dict])->dict:
  # Use small summary of retrieved text to help planner choose tool/text/viz/table
  summary = "\n".join([c["text"][:400] for c in chunks])[:2000]
  prompt = VIZ_SYSTEM + "\n\nUser question:\n" + question + "\n\nRelevant notes:\n" + summary
  raw = await llm_generate(prompt)
  obj = _extract_json(raw)
  if not obj: return {"type":"text","text":raw}
  return obj

# ---------- Tool executors ----------
async def tool_production_timeseries(args:dict):
  params = {
    "start": args.get("start","2024-01-01"),
    "end":   args.get("end", "2025-12-31"),
    "groupby": args.get("groupby","month"),
    "block": args.get("block"),
    "well": args.get("well")
  }
  async with httpx.AsyncClient(timeout=60) as cli:
    r = await cli.get(f"{API_BASE}/api/metrics/production", params=params)
    r.raise_for_status()
    data = r.json()
  return {
    "type":"viz",
    "title": f"Production (${data['groupby']})",
    "traces":[
      {"x": data["dates"], "y": data["oil"], "mode":"lines", "name":"Oil (bopd)"},
      {"x": data["dates"], "y": data["gas"], "mode":"lines", "name":"Gas (mmscfd)"}
    ],
    "layout": { "xaxis_title":"Date", "yaxis_title":"Value", "legend": True }
  }
  
async def tool_csv_timeseries(args:dict):
  params = {
    "start": args.get("start","2007-01-01"),
    "end":   args.get("end", "2025-12-31"),
    "groupby": args.get("groupby","month"),
    "block": args.get("block"),
    "well": args.get("well")
  }
  metric = (args.get("value") or "BORE_OIL_VOL").upper()
  async with httpx.AsyncClient(timeout=60) as cli:
    r = await cli.get(f"{API_BASE}/api/metrics/aceh/production", params=params)
    r.raise_for_status()
    data = r.json()
  y, yname = (data["oil"], "Oil (bbl)") if metric.endswith("OIL_VOL") else \
             (data["gas"], "Gas (mscf)") if metric.endswith("GAS_VOL") else \
             (data["water"], "Water (bbl)")
  title = f"{yname} by {data['groupby']}" + (f" — {params['block']}" if params.get('block') else "") + (f" — {params['well']}" if params.get('well') else "")
  return { "type":"viz", "title": title,
           "traces":[ { "x": data["dates"], "y": y, "mode":"lines", "name": yname } ],
           "layout": { "xaxis_title":"Date", "yaxis_title": yname, "legend": True } }

async def tool_files_search(args:dict):
  q = args.get("q","")
  async with httpx.AsyncClient(timeout=60) as cli:
    r = await cli.get(f"{API_BASE}/api/drive/search", params={"q": q})
    r.raise_for_status()
    rows = r.json()[:50]
  cols = ["filename","mime_type","doc_type","basin","block"]
  normalized = []
  for r in rows:
    normalized.append({
      "filename": r.get("filename",""),
      "mime_type": r.get("mime_type",""),
      "doc_type": r.get("doc_type",""),
      "basin": r.get("basin",""),
      "block": r.get("block","")
    })
  return { "type":"table", "columns": cols, "rows": normalized }

async def execute_tool(plan_obj:dict):
  name = plan_obj.get("name")
  args = plan_obj.get("args",{})
  if name == "production.timeseries":
    return await tool_production_timeseries(args)
  if name == "csv.timeseries":
    return await tool_csv_timeseries(args)
  if name == "files.search":
    return await tool_files_search(args)
  return {"type":"text","text":"Tool not recognized."}


# ---------- WS ----------
@app.websocket("/ws")
async def ws(ws: WebSocket):
  await ws.accept()
  hb = asyncio.create_task(_heartbeat(ws))
  try:
    while True:
      raw = await ws.receive_text()
      msg = json.loads(raw)
      q = msg["query"]; tenant = msg.get("tenant_id","demo"); fid = msg.get("file_id")

      # 1) retrieve
      q_emb = await embed(q)
      hits = search_chunks(tenant, q_emb, 8, fid)
      await ws.send_text(json.dumps({"type":"result","payload":{"objects":[
        {"text":h["text"], "meta":{"file_id":h["file_id"],"page":h["page"],"section":h["section"]}}
      for h in hits]}}))

      # 2) plan (text/table/viz/tool)
      p = await plan(q, hits)

      if p.get("type") == "tool":
        out = await execute_tool(p)
        # After tool execution we have either viz or table
        if out.get("type") == "viz":
          await ws.send_text(json.dumps({"type":"viz","payload":out}))
        elif out.get("type") == "table":
          await ws.send_text(json.dumps({"type":"table","payload":out}))
        else:
          await ws.send_text(json.dumps({"type":"answer","payload":out.get("text","")}))
      elif p.get("type") == "viz":
        await ws.send_text(json.dumps({"type":"viz","payload":p}))
      elif p.get("type") == "table":
        await ws.send_text(json.dumps({"type":"table","payload":p}))
      else:
        # 3) plain grounded answer w/ citations
        answer = await llm_generate(build_prompt(q, hits))
        await ws.send_text(json.dumps({"type":"answer","payload":answer}))
  except WebSocketDisconnect:
    hb.cancel()
    return

async def _heartbeat(ws:WebSocket):
  while True:
    await asyncio.sleep(60)
    await ws.send_text(json.dumps({"type":"heartbeat"}))
