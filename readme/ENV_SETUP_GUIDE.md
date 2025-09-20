# Environment Variables Configuration Guide

## Overview
This guide explains how to properly configure API keys and environment variables for the Know-AI project.

## File Structure
- **Root `.env` file**: `d:\Naufal\Working Folder\Project\SKK Migas_Prospektivitas\app-new\know-ai\.env`
- **Verification script**: `verify-env.py`

## How Environment Variables Are Loaded

### Python Services (Chat & Ingest)
All Python services now automatically load the `.env` file from the project root using:
```python
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env")
```

### Node.js API Service
The API service loads environment variables using:
```typescript
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })
```

### Next.js Web Application
The web app uses environment variables that start with `NEXT_PUBLIC_` and automatically loads them at build time.

## Key Environment Variables

### Database
- `POSTGRES_URL`: PostgreSQL connection string

### Service Ports
- `FASTIFY_PORT`: API service port (default: 4000)
- `INGEST_PORT`: Document ingestion service port (default: 9009)
- `CHAT_PORT`: Chat service port (default: 8000)
- `LITELLM_PORT`: LiteLLM proxy port (default: 4001)

### AI/ML Services
- `LITELLM_BASE`: LiteLLM proxy base URL
- `LITELLM_API_KEY`: API key for LiteLLM proxy
- `RAG_EMBED_MODEL`: Embedding model name
- `RAG_GENERATION_MODEL`: Text generation model name
- `OPENAI_API_KEY`: OpenAI API key (optional fallback)

### Storage
- `S3_ENDPOINT`: MinIO/S3 endpoint
- `S3_ACCESS_KEY_ID`: S3 access key
- `S3_SECRET_ACCESS_KEY`: S3 secret key
- `S3_BUCKET_RAW`: Raw files bucket name
- `S3_BUCKET_DERIVED`: Processed files bucket name

### Vector Database
- `WEAVIATE_URL`: Weaviate instance URL
- `WEAVIATE_API_KEY`: Weaviate API key (optional for local)

### External Services
- `ROLMOCR_URL`: RolmOCR service URL for PDF processing

### Security
- `JWT_SECRET`: JWT signing secret

### Frontend
- `NEXT_PUBLIC_API_BASE`: API base URL for frontend
- `NEXT_PUBLIC_CHAT_WS`: WebSocket URL for chat

## Troubleshooting

### Running the Verification Script
```bash
python verify-env.py
```

### Common Issues

1. **Environment variables not loading**
   - Check that the `.env` file exists in the project root
   - Verify file permissions
   - Ensure no syntax errors in `.env` file

2. **API key not found errors**
   - Run `python verify-env.py` to check which variables are missing
   - Update the `.env` file with the correct values
   - Restart all services after making changes

3. **Service connection issues**
   - Verify that the ports in `.env` match the actual running services
   - Check that external services (Weaviate, LiteLLM, etc.) are running
   - Ensure firewall/network settings allow connections

### Starting Services
After updating environment variables, restart all services:
```bash
./dev-all.sh
```

## Security Notes
- Never commit the `.env` file to version control
- Use strong, unique values for `JWT_SECRET`
- Regularly rotate API keys
- Use different credentials for development and production

## Environment Variable Precedence
1. System environment variables (highest priority)
2. `.env` file values
3. Default values in code (lowest priority)