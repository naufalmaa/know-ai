import re

def chunk_markdown(md: str, window_sent: int = 5, overlap: int = 1):
  """Very simple, robust sentence chunking w/ overlap."""
  sents = re.split(r'(?<=[.!?])\s+', md.strip())
  chunks, idx = [], 0
  step = max(1, window_sent - overlap)
  for i in range(0, len(sents), step):
    span = sents[i:i+window_sent]
    if not span: break
    text = " ".join(span)
    chunks.append({"idx": idx, "text": text, "page": 0, "section": f"chunk-{idx}"})
    idx += 1
  return chunks
