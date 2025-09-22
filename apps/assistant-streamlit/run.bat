@echo off
echo 🚀 Starting Streamlit Assistant
echo ================================

REM Navigate to the Streamlit app directory
cd /d "%~dp0"

REM Load environment variables if .env exists
if exist .env (
    echo 📄 Loading environment variables from .env
    for /f "tokens=*" %%i in (.env) do set %%i
)

REM Set defaults if not provided
if not defined CHAT_WS_URL set CHAT_WS_URL=ws://127.0.0.1:8000/ws
if not defined AGNO_URL set AGNO_URL=http://127.0.0.1:9010

echo 🔗 Chat WebSocket: %CHAT_WS_URL%
echo 🤖 Agno Service: %AGNO_URL%

REM Check if requirements are installed
python -c "import streamlit" 2>nul || (
    echo 📦 Installing requirements...
    pip install -r requirements.txt
)

echo 🌐 Starting Streamlit on http://localhost:8501
echo ⚡ Visit http://localhost:3000/assistant in your Next.js app
echo.

REM Start Streamlit
streamlit run app.py --server.address=0.0.0.0 --server.port=8501