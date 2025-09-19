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
psql "$POSTGRES_URL" -f apps/api/src/sql/001_pgvector.sql
psql "$POSTGRES_URL" -f apps/api/src/sql/001.5_metrics_example.sql
psql "$POSTGRES_URL" -f apps/api/src/sql/002_well_daily.sql

# Penjelasan script SQL lanjutan (wajib setelah 000_init.sql):
- 001_pgvector.sql → mengaktifkan ekstensi pgvector dan membuat tabel `doc_chunks` beserta index vektor untuk penyimpanan embedding dokumen yang dipakai dashboard saat melakukan retrieval & RAG terhadap file yang sudah diunggah.
- 001.5_metrics_example.sql → membuat tabel `production_timeseries` dan men-seed data produksi sintetis harian ~18 bulan agar grafik metrik demo memiliki sumber data bawaan.
- 002_well_daily.sql → membuat tabel operasional `well_daily` beserta index-nya, serta tabel geojson sederhana `geo_blocks` dan `geo_wells` yang menyuplai data time-series dan peta pada dashboard.

# Opsional: endpoint import bila ingin pakai data sendiri
- POST /api/admin/import/csv untuk memasukkan CSV produksi harian (sesuai kolom contoh) ke tabel `well_daily`.
- POST /api/admin/import/geojson untuk memuat GeoJSON blok / sumur ke tabel `geo_blocks` dan `geo_wells`.