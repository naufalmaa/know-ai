import os, json, asyncio, httpx, re
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import sys
import os
sys.path.append(os.path.dirname(__file__))
from pg_client import search_chunks

# Load .env from project root
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

app = FastAPI()

LITELLM_BASE = os.environ["LITELLM_BASE"]
LITELLM_API_KEY = os.getenv("LITELLM_API_KEY", "sk")
EMBED_MODEL = os.getenv("RAG_EMBED_MODEL", "mxbai-embed-large:latest")
GEN_MODEL = os.getenv("RAG_GENERATION_MODEL", "deepseek-r1:14b")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")   # optional fail-safe
API_BASE = os.getenv("API_BASE", "http://127.0.0.1:4000")
# Agno AI Agent Service
AGNO_BASE = os.getenv("AGNO_BASE", "http://127.0.0.1:9010")

# ---------- Agno AI Agent Integration ----------
async def agno_enhance_prompt(original_query: str, context: str = "") -> tuple[str, dict]:
  """Use Agno's Prompt Restructuring Agent to enhance user queries"""
  try:
    async with httpx.AsyncClient(timeout=30) as cli:
      response = await cli.post(f"{AGNO_BASE}/agent/restructure-prompt",
        json={
          "original_prompt": original_query,
          "context": context,
          "domain": "knowledge_retrieval"
        })
      
      if response.status_code == 200:
        data = response.json()
        if data.get("success"):
          return data["processed_output"], {
            "agno_enhanced": True,
            "confidence": data.get("confidence_score", 0.0),
            "reasoning": data.get("reasoning", ""),
            "suggestions": data.get("suggestions", [])
          }
  
  except Exception as e:
    print(f"Agno prompt enhancement failed: {e}")
  
  # Fallback to original query
  return original_query, {"agno_enhanced": False, "confidence": 0.0, "reasoning": "Agno service unavailable"}

async def agno_evaluate_response(response_content: str, original_prompt: str) -> tuple[str, dict]:
  """Use Agno's Response Evaluation Agent to improve responses"""
  try:
    async with httpx.AsyncClient(timeout=30) as cli:
      response = await cli.post(f"{AGNO_BASE}/agent/evaluate-response",
        json={
          "response_content": response_content,
          "original_prompt": original_prompt,
          "response_format": "text",
          "evaluation_criteria": ["clarity", "completeness", "relevance", "actionability"]
        })
      
      if response.status_code == 200:
        data = response.json()
        if data.get("success"):
          return data["processed_output"], {
            "agno_evaluated": True,
            "confidence": data.get("confidence_score", 0.0),
            "reasoning": data.get("reasoning", ""),
            "suggestions": data.get("suggestions", [])
          }
  
  except Exception as e:
    print(f"Agno response evaluation failed: {e}")
  
  # Fallback to original response
  return response_content, {"agno_evaluated": False, "confidence": 0.0, "reasoning": "Agno service unavailable"}
async def embed(q:str)->list[float]:
  async with httpx.AsyncClient(timeout=60) as cli:
    r = await cli.post(f"{LITELLM_BASE}/embeddings",
      headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
      json={"model": EMBED_MODEL, "input": [q]})
    r.raise_for_status()
    return r.json()["data"][0]["embedding"]

async def get_database_context() -> str:
  """Get current database context and available data sources"""
  try:
    # Get database statistics from the API
    async with httpx.AsyncClient(timeout=10) as cli:
      response = await cli.get(f"{API_BASE}/api/database/stats")
      
      if response.status_code == 200:
        stats = response.json()
        
        # Format available data sources
        data_sources = []
        for source in stats.get('available_sources', []):
          data_sources.append(f"- {source['name']}: {source['count']} {source['type']}s")
        
        context = f"""Available Data Sources ({stats['summary']['data_sources']} total):
{chr(10).join(data_sources)}

Database Status: {stats['summary']['database_status']}
Total Objects: {stats['summary']['data_objects']}

Collections:
- Files: {stats['collections']['files']}
- Folders: {stats['collections']['folders']}
- Production Records: {stats['collections']['production_records']}
- Users: {stats['collections']['users']}
- Recent Uploads: {stats['collections']['recent_uploads']}"""
        
        return context
        
  except Exception as e:
    print(f"Failed to get database context: {e}")
  
  # Fallback context
  return """Available Data Sources:
- Documents: Various document types
- Production Data: Oil and gas production timeseries
- File Management: Uploaded files and folders

Note: Database connection unavailable - using fallback data"""

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


def build_prompt(question:str, chunks:list[dict], db_context: str = "")->str:
  ctx = "\n\n".join([f"[{i+1}] file_id={c['file_id']} page={c['page']} section={c['section']}\n{c['text']}"
                     for i,c in enumerate(chunks)])
  
  base_prompt = (
    "Answer using the CONTEXT and DATABASE INFO. If insufficient, mention available data sources. "
    "Append a JSON array 'citations' with items {file_id,page,section}.\n\n"
  )
  
  if db_context:
    base_prompt += f"DATABASE INFO:\n{db_context}\n\n"
  
  if ctx:
    base_prompt += f"CONTEXT:\n{ctx}\n\n"
  else:
    base_prompt += "No specific documents found. Refer to available data sources.\n\n"
  
  base_prompt += f"QUESTION: {question}\nANSWER:"
  
  return base_prompt

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


