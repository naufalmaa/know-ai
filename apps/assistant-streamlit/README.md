# Streamlit Assistant Setup Guide

## Overview

This guide helps you replace the complex Next.js chat UI with a simple, proven Streamlit interface while keeping all existing backend services intact. The new setup follows the successful pattern from the Agno SQL F1 sample repository.

## What Changed

### ✅ **Kept Unchanged (Backend Services)**
- FastAPI Chat Service (WebSocket): `ws://127.0.0.1:8000/ws`
- Agno Service (HTTP): `http://127.0.0.1:9010`
- PostgreSQL Database
- All existing API endpoints
- Environment variables: `NEXT_PUBLIC_CHAT_WS` still works

### 🔄 **New Streamlit Frontend**
- Simple, reliable chat interface
- Direct WebSocket connection to existing backend
- Proven Streamlit patterns (like the F1 SQL sample)
- Integrated service status monitoring
- Real-time message streaming

### 🌐 **Next.js Integration**
- `/assistant` URL preserved (users see no change)
- Next.js proxies `/assistant/*` to Streamlit on port 8501
- Alternative iframe fallback available

## Quick Start

### Option 1: Development Mode (Recommended)

1. **Start Backend Services** (as usual):
```bash
# Terminal 1: Start Chat Service
cd services/chat
python app.py

# Terminal 2: Start Agno Service  
cd services/agno
python main.py

# Terminal 3: Start Next.js (if needed)
cd apps/web
npm run dev
```

2. **Start Streamlit Assistant**:
```bash
# Terminal 4: Start Streamlit
cd apps/assistant-streamlit
python -m pip install -r requirements.txt
streamlit run app.py --server.port=8501

# Or use the helper script:
# Windows: run.bat
# Linux/Mac: ./run.sh
```

3. **Access the Assistant**:
- Direct Streamlit: `http://localhost:8501`
- Via Next.js proxy: `http://localhost:3000/assistant`

### Option 2: Docker Compose

```bash
# Start everything with Docker
docker-compose up -d

# Streamlit will be available at:
# - Direct: http://localhost:8501
# - Via proxy: http://localhost:3000/assistant
```

## Environment Configuration

### Streamlit App (`.env` in `apps/assistant-streamlit/`)
```env
CHAT_WS_URL=ws://127.0.0.1:8000/ws
AGNO_URL=http://127.0.0.1:9010
FILE_ID=
USER_ID=demo
```

### Next.js (existing `.env.local`)
```env
NEXT_PUBLIC_CHAT_WS=ws://127.0.0.1:8000/ws
STREAMLIT_PORT=8501
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Next.js App  │    │  Streamlit App   │
│  (Port 3000)   │────│   (Port 8501)    │
│                │    │                  │
│  /assistant -> │    │  Chat Interface  │
│    (proxy)     │    │                  │
└─────────────────┘    └──────────────────┘
                               │
                               │ WebSocket
                               ▼
┌─────────────────┐    ┌──────────────────┐
│  FastAPI Chat  │    │   Agno Service   │
│  (Port 8000)   │────│   (Port 9010)    │
│                │    │                  │
│  WebSocket +   │    │  AI Agents +     │
│  HTTP API      │    │  Health Check    │
└─────────────────┘    └──────────────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   (Port 5432)   │
│                 │
│   Vector DB +   │
│   Documents     │
└─────────────────┘
```

## Features

### 🎨 **Streamlit Interface**
- Clean, responsive chat UI
- Real-time service status indicators
- Expandable thought process viewer
- Document source citations
- Interactive quick actions
- Mobile-friendly design

### 🔄 **Message Flow**
- **User Input**: `st.chat_input()` → WebSocket → Backend
- **AI Response**: Backend → WebSocket → Streamlit display
- **Status Updates**: Agno status → Real-time UI updates
- **Visualizations**: Backend data → Streamlit charts/tables

### 📊 **Supported Message Types**
- `user` - User messages
- `answer/answer_enhanced` - AI responses
- `agno_status` - Processing stages
- `stream_start/chunk/end` - Real-time streaming
- `result` - Document search results
- `viz` - Data visualizations
- `table` - Structured data

## Troubleshooting

### Streamlit Won't Start
```bash
# Check Python environment
python --version  # Should be 3.8+

# Install dependencies
pip install streamlit websockets httpx pandas python-dotenv

# Test Streamlit
streamlit hello
```

### WebSocket Connection Issues
1. Verify chat service is running: `http://localhost:8000/health`
2. Check WebSocket URL in environment: `CHAT_WS_URL=ws://127.0.0.1:8000/ws`
3. Look at browser console for connection errors

### Next.js Proxy Not Working
1. Verify Streamlit is running on port 8501
2. Check `next.config.mjs` has the rewrite rules
3. Restart Next.js dev server
4. Use direct iframe as fallback: visit `/assistant` page

### Agno Service Offline
1. Check service status: `http://localhost:9010/health`
2. Streamlit will show "disconnected" but chat still works
3. Start Agno service: `cd services/agno && python main.py`

## Development Tips

### Adding New Message Types
1. Update `handle_websocket_message()` in `app.py`
2. Add UI rendering logic in the message display loop
3. Test with backend service

### Customizing UI
1. Modify CSS in the `st.markdown()` style section
2. Add new sidebar widgets
3. Customize chat message display
4. All in one file - easy to modify!

### Debugging
1. Check Streamlit logs in terminal
2. Use browser dev tools for WebSocket messages
3. Add `st.write()` for debugging state
4. Service status visible in sidebar

## Comparison with Previous System

| Complex Next.js System | Simple Streamlit System |
|------------------------|-------------------------|
| Multiple React components | Single Python file |
| Complex state management | Simple session state |
| WebSocket juggling | Direct WebSocket loop |
| Build/compilation needed | No build step |
| Multiple dependencies | 5 Python packages |
| Hard to debug | Easy debugging |
| Custom styling | Built-in themes |

## Success Criteria ✅

- [x] `/assistant` URL works via Next.js proxy
- [x] Real-time chat with existing WebSocket backend
- [x] Service status monitoring (Chat + Agno)
- [x] Message streaming and display
- [x] Document search results display
- [x] Thought process visualization
- [x] Table and visualization support
- [x] Mobile-responsive design
- [x] Easy deployment and debugging

## Next Steps

1. **Test the setup** with your existing backend services
2. **Customize the UI** as needed for your specific use case
3. **Add more features** like file upload, settings, etc.
4. **Deploy to production** using the Docker Compose setup

The new Streamlit interface is **simpler, more reliable, and easier to maintain** than the complex React system. It follows proven patterns and integrates seamlessly with your existing backend! 🚀