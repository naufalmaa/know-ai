# 1) Buat & aktifkan venv

python -m venv .venv

# Windows Git-Bash:
source .venv/Scripts/activate
# (PowerShell: .venv\Scripts\Activate.ps1)

# 2) Upgrade pip dan install deps python core
pip install -U pip
pip install -U fastapi "uvicorn[standard]" httpx weaviate-client pydantic python-dotenv "litellm[proxy]" websockets

# 3) Install deps Node
pnpm -C apps/api i
pnpm -C apps/web i

# 4) Tailwind (Next.js 15)
pnpm -C apps/web add -D @tailwindcss/postcss
# Pastikan apps/web/postcss.config.mjs pakai @tailwindcss/postcss (bukan "tailwindcss" langsung)

# 5) Hapus lockfile ganda kalau ada
rm -f apps/web/pnpm-lock.yaml

# 6) DB init
createdb know_ai
psql "$POSTGRES_URL" -f apps/api/src/sql/000_init.sql