# ---------- Enhanced WebSocket with Agno Integration ----------
@app.websocket("/ws")
async def ws(ws: WebSocket):
  await ws.accept()
  hb = asyncio.create_task(_heartbeat(ws))
  try:
    while True:
      raw = await ws.receive_text()
      msg = json.loads(raw)
      original_query = msg["query"]
      tenant = msg.get("tenant_id", "demo")
      fid = msg.get("file_id")

      # 🤖 STEP 1: Agno Prompt Enhancement with Database Context
      await ws.send_text(json.dumps({"type":"agno_status", "payload":"Enhancing your query with AI and database context...", "stage":"prompt_enhancement"}))
      
      # Get current database context
      db_context = await get_database_context()
      enhanced_context = f"User is querying a document management system. {db_context}"
      
      enhanced_query, prompt_metadata = await agno_enhance_prompt(original_query, enhanced_context)
      
      if prompt_metadata["agno_enhanced"]:
        await ws.send_text(json.dumps({
          "type":"agno_enhancement", 
          "payload":{
            "original": original_query,
            "enhanced": enhanced_query,
            "confidence": prompt_metadata["confidence"],
            "reasoning": prompt_metadata["reasoning"][:200] + "..." if len(prompt_metadata["reasoning"]) > 200 else prompt_metadata["reasoning"]
          }
        }))
      
      # Use enhanced query for retrieval
      query_for_search = enhanced_query

      # 🔍 STEP 2: Document Retrieval (existing logic)
      await ws.send_text(json.dumps({"type":"agno_status", "payload":"Searching relevant documents...", "stage":"retrieval"}))
      
      q_emb = await embed(query_for_search)
      hits = search_chunks(tenant, q_emb, 8, fid)
      await ws.send_text(json.dumps({"type":"result","payload":{"objects":[
        {"text":h["text"], "meta":{"file_id":str(h["file_id"]),"page":h["page"],"section":h["section"]}}
      for h in hits]}}))

      # 📊 STEP 3: Response Planning (existing logic)
      await ws.send_text(json.dumps({"type":"agno_status", "payload":"Planning optimal response format...", "stage":"planning"}))
      
      p = await plan(query_for_search, hits)
      
      initial_response = ""
      response_type = "text"

      if p.get("type") == "tool":
        await ws.send_text(json.dumps({"type":"agno_status", "payload":"Executing data analysis tools...", "stage":"tool_execution"}))
        out = await execute_tool(p)
        
        if out.get("type") == "viz":
          await ws.send_text(json.dumps({"type":"viz","payload":out}))
          initial_response = f"Generated visualization: {out.get('title', 'Data Chart')}"
          response_type = "viz"
        elif out.get("type") == "table":
          await ws.send_text(json.dumps({"type":"table","payload":out}))
          initial_response = f"Generated data table with {len(out.get('rows', []))} rows"
          response_type = "table"
        else:
          initial_response = out.get("text", "Tool execution completed")
          await ws.send_text(json.dumps({"type":"answer","payload":initial_response}))
          
      elif p.get("type") == "viz":
        await ws.send_text(json.dumps({"type":"viz","payload":p}))
        initial_response = f"Generated visualization: {p.get('title', 'Data Chart')}"
        response_type = "viz"
      elif p.get("type") == "table":
        await ws.send_text(json.dumps({"type":"table","payload":p}))
        initial_response = f"Generated data table"
        response_type = "table"
      else:
        # Generate text response
        await ws.send_text(json.dumps({"type":"agno_status", "payload":"Generating contextual answer...", "stage":"generation"}))
        initial_response = await llm_generate(build_prompt(query_for_search, hits, db_context))
        await ws.send_text(json.dumps({"type":"answer","payload":initial_response}))

      # 🎯 STEP 4: Agno Response Evaluation & Enhancement
      if initial_response and response_type == "text":
        await ws.send_text(json.dumps({"type":"agno_status", "payload":"Optimizing response quality...", "stage":"response_evaluation"}))
        
        enhanced_response, response_metadata = await agno_evaluate_response(initial_response, original_query)
        
        if response_metadata["agno_evaluated"] and enhanced_response != initial_response:
          # Send the enhanced response
          await ws.send_text(json.dumps({"type":"answer_enhanced","payload":enhanced_response}))
          
          # Send evaluation insights
          await ws.send_text(json.dumps({
            "type":"agno_evaluation",
            "payload":{
              "improvements_made": True,
              "confidence": response_metadata["confidence"],
              "reasoning": response_metadata["reasoning"][:200] + "..." if len(response_metadata["reasoning"]) > 200 else response_metadata["reasoning"],
              "suggestions": response_metadata["suggestions"][:3]  # Show top 3 suggestions
            }
          }))
      
      # Final status
      await ws.send_text(json.dumps({"type":"agno_status", "payload":"Response complete!", "stage":"complete"}))
      
  except WebSocketDisconnect:
    hb.cancel()
    return

async def _heartbeat(ws:WebSocket):
  while True:
    await asyncio.sleep(60)
    await ws.send_text(json.dumps({"type":"heartbeat"}))

if __name__ == "__main__":
  import uvicorn
  chat_port = int(os.getenv("CHAT_PORT", 8000))
  uvicorn.run(app, host="0.0.0.0", port=chat_port)
