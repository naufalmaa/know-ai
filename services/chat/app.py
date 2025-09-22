import os, json, asyncio, httpx, re
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import sys
import os
import httpx
import json
import re
import asyncio
sys.path.append(os.path.dirname(__file__))
from pg_client import search_chunks
from zara_verificator import get_verificator

# Enhanced LiteLLM integration
try:
    from litellm import completion
    LITELLM_AVAILABLE = True
    print("✅ LiteLLM library available for streaming support")
except ImportError:
    LITELLM_AVAILABLE = False
    print("⚠️  LiteLLM library not available, using HTTP API only")

# Load .env from project root
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

app = FastAPI()

# Add health endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "chat",
        "version": "1.0.0",
        "models": {
            "embed": EMBED_MODEL,
            "generation": GEN_MODEL
        },
        "dependencies": {
            "litellm": LITELLM_AVAILABLE,
            "ollama_base": OLLAMA_BASE,
            "agno_base": AGNO_BASE
        }
    }

LITELLM_BASE = os.environ["LITELLM_BASE"]
LITELLM_API_KEY = os.getenv("LITELLM_API_KEY", "sk")
EMBED_MODEL = os.getenv("RAG_EMBED_MODEL", "mxbai-embed-large:latest")
GEN_MODEL = os.getenv("RAG_GENERATION_MODEL", "deepseek-r1:14b")
OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://117.54.250.177:5162")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")   # optional fail-safe
API_BASE = os.getenv("API_BASE", "http://127.0.0.1:4000")
AGNO_BASE = os.getenv("AGNO_BASE", "http://127.0.0.1:9010")
# Initialize Zara Verificator
verificator = get_verificator(LITELLM_BASE)

# === Enhanced Streaming Functions for Thought Process ===

async def stream_thought_stage(websocket: WebSocket, stage: str, message: str, status: str = "processing"):
    """Stream individual thought process stages"""
    await websocket.send_text(json.dumps({
        "type": "agno_status",
        "payload": message,
        "stage": stage,
        "status": status
    }))

async def handle_fast_response(websocket: WebSocket, intent: str, message: str):
    """Handle fast responses for trivial queries"""
    # Send classification status
    await websocket.send_text(json.dumps({
        "type": "agno_status",
        "payload": "simple",
        "stage": "classify"
    }))
    
    # Send generation status
    await websocket.send_text(json.dumps({
        "type": "agno_status",
        "payload": "drafting answer",
        "stage": "generate"
    }))
    
    print(f"🚀 Fast response triggered for intent: {intent}")
    
    # Send direct answer (no streaming for fast responses)
    await websocket.send_text(json.dumps({
        "type": "answer",
        "payload": message
    }))
    
    # Send completion status
    await websocket.send_text(json.dumps({
        "type": "agno_status",
        "payload": "success",
        "stage": "done"
    }))

# === Enhanced LiteLLM Streaming Functions ===

async def llm_generate_stream(prompt: str, websocket: WebSocket = None):
    """Generate streaming response using LiteLLM with Ollama backend"""
    if LITELLM_AVAILABLE:
        try:
            # Use direct LiteLLM library for streaming (preferred method)
            response = completion(
                model=f"ollama_chat/{GEN_MODEL}",
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                api_base=OLLAMA_BASE
            )
            
            full_response = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    if websocket:
                        await websocket.send_text(json.dumps({
                            "type": "stream_chunk",
                            "payload": content
                        }))
            
            return full_response
            
        except Exception as e:
            print(f"LiteLLM streaming failed: {e}, falling back to HTTP API")
    
    # Fallback to HTTP API streaming
    try:
        async with httpx.AsyncClient(timeout=120) as cli:
            async with cli.stream(
                "POST",
                f"{LITELLM_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
                json={
                    "model": GEN_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": True
                }
            ) as response:
                response.raise_for_status()
                
                full_response = ""
                async for line in response.aiter_lines():
                    if line.startswith("data: ") and not line.endswith("[DONE]"):
                        try:
                            chunk_data = json.loads(line[6:])
                            content = chunk_data["choices"][0]["delta"].get("content", "")
                            if content:
                                full_response += content
                                if websocket:
                                    await websocket.send_text(json.dumps({
                                        "type": "stream_chunk",
                                        "payload": content
                                    }))
                        except (json.JSONDecodeError, KeyError):
                            continue
                
                return full_response
                
    except Exception as e:
        print(f"HTTP streaming failed: {e}, falling back to non-streaming")
        # Final fallback to non-streaming
        return await llm_generate(prompt)

async def llm_generate(prompt: str) -> str:
    """Generate non-streaming response using LiteLLM"""
    if LITELLM_AVAILABLE:
        try:
            response = completion(
                model=f"ollama_chat/{GEN_MODEL}",
                messages=[{"role": "user", "content": prompt}],
                stream=False,
                api_base=OLLAMA_BASE
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"LiteLLM generation failed: {e}, falling back to HTTP API")
    
    # Fallback to HTTP API
    try:
        async with httpx.AsyncClient(timeout=120) as cli:
            r = await cli.post(f"{LITELLM_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
                json={"model": GEN_MODEL, "messages":[{"role":"user","content": prompt}]})
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]
    except Exception:
        if not OPENAI_API_KEY: 
            raise
        # Final fallback to OpenAI
        async with httpx.AsyncClient(timeout=120) as cli:
            r = await cli.post("https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                json={"model":"gpt-5-nano","messages":[{"role":"user","content": prompt}]})
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]

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


