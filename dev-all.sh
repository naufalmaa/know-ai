#!/usr/bin/env bash
set -Eeuo pipefail

# ---------- Paths ----------
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS="$ROOT/logs"
PIDS="$ROOT/pids"
mkdir -p "$LOGS" "$PIDS"

# ---------- Load .env (export all) ----------
if [ -f "$ROOT/.env" ]; then set -a; . "$ROOT/.env"; set +a; fi

# ---------- Windows venv helpers ----------
if [[ -x "$ROOT/.venv/Scripts/python.exe" ]]; then
  PY="$ROOT/.venv/Scripts/python.exe"
  UVICORN="$ROOT/.venv/Scripts/uvicorn.exe"
  LITELLM_CLI="$ROOT/.venv/Scripts/litellm.exe"
else
  PY="${PYTHON:-python}"
  UVICORN="${UVICORN:-uvicorn}"
  LITELLM_CLI="${LITELLM_CLI:-litellm}"
fi

export PYTHONIOENCODING="UTF-8"

# ---------- Ports (semua ikut .env) ----------
# MinIO
PORT_MINIO="${MINIO_PORT:-9000}"
PORT_MINIO_CONSOLE="${MINIO_CONSOLE_PORT:-9001}"
MINIO_DATA="${MINIO_DATA_DIR:-$ROOT/.minio-data}"

# Fastify API
PORT_API="${FASTIFY_PORT:-4000}"

# Python services
PORT_INGEST="${INGEST_PORT:-9009}"
PORT_CHAT="${CHAT_PORT:-8000}"

# LiteLLM: ambil dari LITELLM_BASE (fallback 4001)
LITELLM_BASE_EFFECTIVE="${LITELLM_BASE:-http://127.0.0.1:4001}"
PORT_LITELLM="${LITELLM_PORT:-$(echo "$LITELLM_BASE_EFFECTIVE" | sed -E 's|^[^:]+://[^:/]+:([0-9]+).*|\1|;t; s|.*|4001|')}"

# Next dev port
PORT_WEB="${PORT_WEB:-3000}"

# ---------- Helpers ----------
run_bg () {
  local name="$1"; shift
  local log="$LOGS/$name.log"
  echo "▶ start $name"
  # shellcheck disable=SC2086
  "$@" >> "$log" 2>&1 &
  local pid=$!
  echo "  pid=$pid  log=$log"
  echo "$pid" > "$PIDS/$name.pid"
  sleep 0.6
}

http_code () {
  local url="$1"
  curl -L -s -o /dev/null -m 2 -w "%{http_code}" "$url" || echo "000"
}

wait_ready () {
  local name="$1" url="$2" max="${3:-60}"
  echo -n "⏳ wait $name @ $url "
  local t=0 code
  while (( t < max )); do
    code="$(http_code "$url")"
    if [[ "$code" != "000" ]]; then
      echo "→ $code (ready)"
      return 0
    fi
    sleep 1; ((t++))
  done
  echo "→ timeout ($max s)"
  return 1
}

echo "Launching services… logs/*  pids/*"

# ---------- MinIO (opsional; jalan jika binary tersedia) ----------
if command -v minio >/dev/null 2>&1; then
  mkdir -p "$MINIO_DATA"
  run_bg "minio" minio server "$MINIO_DATA" --address ":$PORT_MINIO" --console-address ":$PORT_MINIO_CONSOLE"
  wait_ready "minio" "http://127.0.0.1:$PORT_MINIO/minio/health/ready" 90 || true
  echo "✓ MinIO ready: http://127.0.0.1:$PORT_MINIO  (Console: http://127.0.0.1:$PORT_MINIO_CONSOLE)"
  if command -v mc >/dev/null 2>&1; then
    mc alias set local "http://127.0.0.1:$PORT_MINIO" "${MINIO_ROOT_USER:-minioadmin}" "${MINIO_ROOT_PASSWORD:-minioadmin}" >/dev/null 2>&1 || true
    mc mb --ignore-existing local/${S3_BUCKET_RAW:-know-ai-raw} >/dev/null 2>&1 || true
    mc mb --ignore-existing local/${S3_BUCKET_DERIVED:-know-ai-derived} >/dev/null 2>&1 || true
    echo "✓ MinIO buckets ensured: ${S3_BUCKET_RAW:-know-ai-raw}, ${S3_BUCKET_DERIVED:-know-ai-derived}"
  fi
else
  echo "ℹ️  'minio' tidak ada di PATH → lewati. (Set S3_ENDPOINT ke MinIO/ S3 yang sudah ada.)"
fi

# ---------- LiteLLM Proxy ----------
if [[ -x "$LITELLM_CLI" ]]; then
  run_bg "litellm" "$LITELLM_CLI" --config "$ROOT/litellm.yaml" --host 127.0.0.1 --port "$PORT_LITELLM"
else
  echo "❌ litellm CLI tidak ditemukan. Install di venv: $PY -m pip install 'litellm[proxy]'"
  exit 1
fi

# ---------- Ingest (FastAPI) ----------
run_bg "ingest" "$PY" -m uvicorn services.ingest.main:app --host 0.0.0.0 --port "$PORT_INGEST" --reload

# ---------- Chat (FastAPI) ----------
run_bg "chat" "$PY" -m uvicorn services.chat.app:app --host 0.0.0.0 --port "$PORT_CHAT" --reload

# ---------- API (Fastify) ----------
run_bg "api" pnpm -C "$ROOT/apps/api" dev

# ---------- Web (Next.js) → paksa port .env ----------
run_bg "web" bash -lc "cd '$ROOT/apps/web' && PORT=$PORT_WEB pnpm dev"

echo
echo "Waiting for readiness (non-blocking fail)…"
wait_ready "litellm" "http://127.0.0.1:$PORT_LITELLM/" 60 || true
wait_ready "ingest"  "http://127.0.0.1:$PORT_INGEST/docs" 60 || true
wait_ready "chat"    "http://127.0.0.1:$PORT_CHAT/docs" 60 || true
wait_ready "api"     "http://127.0.0.1:$PORT_API/api/health" 60 || true
wait_ready "web"     "http://127.0.0.1:$PORT_WEB" 90 || true

echo
echo "URLs:"
echo "  MinIO Console  → http://127.0.0.1:$PORT_MINIO_CONSOLE"
echo "  LiteLLM Base   → http://127.0.0.1:$PORT_LITELLM/    (OLLAMA_BASE=${OLLAMA_BASE:-unset})"
echo "  Ingest Docs    → http://127.0.0.1:$PORT_INGEST/docs"
echo "  Chat Docs      → http://127.0.0.1:$PORT_CHAT/docs"
echo "  API (health)   → http://127.0.0.1:$PORT_API/api/health"
echo "  Web (landing)  → http://127.0.0.1:$PORT_WEB/"
echo
echo "Tips: kalau ada yang belum ready, cek logs/<service>.log"
