import io, os, httpx, numpy as np, matplotlib.pyplot as plt
from fastapi import FastAPI, HTTPException, Response
import lasio
from obspy import read

app = FastAPI()

@app.get("/las/curve-json")
async def las_curve_json(url:str):
  # Download LAS from signed URL / public URL
  async with httpx.AsyncClient(timeout=60) as cli:
    r = await cli.get(url)
    if r.status_code!=200: raise HTTPException(502, f"LAS GET failed: {r.text}")
    content = r.text
  las = lasio.read(io.StringIO(content))
  # Return top 3 curves (depth + first 2 logs) as arrays
  curves = [c.mnemonic for c in las.curves]
  depth = las.index if hasattr(las,'index') else las.depth_m
  result = { "curves": curves, "sampled": {} }
  keep = curves[:3]
  for k in keep:
    v = np.asarray(las[k]).astype(float).tolist()
    result["sampled"][k] = v[:2000]  # limit payload
  result["depth"] = np.asarray(depth).astype(float).tolist()[:2000]
  return result

@app.get("/segy/quicklook.png")
async def segy_quicklook(url:str):
  # Download SEG-Y to memory -> write to tmpfile for obspy
  async with httpx.AsyncClient(timeout=120) as cli:
    r = await cli.get(url)
    if r.status_code!=200: raise HTTPException(502,f"SEGY GET failed: {r.text}")
    raw = r.content
  buf = io.BytesIO(raw)
  # Obspy needs a file-like with name or on disk
  with open("tmp.segy","wb") as f: f.write(buf.getbuffer())
  st = read("tmp.segy", format="SEGY")
  os.remove("tmp.segy")
  tr = st.traces[:200]  # sample
  data = np.stack([t.data for t in tr]).T  # samples x traces

  # Quicklook: variable density image
  fig, ax = plt.subplots(figsize=(6,4), dpi=150)
  ax.imshow(data, cmap="gray", aspect="auto", interpolation="nearest")
  ax.set_title("SEG-Y Quicklook")
  ax.set_xlabel("Traces"); ax.set_ylabel("Samples")
  out = io.BytesIO(); plt.tight_layout(); plt.savefig(out, format="png"); plt.close(fig); out.seek(0)
  return Response(out.read(), media_type="image/png")