# ---------- Enhanced WebSocket with Zara Smart Routing ----------
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
      user_mode = msg.get("mode", "enhanced")  # Get mode from message

      # Send user message confirmation
      await ws.send_text(json.dumps({
          "type": "user",
          "payload": original_query
      }))
      
      # Check if user wants simple mode (query, visualization, or normal without enhancement)
      if user_mode in ["query", "visualization", "normal"]:
        # Simple mode: Direct response without Agno enhancement
        await stream_thought_stage(ws, "received", "Message received", "processing")
        await stream_thought_stage(ws, "classify", f"Mode: {user_mode} (fast response)", "complete")
        
        # Quick document retrieval for context (all simple modes need database context)
        hits = []
        await stream_thought_stage(ws, "retrieve", "Searching database for context...", "processing")
        try:
          q_emb = await embed(original_query)
          hits = search_chunks(tenant, q_emb, 6 if user_mode == "normal" else 4, fid)  # Normal mode gets more context
          
          # Send search results with filenames included
          if hits:
              await ws.send_text(json.dumps({"type":"result","payload":{"objects":[
                {"text":h["text"], "meta":{"file_id":str(h["file_id"]),"filename":str(h.get("filename", h["file_id"])),"page":h["page"],"section":h["section"]}}
              for h in hits[:5 if user_mode == "normal" else 3]]}}))
              await stream_thought_stage(ws, "retrieve", f"Found {len(hits)} relevant sources with filenames", "complete")
          else:
              await stream_thought_stage(ws, "retrieve", "No documents found, using general knowledge", "complete")
        except Exception as e:
          print(f"Document search failed: {e}")
          await stream_thought_stage(ws, "retrieve", "Using fallback mode", "complete")
        
        # Direct response generation via Agno simple endpoint
        await stream_thought_stage(ws, "generate", "Generating fast response...", "processing")
        
        # Try Agno simple response first
        try:
          async with httpx.AsyncClient(timeout=30) as cli:
            agno_response = await cli.post(f"{AGNO_BASE}/agent/simple-response",
              json={
                "query": original_query,
                "mode": user_mode,
                "context": await get_database_context(),
                "sources": [{"file_id": h["file_id"], "filename": h.get("filename", h["file_id"])} for h in hits[:3]]
              })
            
            if agno_response.status_code == 200:
              agno_data = agno_response.json()
              if agno_data.get("success"):
                response_text = agno_data["response"]
                await ws.send_text(json.dumps({
                    "type": "answer",
                    "payload": response_text
                }))
                await stream_thought_stage(ws, "done", "Fast response complete", "complete")
                continue
              
        except Exception as e:
          print(f"Agno simple response failed: {e}, falling back to local generation")
        
        # Generate response based on mode - normal mode gets more database context but no enhancement
        if user_mode == "normal":
          # Normal mode: Direct response with rich database context, bypasses Agno enhancement
          simple_prompt = build_prompt(original_query, hits[:5], await get_database_context())  # More context for normal mode
        elif user_mode == "visualization":
          simple_prompt = f"User asks: {original_query}\n\nProvide a visualization-focused response. If data is requested, suggest charts or graphs. Be concise."
        else:  # query mode
          simple_prompt = build_prompt(original_query, hits[:3])  # Use fewer chunks for speed
        
        # Direct answer without streaming for speed
        response_text = await llm_generate(simple_prompt)
        
        await ws.send_text(json.dumps({
            "type": "answer",
            "payload": response_text
        }))
        
        await stream_thought_stage(ws, "done", "Response complete", "complete")
        continue
      
      # Enhanced mode: Full pipeline with Agno enhancement
      # ... existing code ...
      # 🧠 STEP 0: Initial status
      await stream_thought_stage(ws, "received", "Message received", "processing")
      
      route_decision = await verificator.verify_and_route(original_query)
      
      await stream_thought_stage(ws, "classify", 
                                f"Intent: {route_decision.intent} (confidence: {route_decision.confidence:.1%})", 
                                "complete")
      
      # Handle fast responses for trivial queries
      print(f"🔍 Route decision: {route_decision.intent}, needs_retrieval: {route_decision.needs_retrieval}, needs_improvement: {route_decision.needs_improvement}")
      
      if not route_decision.needs_retrieval and not route_decision.needs_improvement:
        print(f"✨ Fast response triggered for: {original_query}")
        fast_response = verificator.get_fast_response(route_decision.intent)
        await handle_fast_response(ws, route_decision.intent, fast_response)
        continue

      # 🤖 STEP 1: Agno Prompt Enhancement (only if needed)
      enhanced_query = original_query
      if route_decision.needs_improvement:
        await stream_thought_stage(ws, "enhance", "Enhancing your question with AI...", "processing")
        
        # Get current database context
        db_context = await get_database_context()
        enhanced_context = f"User is querying Zara AI Knowledge Navigator. {db_context}"
        
        enhanced_query, prompt_metadata = await agno_enhance_prompt(original_query, enhanced_context)
        
        if prompt_metadata["agno_enhanced"]:
          await ws.send_text(json.dumps({
              "type": "agno_enhancement",
              "payload": {
                  "original": original_query,
                  "enhanced": enhanced_query,
                  "confidence": prompt_metadata["confidence"],
                  "reasoning": prompt_metadata["reasoning"]
              }
          }))
          await stream_thought_stage(ws, "enhance", 
                                    f"Enhanced query (confidence: {prompt_metadata['confidence']:.1%})", 
                                    "complete")
        else:
          await stream_thought_stage(ws, "enhance", "Using original query", "complete")

      # 🔍 STEP 2: Document Retrieval (only if needed)
      hits = []
      if route_decision.needs_retrieval:
        await stream_thought_stage(ws, "retrieve", "Searching your documents...", "processing")
        
        q_emb = await embed(enhanced_query)
        hits = search_chunks(tenant, q_emb, 8, fid)
        
        await ws.send_text(json.dumps({"type":"result","payload":{"objects":[
          {"text":h["text"], "meta":{"file_id":str(h["file_id"]),"filename":str(h.get("filename", h["file_id"])),"page":h["page"],"section":h["section"]}}
        for h in hits]}}))
        
        await stream_thought_stage(ws, "retrieve", 
                                  f"Found {len(hits)} relevant document sections", 
                                  "complete")

      # 📊 STEP 3: Response Planning
      await stream_thought_stage(ws, "format", "Planning the best response format...", "processing")
      
      p = await plan(enhanced_query, hits)
      
      await stream_thought_stage(ws, "format", 
                                f"Response type: {p.get('type', 'text')}", 
                                "complete")
      
      # 🚀 STEP 4: Generate Response
      if p.get("type") == "tool":
        await stream_thought_stage(ws, "generate", "Running data analysis...", "processing")
        out = await execute_tool(p)
        
        if out.get("type") == "viz":
          await ws.send_text(json.dumps({"type":"viz","payload":out}))
          await stream_thought_stage(ws, "deliver", "Visualization created", "complete")
        elif out.get("type") == "table":
          await ws.send_text(json.dumps({"type":"table","payload":out}))
          await stream_thought_stage(ws, "deliver", "Data table generated", "complete")
        else:
          # Send answer for tool results that are text
          await ws.send_text(json.dumps({
              "type": "answer",
              "payload": out.get("text", "Analysis completed.")
          }))
          await stream_thought_stage(ws, "deliver", "Response complete", "complete")
          
      elif p.get("type") == "viz":
        await ws.send_text(json.dumps({"type":"viz","payload":p}))
        await stream_thought_stage(ws, "deliver", "Visualization ready", "complete")
      elif p.get("type") == "table":
        await ws.send_text(json.dumps({"type":"table","payload":p}))
        await stream_thought_stage(ws, "deliver", "Table ready", "complete")
      else:
        # Generate streaming text response
        await stream_thought_stage(ws, "generate", "Crafting your answer...", "processing")
        
        # Decide whether to stream or send direct answer
        use_streaming = len(hits) > 3 or len(enhanced_query) > 100  # Stream for complex queries
        
        if use_streaming:
          # Start streaming response
          await ws.send_text(json.dumps({"type": "stream_start", "payload": {}}))
          
          response_text = await llm_generate_stream(
            build_prompt(enhanced_query, hits, await get_database_context()), 
            websocket=ws
          )
          
          await ws.send_text(json.dumps({"type": "stream_end", "payload": {}}))
        else:
          # Send direct answer for simple queries
          response_text = await llm_generate(
            build_prompt(enhanced_query, hits, await get_database_context())
          )
          
          await ws.send_text(json.dumps({
              "type": "answer",
              "payload": response_text
          }))
        
        await stream_thought_stage(ws, "generate", "Response complete", "complete")
        
        # 🎯 STEP 5: Response Enhancement (only for complex queries)
        if route_decision.needs_improvement and response_text:
          await stream_thought_stage(ws, "evaluate", "Optimizing response quality...", "processing")
          
          enhanced_response, response_metadata = await agno_evaluate_response(response_text, original_query)
          
          if response_metadata["agno_evaluated"]:
            await ws.send_text(json.dumps({
                "type": "agno_evaluation",
                "payload": {
                    "improvements_made": enhanced_response != response_text,
                    "confidence": response_metadata["confidence"],
                    "reasoning": response_metadata["reasoning"],
                    "suggestions": response_metadata.get("suggestions", [])
                }
            }))
            
            if enhanced_response != response_text:
              await ws.send_text(json.dumps({
                  "type": "answer_enhanced",
                  "payload": enhanced_response
              }))
              await stream_thought_stage(ws, "evaluate", "Response enhanced", "complete")
            else:
              await stream_thought_stage(ws, "evaluate", "Response quality verified", "complete")
      
      # Final completion status
      await stream_thought_stage(ws, "done", "success", "complete")
      
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
