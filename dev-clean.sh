#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
rm -f "$ROOT"/logs/*.log 2>/dev/null || true
echo "Logs cleared."
