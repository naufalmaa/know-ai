export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
export const api = (path: string) => `${API_BASE}${path}`;   // kalau BASE kosong → relative
export const fetcher = (u: string) => fetch(u).then(r => {
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
});
export const WS_URL = process.env.NEXT_PUBLIC_CHAT_WS || "ws://127.0.0.1:8000/ws";
