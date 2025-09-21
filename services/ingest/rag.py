import os, httpx, weaviate, json
from pathlib import Path
from dotenv import load_dotenv
try:
    from litellm import completion
    LITELLM_AVAILABLE = True
except ImportError:
    LITELLM_AVAILABLE = False

# Load .env from project root
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

WEAVIATE_URL=os.environ["WEAVIATE_URL"]
LITELLM_BASE=os.environ["LITELLM_BASE"]
OLLAMA_BASE=os.getenv("OLLAMA_BASE", "http://117.54.250.177:5162")
GEN_MODEL=os.environ.get("RAG_GENERATION_MODEL","deepseek-r1:14b")
AGNO_BASE = os.getenv("AGNO_BASE", "http://127.0.0.1:9010")

def client():
    return weaviate.connect_to_local(host=WEAVIATE_URL.replace("http://","").replace("https://",""))

async def retrieve(query:str, k:int=6):
    c=client()
    coll = c.collections.get("pdf_chunks")
    res = coll.query.near_text(query, limit=k, return_metadata=["distance"])
    hits=[]
    for o in res.objects:
        props=o.properties
        meta={"file_id":props["file_id"],"page":props["page"],"section":props["section"]}
        hits.append({"text":props["text"],"meta":meta,"_dist":o.metadata.distance})
    c.close()
    return hits

async def agno_enhanced_generate_answer(question: str, contexts: list[dict]) -> tuple[str, dict]:
  """Generate answer using Agno AI agent for enhanced RAG responses"""
  try:
    # Prepare context for Agno agent
    context_text = "\n\n".join([f"[{i}] (file={c['meta']['file_id']} p={c['meta']['page']} sec={c['meta']['section']}) {c['text']}"
                                 for i, c in enumerate(contexts, start=1)])
    
    # Use Agno's RAG Response Generation Agent
    async with httpx.AsyncClient(timeout=60) as cli:
      response = await cli.post(f"{AGNO_BASE}/agent/generate-rag-response",
        json={
          "question": question,
          "context": context_text,
          "domain": "document_analysis",
          "response_format": "detailed_with_citations",
          "quality_criteria": ["accuracy", "completeness", "cite_sources", "clarity"]
        })
      
      if response.status_code == 200:
        data = response.json()
        if data.get("success"):
          return data["processed_output"], {
            "agno_enhanced": True,
            "confidence": data.get("confidence_score", 0.0),
            "reasoning": data.get("reasoning", ""),
            "citations_validated": data.get("citations_validated", False)
          }
  
  except Exception as e:
    print(f"Agno RAG generation failed: {e}")
  
  # Fallback to original method
  return await generate_answer(question, contexts), {"agno_enhanced": False}

async def generate_answer(question: str, contexts: list[dict]) -> str:
  """Enhanced generate answer function with LiteLLM integration"""
  sys = "Answer using only the provided CONTEXT. Cite file_id and page for each claim."
  ctx = "\n\n".join([f"[{i}] (file={c['meta']['file_id']} p={c['meta']['page']} sec={c['meta']['section']}) {c['text']}"
                     for i, c in enumerate(contexts, start=1)])
  prompt = f"{sys}\n\nCONTEXT:\n{ctx}\n\nQUESTION: {question}\n\nFORMAT: Answer then JSON array of citations as {{file_id,page,section}}."
  
  # Try LiteLLM first if available
  if LITELLM_AVAILABLE:
    try:
      response = completion(
        model=f"ollama_chat/{GEN_MODEL.replace(':', '/')}",
        messages=[{"role": "user", "content": prompt}],
        stream=False,
        api_base=OLLAMA_BASE
      )
      return response.choices[0].message.content
    except Exception as e:
      print(f"LiteLLM generation failed: {e}, falling back to HTTP API")
  
  # Fallback to HTTP API
  async with httpx.AsyncClient(timeout=120) as cli:
    r = await cli.post(f"{LITELLM_BASE}/chat/completions",
        headers={"Authorization": f"Bearer {os.getenv('LITELLM_API_KEY','sk')}" },
        json={"model": GEN_MODEL, "messages":[{"role":"user","content":prompt}]}
    )
    r.raise_for_status()
    content = r.json()["choices"][0]["message"]["content"]
  return content
