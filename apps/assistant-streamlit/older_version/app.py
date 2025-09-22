"""
Streamlit AI Assistant - Clean Chat Interface
============================================

A simple, reliable chat interface that connects to the existing FastAPI backend
and Agno services. Replaces the complex Next.js frontend with proven Streamlit patterns.
"""

import os
import json
import asyncio
import websockets
import streamlit as st
import httpx
from datetime import datetime
from typing import Dict, Any, List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration from environment
CHAT_WS_URL = os.getenv("CHAT_WS_URL", "ws://127.0.0.1:8000/ws")
AGNO_URL = os.getenv("AGNO_URL", "http://127.0.0.1:9010")
FILE_ID = os.getenv("FILE_ID", None)  # Optional file focus

# Page configuration
st.set_page_config(
    page_title="Zara AI Assistant",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS for better UX
st.markdown("""
<style>
.main-header {
    text-align: center;
    background: linear-gradient(45deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-size: 2.5em;
    font-weight: bold;
    margin-bottom: 0.5em;
}

.status-indicator {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 8px;
}

.status-connected { background-color: #4CAF50; }
.status-disconnected { background-color: #F44336; }
.status-warning { background-color: #FF9800; }

.chat-container {
    background-color: #f8f9fa;
    border-radius: 10px;
    padding: 1rem;
    margin: 1rem 0;
}

.agno-status {
    background-color: #e3f2fd;
    border-left: 4px solid #2196F3;
    padding: 8px 12px;
    margin: 4px 0;
    border-radius: 4px;
    font-size: 0.9em;
    color: #1976D2;
}

.thought-process {
    background-color: #fff3e0;
    border-left: 4px solid #FF9800;
    padding: 8px 12px;
    margin: 4px 0;
    border-radius: 4px;
    font-size: 0.85em;
    color: #F57C00;
}

.source-citation {
    background-color: #f3e5f5;
    border: 1px solid #9C27B0;
    border-radius: 6px;
    padding: 8px;
    margin: 8px 0;
    font-size: 0.85em;
}
</style>
""", unsafe_allow_html=True)

# ============================================================================
# Service Status Functions
# ============================================================================

@st.cache_data(ttl=30)  # Cache for 30 seconds
def check_agno_health() -> Dict[str, Any]:
    """Check Agno service health"""
    try:
        response = httpx.get(f"{AGNO_URL}", timeout=5)
        if response.status_code == 200:
            return {"status": "connected", "data": response.json()}
        else:
            return {"status": "error", "error": f"HTTP {response.status_code}"}
    except Exception as e:
        return {"status": "disconnected", "error": str(e)}

def get_status_indicator(status: str) -> str:
    """Get HTML for status indicator"""
    if status == "connected":
        return '<span class="status-indicator status-connected"></span>'
    elif status == "disconnected":
        return '<span class="status-indicator status-disconnected"></span>'
    else:
        return '<span class="status-indicator status-warning"></span>'

# ============================================================================
# WebSocket Message Handling
# ============================================================================

def add_message(role: str, content: str, metadata: Optional[Dict[str, Any]] = None):
    """Add message to session state"""
    if "messages" not in st.session_state:
        st.session_state.messages = []
    
    message = {
        "role": role,
        "content": content,
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "metadata": metadata or {}
    }
    st.session_state.messages.append(message)

def update_current_response(content: str, append: bool = True):
    """Update the current assistant response"""
    if "current_response" not in st.session_state:
        st.session_state.current_response = ""
    
    if append:
        st.session_state.current_response += content
    else:
        st.session_state.current_response = content

async def handle_websocket_message(message_data: Dict[str, Any]):
    """Handle incoming WebSocket message"""
    msg_type = message_data.get("type", "")
    payload = message_data.get("payload", "")
    
    logger.info(f"📨 Received: {msg_type}")
    
    # Handle different message types
    if msg_type == "user":
        # Echo user message (already added when sent)
        pass
    
    elif msg_type == "agno_status":
        stage = message_data.get("stage", "")
        status = message_data.get("status", "")
        
        # Add to thought process
        if "thought_process" not in st.session_state:
            st.session_state.thought_process = []
        
        st.session_state.thought_process.append({
            "stage": stage,
            "message": payload,
            "status": status,
            "timestamp": datetime.now().strftime("%H:%M:%S")
        })
    
    elif msg_type in ["answer", "answer_enhanced"]:
        # Direct answer - finalize response
        if st.session_state.get("current_response"):
            # Add accumulated response
            add_message("assistant", st.session_state.current_response)
        else:
            # Add direct answer
            add_message("assistant", payload, {"type": msg_type})
        
        st.session_state.current_response = ""
        st.session_state.is_streaming = False
    
    elif msg_type == "stream_start":
        st.session_state.is_streaming = True
        st.session_state.current_response = ""
    
    elif msg_type == "stream_chunk":
        update_current_response(payload, append=True)
    
    elif msg_type == "stream_end":
        if st.session_state.get("current_response"):
            add_message("assistant", st.session_state.current_response)
        st.session_state.current_response = ""
        st.session_state.is_streaming = False
    
    elif msg_type == "result":
        # Document search results
        if "search_results" not in st.session_state:
            st.session_state.search_results = []
        
        objects = payload.get("objects", []) if isinstance(payload, dict) else []
        st.session_state.search_results = objects
    
    elif msg_type == "viz":
        # Visualization data
        add_message("assistant", "📊 Visualization generated", {"type": "viz", "data": payload})
    
    elif msg_type == "table":
        # Table data
        add_message("assistant", "📋 Table data", {"type": "table", "data": payload})
    
    elif msg_type == "agno_enhancement":
        # Agno prompt enhancement
        enhancement_data = payload if isinstance(payload, dict) else {}
        add_message("system", f"🔧 Query enhanced (confidence: {enhancement_data.get('confidence', 0):.1%})", 
                   {"type": "agno_enhancement", "data": enhancement_data})
    
    elif msg_type == "agno_evaluation":
        # Agno response evaluation
        eval_data = payload if isinstance(payload, dict) else {}
        add_message("system", f"✅ Response evaluated (confidence: {eval_data.get('confidence', 0):.1%})", 
                   {"type": "agno_evaluation", "data": eval_data})
    
    elif msg_type == "heartbeat":
        # Keep-alive, ignore
        pass
    
    else:
        # Unknown message type
        logger.warning(f"Unknown message type: {msg_type}")
        add_message("system", f"[{msg_type}]: {payload}", {"type": "unknown"})

async def send_message_to_ws(query: str):
    """Send message to WebSocket and handle responses"""
    try:
        # Initialize session state
        if "is_streaming" not in st.session_state:
            st.session_state.is_streaming = False
        if "thought_process" not in st.session_state:
            st.session_state.thought_process = []
        if "search_results" not in st.session_state:
            st.session_state.search_results = []
        
        # Clear previous state
        st.session_state.thought_process = []
        st.session_state.search_results = []
        st.session_state.current_response = ""
        
        # Connect to WebSocket
        uri = CHAT_WS_URL.replace("http://", "ws://").replace("https://", "wss://")
        
        async with websockets.connect(uri, timeout=10) as websocket:
            st.session_state.ws_connected = True
            
            # Send message
            message = {
                "user_id": "demo",
                "conversation_id": st.session_state.get("conversation_id", "streamlit-session"),
                "query": query,
                "file_id": FILE_ID
            }
            
            await websocket.send(json.dumps(message))
            logger.info(f"📤 Sent: {query}")
            
            # Listen for responses
            try:
                while True:
                    response = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                    data = json.loads(response)
                    await handle_websocket_message(data)
                    
                    # Break if we receive a final message
                    if data.get("type") in ["answer", "answer_enhanced", "stream_end"]:
                        if not st.session_state.get("is_streaming", False):
                            break
                    
            except asyncio.TimeoutError:
                logger.warning("WebSocket timeout")
                add_message("system", "⚠️ Response timeout - connection may have been lost")
            except websockets.exceptions.ConnectionClosed:
                logger.info("WebSocket connection closed")
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        st.session_state.ws_connected = False
        add_message("system", f"❌ Connection error: {str(e)}")

# ============================================================================
# Streamlit UI
# ============================================================================

def main():
    """Main Streamlit application"""
    
    # Header
    st.markdown('<h1 class="main-header">🤖 Zara AI Assistant</h1>', unsafe_allow_html=True)
    
    # Initialize session state
    if "messages" not in st.session_state:
        st.session_state.messages = []
        # Welcome message
        add_message("assistant", "👋 Hello! I'm Zara, your AI Knowledge Navigator Assistant. Ask me anything about your documents or data!")
    
    if "conversation_id" not in st.session_state:
        st.session_state.conversation_id = f"streamlit-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    
    if "ws_connected" not in st.session_state:
        st.session_state.ws_connected = False
    
    # Sidebar
    with st.sidebar:
        st.markdown("### 🛠️ Service Status")
        
        # WebSocket status
        ws_status = "connected" if st.session_state.get("ws_connected", False) else "disconnected"
        # print(ws_status)
        st.markdown(f"{get_status_indicator(ws_status)} **Chat Service:** {ws_status.title()}", 
                   unsafe_allow_html=True)
        
        # Agno status
        agno_health = check_agno_health()
        agno_status = agno_health["status"]
        st.markdown(f"{get_status_indicator(agno_status)} **Agno Service:** {agno_status.title()}", 
                   unsafe_allow_html=True)
        
        if agno_status == "connected" and "data" in agno_health:
            health_data = agno_health["data"]
            st.markdown(f"- LLM: {health_data.get('models', 'unknown')}")
            st.markdown(f"- Agents: {', '.join(health_data.get('agents', []))}")
        
        st.markdown("---")
        
        # Connection info
        st.markdown("### 🔗 Connection")
        st.code(f"WS: {CHAT_WS_URL}")
        st.code(f"Agno: {AGNO_URL}")
        
        if FILE_ID:
            st.markdown(f"📄 **Focus File:** {FILE_ID}")
        
        st.markdown("---")
        
        # Quick actions     
        st.markdown("### ⚡ Quick Questions")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("👋 Greeting", use_container_width=True):
                st.session_state.quick_query = "Hi, who are you?"
        with col2:
            if st.button("❓ Help", use_container_width=True):
                st.session_state.quick_query = "What can you help me with?"
        
        col3, col4 = st.columns(2)
        with col3:
            if st.button("📊 Data", use_container_width=True):
                st.session_state.quick_query = "Show me some data analysis"
        with col4:
            if st.button("🔍 Search", use_container_width=True):
                st.session_state.quick_query = "Search through my documents"
        
        if st.button("🗑️ Clear Chat", use_container_width=True):
            st.session_state.messages = []
            st.session_state.thought_process = []
            st.session_state.search_results = []
            st.rerun()
    
    # Main chat area
    # Display thought process if available
    if st.session_state.get("thought_process"):
        with st.expander("🧠 AI Thought Process", expanded=False):
            for thought in st.session_state.thought_process:
                stage_emoji = "🔍" if thought["stage"] == "classify" else "📚" if thought["stage"] == "retrieve" else "⚙️"
                status_emoji = "✅" if thought["status"] == "complete" else "⏳"
                st.markdown(f'<div class="thought-process">{stage_emoji} {status_emoji} <strong>{thought["stage"].title()}:</strong> {thought["message"]}</div>', 
                           unsafe_allow_html=True)
    
    # Display search results if available
    if st.session_state.get("search_results"):
        with st.expander("📚 Document Sources", expanded=False):
            for i, result in enumerate(st.session_state.search_results, 1):
                meta = result.get("meta", {})
                text_preview = result.get("text", "")[:200] + "..." if len(result.get("text", "")) > 200 else result.get("text", "")
                
                st.markdown(f'<div class="source-citation">'
                           f'<strong>Source {i}:</strong> {meta.get("file_id", "Unknown")} '
                           f'(Page {meta.get("page", "?")}, Section: {meta.get("section", "?")})<br>'
                           f'<em>{text_preview}</em>'
                           f'</div>', unsafe_allow_html=True)
    
    # Chat messages
    for message in st.session_state.messages:
        role = message["role"]
        content = message["content"]
        metadata = message.get("metadata", {})
        timestamp = message.get("timestamp", "")
        
        if role == "user":
            with st.chat_message("user"):
                st.markdown(content)
                st.markdown(f"<small>{timestamp}</small>", unsafe_allow_html=True)
        
        elif role == "assistant":
            with st.chat_message("assistant", avatar="🤖"):
                # Handle special content types
                if metadata.get("type") == "viz" and "data" in metadata:
                    st.markdown("📊 **Visualization Generated**")
                    try:
                        viz_data = metadata["data"]
                        if isinstance(viz_data, dict) and "traces" in viz_data:
                            # Simple plotly-style visualization
                            st.json(viz_data)  # Fallback to JSON display
                        else:
                            st.json(viz_data)
                    except Exception as e:
                        st.error(f"Error displaying visualization: {e}")
                
                elif metadata.get("type") == "table" and "data" in metadata:
                    st.markdown("📋 **Table Data**")
                    try:
                        table_data = metadata["data"]
                        if isinstance(table_data, dict):
                            if "rows" in table_data and "columns" in table_data:
                                import pandas as pd
                                df = pd.DataFrame(table_data["rows"])
                                st.dataframe(df, use_container_width=True)
                            else:
                                st.json(table_data)
                        else:
                            st.json(table_data)
                    except Exception as e:
                        st.error(f"Error displaying table: {e}")
                
                else:
                    # Regular text content
                    st.markdown(content)
                
                st.markdown(f"<small>{timestamp}</small>", unsafe_allow_html=True)
        
        elif role == "system":
            if metadata.get("type") in ["agno_enhancement", "agno_evaluation"]:
                st.markdown(f'<div class="agno-status">{content}</div>', unsafe_allow_html=True)
            else:
                st.info(f"{content} ({timestamp})")
    
    # Display current streaming response
    if st.session_state.get("is_streaming") and st.session_state.get("current_response"):
        with st.chat_message("assistant", avatar="🤖"):
            st.markdown(st.session_state.current_response + " ▋")
    
    # Chat input
    if prompt := st.chat_input("Ask me anything about your documents or data..."):
        # Add user message
        add_message("user", prompt)
        
        # Send to WebSocket
        with st.spinner("🤔 Thinking..."):
            asyncio.run(send_message_to_ws(prompt))
        
        st.rerun()
    
    # Handle quick queries
    if st.session_state.get("quick_query"):
        prompt = st.session_state.quick_query
        del st.session_state.quick_query
        
        # Add user message
        add_message("user", prompt)
        
        # Send to WebSocket
        with st.spinner("🤔 Thinking..."):
            asyncio.run(send_message_to_ws(prompt))
        
        st.rerun()

if __name__ == "__main__":
    main()