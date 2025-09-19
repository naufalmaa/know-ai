import os, weaviate
from weaviate.classes.config import Property, DataType, Configure
from weaviate.util import generate_uuid5
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env")  # load .env dari root repo

WEAVIATE_URL = os.getenv("WEAVIATE_URL", "http://127.0.0.1:8080")
API_KEY = os.getenv("WEAVIATE_API_KEY")

def client():
  if API_KEY:
    # cloud/self-host secured → pakai custom/cloud sesuai setup-mu
    from urllib.parse import urlparse
    u = urlparse(WEAVIATE_URL)
    host = u.hostname or "127.0.0.1"
    port = u.port or 8080
    return weaviate.connect_to_custom(
      http_host=host, http_port=port, grpc_host=host, grpc_port=50051,
      http_secure=u.scheme == "https", grpc_secure=u.scheme == "https",
      auth_credentials=weaviate.AuthApiKey(API_KEY)
    )
  # lokal default
  try:
    return weaviate.connect_to_local()
  except Exception:
    from urllib.parse import urlparse
    u = urlparse(WEAVIATE_URL)
    host = u.hostname or "127.0.0.1"
    port = u.port or 8080
    return weaviate.connect_to_custom(
      http_host=host, http_port=port, grpc_host=host, grpc_port=50051,
      http_secure=False, grpc_secure=False
    )

def class_name(tenant_id: str) -> str:
  return f"DocChunk_{tenant_id.replace('-','_')}"

def ensure_collection(tenant_id: str):
  c = client()
  name = class_name(tenant_id)
  if not c.collections.exists(name):
    c.collections.create(
      name=name,
      vectorizer_config=Configure.Vectorizer.none(),
      properties=[
        Property(name="file_id", data_type=DataType.TEXT),
        Property(name="page", data_type=DataType.INT),
        Property(name="section", data_type=DataType.TEXT),
        Property(name="checksum", data_type=DataType.TEXT),
        Property(name="text", data_type=DataType.TEXT)
      ]
    )
  c.close()

# Embeddings via LiteLLM → Ollama
import httpx
LITELLM_BASE = os.environ["LITELLM_BASE"]
LITELLM_API_KEY = os.getenv("LITELLM_API_KEY","sk")
EMBED_MODEL = os.getenv("RAG_EMBED_MODEL","mxbai-embed-large:latest")

async def embed_texts(texts: list[str]) -> list[list[float]]:
  async with httpx.AsyncClient(timeout=60) as cli:
    r = await cli.post(f"{LITELLM_BASE}/embeddings",
      headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
      json={"model": EMBED_MODEL, "input": texts}
    )
    r.raise_for_status()
    data = r.json()
    return [e["embedding"] for e in data["data"]]

def upsert_batch(tenant_id, file_id, checksum, chunks, vectors=None):
  c = client()
  coll = c.collections.get(class_name(tenant_id))
  with coll.batch.dynamic() as batch:
    for i, ch in enumerate(chunks):
      uid = generate_uuid5(f"{file_id}:{checksum}:{ch['idx']}")
      batch.add_object(
        uuid=uid,
        properties={
          "file_id": file_id,
          "page": ch.get("page", 0),
          "section": ch.get("section"),
          "checksum": checksum,
          "text": ch["text"]
        },
        vector = None if vectors is None else vectors[i]
      )
  c.close()
