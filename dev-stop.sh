#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS="$ROOT/logs"
PIDS="$ROOT/pids"

kill_pid () {
  local file="$1"
  [[ -f "$file" ]] || return 0
  local pid
  pid="$(cat "$file" || true)"
  if [[ -n "${pid:-}" ]]; then
    # Windows (Git Bash) pakai taskkill agar ikut matikan child
    if command -v taskkill >/dev/null 2>&1; then
      taskkill //PID "$pid" //F >/dev/null 2>&1 || true
    else
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
  fi
  rm -f "$file"
}

echo "Stopping services…"

for n in web api chat ingest litellm minio; do
  kill_pid "$PIDS/$n.pid"
done

# Tambahan: bunuh proses sisa di port umum (Windows)
cleanup_port () {
  local port="$1"
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "
      \$pids = (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
               Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique)
      foreach (\$p in \$pids) { Stop-Process -Id \$p -Force -ErrorAction SilentlyContinue }
    " >/dev/null 2>&1 || true
  fi
}

# Kalau perlu, bersihkan port-port ini
for port in 3000 4000 8000 9000 9001 9009; do
  cleanup_port "$port"
done

echo "Stopped. (cek juga folder logs/ bila ingin melihat sisa log)"
