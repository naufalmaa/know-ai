import os, httpx, weaviate, json
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

WEAVIATE_URL=os.environ["WEAVIATE_URL"]
LITELLM_BASE=os.environ["LITELLM_BASE"]
GEN_MODEL=os.environ.get("RAG_GENERATION_MODEL","deepseek-r1:14b")

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

async def generate_answer(question:str, contexts:list[dict]):
    sys = "Answer using only the provided CONTEXT. Cite file_id and page for each claim."
    ctx = "\n\n".join([f"[{i}] (file={c['meta']['file_id']} p={c['meta']['page']} sec={c['meta']['section']}) {c['text']}"
                       for i,c in enumerate(contexts, start=1)])
    prompt = f"{sys}\n\nCONTEXT:\n{ctx}\n\nQUESTION: {question}\n\nFORMAT: Answer then JSON array of citations as {{file_id,page,section}}."
    async with httpx.AsyncClient(timeout=120) as cli:
        r = await cli.post(f"{LITELLM_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {os.getenv('LITELLM_API_KEY','sk')}" },
            json={"model": GEN_MODEL, "messages":[{"role":"user","content":prompt}]}
        )
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
    # naive parse citations (pattern) — harden in prod
    return content
