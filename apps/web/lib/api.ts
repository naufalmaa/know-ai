// API Base URL configuration
// In development, defaults to localhost:4000 if not set
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:4000';

export function api(path: string) {
  if (!path.startsWith('/')) path = `/${path}`;
  return `${API_BASE}${path}`;
}

// Fetcher for use with SWR
export const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
});

// WebSocket URL for chat functionality
export const WS_URL = process.env.NEXT_PUBLIC_CHAT_WS || "ws://127.0.0.1:8000/ws";

// Export API_BASE for external use
export { API_BASE };
