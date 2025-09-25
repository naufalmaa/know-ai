1. start minio -> ./setup-test/start-minio.ps1
2. start litellm -> litellm --config litellm.yaml --port 4001
3. start API -> pnpm -C apps/api i
                pnpm -C apps/api dev
4. start ingestor -> uvicorn services.ingest.main:app --port 9009 --reload --env-file .env
5. start chat -> uvicorn services.chat.app:app --port 8000 --reload --env-file .env
5.5 start ai assistant via streamlit -> streamlit run apps/assistant-streamlit/app-enhanced.py --server.address=0.0.0.0 --server.port=8501
6. start agno (AI agents) -> uvicorn services.agno.main:app --port 9010 --reload --env-file .env
7. start web -> pnpm -C apps/web i
                pnpm -C apps/web dev    

curl -L -X POST 'http://127.0.0.1:4001/key/generate' \
-H 'Authorization: Bearer sk-1234' \
-H 'Content-Type: application/json' \
-d '{}'