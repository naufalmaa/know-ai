#!/bin/bash

echo "🚀 Starting Streamlit Assistant"
echo "================================"

# Navigate to the Streamlit app directory
cd "$(dirname "$0")"

# Load environment variables if .env exists
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env"
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Set defaults if not provided
export CHAT_WS_URL=${CHAT_WS_URL:-"ws://127.0.0.1:8000/ws"}
export AGNO_URL=${AGNO_URL:-"http://127.0.0.1:9010"}

echo "🔗 Chat WebSocket: $CHAT_WS_URL"
echo "🤖 Agno Service: $AGNO_URL"

# Check if requirements are installed
if ! python -c "import streamlit" 2>/dev/null; then
    echo "📦 Installing requirements..."
    pip install -r requirements.txt
fi

echo "🌐 Starting Streamlit on http://localhost:8501"
echo "⚡ Visit http://localhost:3000/assistant in your Next.js app"
echo ""

# Start Streamlit
streamlit run app.py --server.address=0.0.0.0 --server.port=8501