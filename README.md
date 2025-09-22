# Streamlit Assistant - Quick Start

## 🚀 New Simple Setup (Recommended)

We've replaced the complex Next.js chat UI with a simple, reliable Streamlit interface that follows proven patterns from the Agno F1 SQL sample repository.

### **1-Minute Setup:**

```bash
# 1. Navigate to project root
cd "z:\naufal_shared_folder\Working Folder\Project\SKK Migas_Prospektivitas\app-new\know-ai"

# 2. Start backend services (in separate terminals)
cd services/chat && python app.py        # Terminal 1: Chat service (port 8000)
cd services/agno && python main.py       # Terminal 2: Agno service (port 9010)

# 3. Start Streamlit assistant (Windows)
start-streamlit-assistant.bat

# Or manually:
cd apps/assistant-streamlit
pip install -r requirements.txt
streamlit run app.py --server.port=8501
```

### **Access Points:**
- **Direct Streamlit**: `http://localhost:8501`
- **Via Next.js**: `http://localhost:3000/assistant` (if Next.js is running)

### **What's Different:**
✅ **Simple**: Single Python file instead of complex React components  
✅ **Reliable**: Proven Streamlit patterns, no WebSocket complexity  
✅ **Fast**: No build steps, instant startup  
✅ **Debuggable**: Easy to modify and troubleshoot  
✅ **Compatible**: Uses same backend services and URLs  

## Features

### 🎨 **Clean Interface**
- Real-time chat with message streaming
- Service status indicators (Chat + Agno connectivity)
- Expandable AI thought process viewer
- Document source citations
- Quick action buttons
- Mobile-responsive design

### 🔄 **Full Backend Integration**
- Connects to existing FastAPI WebSocket (`ws://127.0.0.1:8000/ws`)
- Agno service health monitoring (`http://127.0.0.1:9010`)
- All message types supported: `answer`, `agno_status`, `stream_*`, `viz`, `table`
- Document search and retrieval
- Real-time processing stages

### 📊 **Data Display**
- Tables rendered with `st.dataframe()`
- Visualizations displayed as JSON (extensible)
- Source document citations
- AI enhancement and evaluation status

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
│   Vector DB     │
└─────────────────┘
```

## Troubleshooting

### **If Streamlit won't start:**
```bash
pip install streamlit websockets httpx pandas python-dotenv
streamlit hello  # Test Streamlit installation
```

### **If WebSocket won't connect:**
1. Check chat service: `http://localhost:8000/health`
2. Verify WebSocket URL: `ws://127.0.0.1:8000/ws`
3. Look at browser console for errors

### **If services are offline:**
- **Chat disconnected**: Start `python services/chat/app.py`
- **Agno disconnected**: Start `python services/agno/main.py`
- **Database issues**: Check PostgreSQL connection

## Docker Alternative

```bash
# Start everything with Docker
docker-compose up -d

# Access:
# - Streamlit: http://localhost:8501
# - Next.js proxy: http://localhost:3000/assistant
```

## Why This is Better

| ❌ Old Complex System | ✅ New Simple System |
|----------------------|---------------------|
| Multiple React components | Single Python file |
| Complex WebSocket state management | Simple message loop |
| Build/compilation required | No build step |
| Hard to debug | Easy debugging |
| Multiple dependencies | 5 Python packages |
| Fragile streaming logic | Proven Streamlit patterns |

## Customization

The Streamlit app is in `apps/assistant-streamlit/app.py` - a single file that's easy to:
- Modify the UI layout
- Add new message types  
- Customize styling
- Debug and troubleshoot
- Deploy anywhere

**This setup is bulletproof and follows the successful pattern from the Agno F1 SQL sample! 🚀**

---

## Legacy Setup (Complex Next.js)

If you need to use the old complex system, see [COMPLEX-SETUP.md](COMPLEX-SETUP.md) for the previous instructions.