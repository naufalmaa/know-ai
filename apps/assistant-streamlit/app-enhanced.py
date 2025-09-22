"""
Enhanced Streamlit AI Assistant
==============================
Features:
- Real-time streaming responses
- Mode controls (Visualization, Query, Enhanced)
- Better performance and responsiveness
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

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment
from dotenv import load_dotenv
load_dotenv()

# Configuration
CHAT_WS_URL = os.getenv("CHAT_WS_URL", "ws://127.0.0.1:8000/ws")
AGNO_URL = os.getenv("AGNO_URL", "http://127.0.0.1:9010")
FILE_ID = os.getenv("FILE_ID", None)

st.set_page_config(
    page_title="Zara AI Assistant",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Enhanced CSS
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

.status-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 8px;
}

.status-connected { background-color: #4CAF50; }
.status-disconnected { background-color: #F44336; }
.status-warning { background-color: #FF9800; }

.mode-selector {
    display: flex;
    gap: 10px;
    margin: 10px 0;
    flex-wrap: wrap;
}

.mode-button {
    background: #f0f0f0;
    border: 2px solid #ddd;
    border-radius: 8px;
    padding: 8px 16px;
    cursor: pointer;
    transition: all 0.3s;
}

.mode-button.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
}

.streaming-indicator {
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.8em;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
}

.thought-step {
    background: #e3f2fd;
    border-left: 4px solid #2196F3;
    padding: 8px 12px;
    margin: 4px 0;
    border-radius: 4px;
    font-size: 0.9em;
}

.source-card {
    background: #f3e5f5;
    border: 1px solid #9C27B0;
    border-radius: 6px;
    padding: 12px;
    margin: 8px 0;
    font-size: 0.9em;
}
</style>
""", unsafe_allow_html=True)

# ============================================================================
# Service Health Check Functions
# ============================================================================

@st.cache_data(ttl=10)
def check_service_health(url: str, service_name: str) -> dict:
    """Quick health check with proper error handling"""
    try:
        with httpx.Client(timeout=2) as client:
            response = client.get(f"{url}")
            if response.status_code == 200:
                return {"status": "connected", "data": response.json()}
            else:
                return {"status": "warning", "error": f"HTTP {response.status_code}"}
    except httpx.ConnectError:
        return {"status": "disconnected", "error": "Service not reachable"}
    except Exception as e:
        return {"status": "error", "error": str(e)[:50]}

def get_status_html(status: str) -> str:
    """Get status indicator HTML"""
    if status == "connected":
        return '<span class="status-dot status-connected"></span>'
    elif status == "disconnected":
        return '<span class="status-dot status-disconnected"></span>'
    else:
        return '<span class="status-dot status-warning"></span>'

# ============================================================================
# Session State Management
# ============================================================================

def initialize_session_state():
    """Initialize all session state variables"""
    if "messages" not in st.session_state:
        st.session_state.messages = []
        # Welcome message
        st.session_state.messages.append({
            "role": "assistant",
            "content": "👋 Hello! I'm your Zara AI Assistant. Choose your mode and let's get started!",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "metadata": {}
        })
    
    if "conversation_id" not in st.session_state:
        st.session_state.conversation_id = f"enhanced-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    
    if "ws_connected" not in st.session_state:
        st.session_state.ws_connected = False
    
    if "is_streaming" not in st.session_state:
        st.session_state.is_streaming = False
    
    if "current_response" not in st.session_state:
        st.session_state.current_response = ""
    
    if "streaming_placeholder" not in st.session_state:
        st.session_state.streaming_placeholder = None
    
    if "thought_process" not in st.session_state:
        st.session_state.thought_process = []
    
    if "search_results" not in st.session_state:
        st.session_state.search_results = []
    
    if "ai_mode" not in st.session_state:
        st.session_state.ai_mode = "normal"  # Default to normal mode for faster responses

def add_message(role: str, content: str, metadata: Optional[Dict[str, Any]] = None):
    """Add message with better state management"""
    message = {
        "role": role,
        "content": content,
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "metadata": metadata or {}
    }
    st.session_state.messages.append(message)

# ============================================================================
# WebSocket Message Handling
# ============================================================================

async def handle_websocket_message(message_data: Dict[str, Any]):
    """Enhanced WebSocket message handling with real-time streaming"""
    msg_type = message_data.get("type", "")
    payload = message_data.get("payload", "")
    
    logger.info(f"📨 Received: {msg_type}")
    
    if msg_type == "user":
        # User message echo (already handled)
        pass
    
    elif msg_type == "agno_status":
        # Add to thought process for real-time display
        stage = message_data.get("stage", "")
        status = message_data.get("status", "")
        
        st.session_state.thought_process.append({
            "stage": stage,
            "message": payload,
            "status": status,
            "timestamp": datetime.now().strftime("%H:%M:%S")
        })
    
    elif msg_type == "stream_start":
        # Initialize streaming
        st.session_state.is_streaming = True
        st.session_state.current_response = ""
        logger.info("🌊 Stream started")
    
    elif msg_type == "stream_chunk":
        # Append to streaming response
        st.session_state.current_response += payload
        logger.info(f"📝 Chunk received: {len(payload)} chars")
    
    elif msg_type == "stream_end":
        # Finalize streaming response
        if st.session_state.current_response:
            add_message("assistant", st.session_state.current_response)
        st.session_state.current_response = ""
        st.session_state.is_streaming = False
        logger.info("🏁 Stream ended")
    
    elif msg_type in ["answer", "answer_enhanced"]:
        # Direct answer (non-streaming)
        add_message("assistant", payload, {"type": msg_type})
        st.session_state.is_streaming = False
    
    elif msg_type == "result":
        # Document search results
        objects = payload.get("objects", []) if isinstance(payload, dict) else []
        st.session_state.search_results = objects
    
    elif msg_type == "viz":
        # Visualization data
        add_message("assistant", "📊 Visualization generated", {"type": "viz", "data": payload})
    
    elif msg_type == "table":
        # Table data
        add_message("assistant", "📋 Data table generated", {"type": "table", "data": payload})
    
    elif msg_type == "agno_enhancement":
        # Agno enhancement info
        enhancement_data = payload if isinstance(payload, dict) else {}
        add_message("system", f"🔧 Query enhanced (confidence: {enhancement_data.get('confidence', 0):.1%})", 
                   {"type": "agno_enhancement", "data": enhancement_data})
    
    elif msg_type == "agno_evaluation":
        # Agno evaluation info
        eval_data = payload if isinstance(payload, dict) else {}
        add_message("system", f"✅ Response evaluated (confidence: {eval_data.get('confidence', 0):.1%})", 
                   {"type": "agno_evaluation", "data": eval_data})
    
    elif msg_type == "heartbeat":
        # Keep-alive signal
        pass
    
    else:
        # Unknown message type
        logger.warning(f"Unknown message type: {msg_type}")
        add_message("system", f"[{msg_type}]: {payload}", {"type": "unknown"})

async def send_message_to_ws(query: str, mode: str = "enhanced"):
    """Send message with real-time streaming using st.write_stream"""
    try:
        # Clear previous state
        st.session_state.thought_process = []
        st.session_state.search_results = []
        st.session_state.current_response = ""
        st.session_state.is_streaming = False
        
        # Connect to WebSocket
        uri = CHAT_WS_URL.replace("http://", "ws://").replace("https://", "wss://")
        
        # Add mode-specific context to the query
        if mode == "visualization":
            query = f"[VISUALIZATION MODE] {query} - Please provide charts, graphs, or visual data representations."
        elif mode == "query":
            query = f"[QUERY MODE] {query} - Please provide structured data, tables, or direct answers."
        elif mode == "normal":
            query = f"[NORMAL MODE] {query} - Please provide a direct response with database context but no enhancement."
        elif mode == "enhanced":
            query = f"[ENHANCED MODE] {query} - Please provide comprehensive analysis with sources and reasoning."
        
        async def ws_generator():
            """Async generator for WebSocket streaming with real-time updates"""
            try:
                async with websockets.connect(uri, timeout=10) as websocket:
                    st.session_state.ws_connected = True
                    
                    # Send message
                    message = {
                        "user_id": "demo",
                        "conversation_id": st.session_state.conversation_id,
                        "query": query,
                        "file_id": FILE_ID,
                        "mode": mode
                    }
                    
                    await websocket.send(json.dumps(message))
                    logger.info(f"📤 Sent ({mode}): {query}")
                    
                    # Listen for responses with true streaming
                    try:
                        async for response in websocket:
                            data = json.loads(response)
                            msg_type = data.get("type", "")
                            payload = data.get("payload", "")
                            
                            # Handle thought process updates
                            if msg_type == "agno_status":
                                stage = data.get("stage", "")
                                status = data.get("status", "")
                                st.session_state.thought_process.append({
                                    "stage": stage,
                                    "message": payload,
                                    "status": status,
                                    "timestamp": datetime.now().strftime("%H:%M:%S")
                                })
                            
                            # Handle search results with filenames
                            elif msg_type == "result":
                                objects = payload.get("objects", []) if isinstance(payload, dict) else []
                                # Extract filenames for display
                                for obj in objects:
                                    if "meta" in obj and "file_id" in obj["meta"]:
                                        filename = obj["meta"].get("filename", obj["meta"]["file_id"])
                                        obj["meta"]["display_filename"] = filename
                                st.session_state.search_results = objects
                            
                            # Handle streaming chunks - yield for real-time display
                            elif msg_type == "stream_chunk":
                                # Real-time streaming: yield each token immediately
                                yield payload
                            
                            # Handle direct answers (for simple modes)
                            elif msg_type in ["answer", "answer_enhanced"]:
                                # For non-streaming responses, yield the complete text
                                yield payload
                                break
                            
                            # Handle stream end
                            elif msg_type == "stream_end":
                                break
                            
                            # Handle visualizations and tables
                            elif msg_type == "viz":
                                st.session_state.last_viz = payload
                                yield "📊 Visualization generated"
                                break
                            elif msg_type == "table":
                                st.session_state.last_table = payload
                                yield "📋 Data table generated"
                                break
                                
                    except asyncio.TimeoutError:
                        yield "⚠️ Response timeout - connection may have been lost"
                    except websockets.exceptions.ConnectionClosed:
                        logger.info("WebSocket connection closed")
                        
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                yield f"❌ Connection error: {str(e)}"
        
        return ws_generator
        
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        st.session_state.ws_connected = False
        
        async def error_generator():
            yield f"❌ Connection error: {str(e)}"
        
        return error_generator

# ============================================================================
# UI Components
# ============================================================================

def render_mode_selector():
    """Render AI mode selector with normal mode as default"""
    st.markdown("### 🎛️ AI Assistant Mode")
    
    col1, col2, col3, col4 = st.columns(4)
    
    # Use unique keys with callback to handle mode changes
    with col1:
        viz_checked = st.checkbox(
            "📊 Visualization", 
            value=st.session_state.ai_mode == "visualization",
            help="Focus on charts, graphs, and visual data representations",
            key="mode_viz_checkbox"
        )
        if viz_checked and st.session_state.ai_mode != "visualization":
            st.session_state.ai_mode = "visualization"
    
    with col2:
        query_checked = st.checkbox(
            "📋 Query", 
            value=st.session_state.ai_mode == "query",
            help="Structured data, tables, and direct answers (fast mode)",
            key="mode_query_checkbox"
        )
        if query_checked and st.session_state.ai_mode != "query":
            st.session_state.ai_mode = "query"
    
    with col3:
        normal_checked = st.checkbox(
            "⚡ Normal", 
            value=st.session_state.ai_mode == "normal",
            help="Fast responses with database context but no enhancement",
            key="mode_normal_checkbox"
        )
        if normal_checked and st.session_state.ai_mode != "normal":
            st.session_state.ai_mode = "normal"
    
    with col4:
        enhanced_checked = st.checkbox(
            "🚀 Enhanced", 
            value=st.session_state.ai_mode == "enhanced",
            help="Comprehensive analysis with sources and reasoning",
            key="mode_enhanced_checkbox"
        )
        if enhanced_checked and st.session_state.ai_mode != "enhanced":
            st.session_state.ai_mode = "enhanced"
    
    # Handle unchecking logic - fallback to normal mode
    if st.session_state.ai_mode == "visualization" and not viz_checked:
        st.session_state.ai_mode = "normal"  # Default to normal mode
    elif st.session_state.ai_mode == "query" and not query_checked:
        st.session_state.ai_mode = "normal"  # Default to normal mode
    elif st.session_state.ai_mode == "normal" and not normal_checked:
        st.session_state.ai_mode = "enhanced"  # Switch to enhanced if normal unchecked
    elif st.session_state.ai_mode == "enhanced" and not enhanced_checked:
        st.session_state.ai_mode = "normal"  # Default to normal mode
    
    # If none are checked, default to normal mode
    if not (viz_checked or query_checked or normal_checked or enhanced_checked):
        st.session_state.ai_mode = "normal"
    
    # Display current mode
    mode_info = {
        "visualization": "📊 Charts and graphs will be prioritized",
        "query": "📋 Fast structured data and direct answers",
        "normal": "⚡ Fast responses with database context (no AI enhancement)",
        "enhanced": "🚀 Comprehensive analysis with full context"
    }
    
    st.info(f"**Current Mode:** {st.session_state.ai_mode.title()} - {mode_info[st.session_state.ai_mode]}")

def render_service_status():
    """Render service status in sidebar"""
    st.markdown("### 🛠️ Service Status")
    
    # Chat service status
    chat_url = CHAT_WS_URL.replace("ws://", "http://").replace("/ws", "")
    chat_status = check_service_health(f"{chat_url}/health", "Chat Service")
    
    st.markdown(
        f"{get_status_html(chat_status['status'])} **Chat Service:** {chat_status['status'].title()}", 
        unsafe_allow_html=True
    )
    
    if chat_status['status'] == 'connected' and 'data' in chat_status:
        data = chat_status['data']
        st.caption(f"Models: {data.get('models', {}).get('generation', 'unknown')}")
    
    # Agno service status
    agno_status = check_service_health(AGNO_URL, "Agno Service")
    st.markdown(
        f"{get_status_html(agno_status['status'])} **Agno Service:** {agno_status['status'].title()}", 
        unsafe_allow_html=True
    )
    
    if agno_status['status'] == 'connected' and 'data' in agno_status:
        data = agno_status['data']
        st.caption(f"Agents: {len(data.get('agents', []))} available")
    
    # WebSocket connection status
    ws_status = "connected" if st.session_state.get("ws_connected", False) else "disconnected"
    st.markdown(
        f"{get_status_html(ws_status)} **WebSocket:** {ws_status.title()}", 
        unsafe_allow_html=True
    )

def render_thought_process():
    """Render AI thought process"""
    if st.session_state.get("thought_process"):
        with st.expander("🧠 AI Thought Process", expanded=True):
            for thought in st.session_state.thought_process[-5:]:  # Show last 5 steps
                stage_emoji = {
                    "received": "📨",
                    "classify": "🔍", 
                    "enhance": "🔧",
                    "retrieve": "📚",
                    "format": "📊",
                    "generate": "⚙️",
                    "evaluate": "✅",
                    "done": "🏁"
                }.get(thought["stage"], "⚙️")
                
                status_emoji = "✅" if thought["status"] == "complete" else "⏳"
                
                st.markdown(
                    f'<div class="thought-step">{stage_emoji} {status_emoji} '
                    f'<strong>{thought["stage"].title()}:</strong> {thought["message"]}</div>', 
                    unsafe_allow_html=True
                )

def render_search_results():
    """Render document search results"""
    if st.session_state.get("search_results"):
        with st.expander("📚 Document Sources", expanded=False):
            for i, result in enumerate(st.session_state.search_results[:5], 1):  # Show first 5
                meta = result.get("meta", {})
                text_preview = result.get("text", "")[:150] + "..." if len(result.get("text", "")) > 150 else result.get("text", "")
                
                st.markdown(
                    f'<div class="source-card">'
                    f'<strong>Source {i}:</strong> {meta.get("file_id", "Unknown")} '
                    f'(Page {meta.get("page", "?")}, Section: {meta.get("section", "?")})<br>'
                    f'<em>{text_preview}</em>'
                    f'</div>', 
                    unsafe_allow_html=True
                )

def render_streaming_response():
    """Render real-time streaming response"""
    if st.session_state.get("is_streaming") and st.session_state.get("current_response"):
        with st.chat_message("assistant", avatar="🤖"):
            # Show streaming indicator
            st.markdown('<div class="streaming-indicator">🌊 Generating response...</div>', unsafe_allow_html=True)
            
            # Show current response with cursor
            st.markdown(st.session_state.current_response + " ▋")

def render_chat_messages():
    """Render chat message history"""
    for message in st.session_state.messages:
        role = message["role"]
        content = message["content"]
        metadata = message.get("metadata", {})
        timestamp = message.get("timestamp", "")
        
        if role == "user":
            with st.chat_message("user"):
                st.markdown(content)
                st.caption(f"⏰ {timestamp}")
        
        elif role == "assistant":
            with st.chat_message("assistant", avatar="🤖"):
                # Handle special content types
                if metadata.get("type") == "viz" and "data" in metadata:
                    st.markdown("📊 **Visualization Generated**")
                    try:
                        viz_data = metadata["data"]
                        if isinstance(viz_data, dict) and "traces" in viz_data:
                            # Try to render with plotly if available
                            try:
                                import plotly.graph_objects as go
                                fig = go.Figure()
                                for trace in viz_data.get("traces", []):
                                    fig.add_trace(go.Scatter(
                                        x=trace.get("x", []),
                                        y=trace.get("y", []),
                                        mode=trace.get("mode", "lines"),
                                        name=trace.get("name", "Data")
                                    ))
                                fig.update_layout(
                                    title=viz_data.get("title", "Visualization"),
                                    xaxis_title=viz_data.get("layout", {}).get("xaxis_title", "X"),
                                    yaxis_title=viz_data.get("layout", {}).get("yaxis_title", "Y")
                                )
                                st.plotly_chart(fig, use_container_width=True)
                            except ImportError:
                                st.json(viz_data)
                        else:
                            st.json(viz_data)
                    except Exception as e:
                        st.error(f"Error displaying visualization: {e}")
                
                elif metadata.get("type") == "table" and "data" in metadata:
                    st.markdown("📋 **Data Table**")
                    try:
                        table_data = metadata["data"]
                        if isinstance(table_data, dict) and "rows" in table_data:
                            import pandas as pd
                            df = pd.DataFrame(table_data["rows"])
                            st.dataframe(df, use_container_width=True)
                        else:
                            st.json(table_data)
                    except Exception as e:
                        st.error(f"Error displaying table: {e}")
                
                else:
                    # Regular text content
                    st.markdown(content)
                
                st.caption(f"⏰ {timestamp}")
        
        elif role == "system":
            if metadata.get("type") in ["agno_enhancement", "agno_evaluation"]:
                st.info(content)
            else:
                st.warning(f"{content} ({timestamp})")

# ============================================================================
# Main Application
# ============================================================================

def main():
    """Enhanced main application"""
    # Initialize session state
    initialize_session_state()
    
    # Header
    st.markdown('<h1 class="main-header">🚀 Zara AI Assistant</h1>', unsafe_allow_html=True)
    
    # Sidebar
    with st.sidebar:
        render_service_status()
        
        st.markdown("---")
        
        # Connection info
        st.markdown("### 🔗 Configuration")
        st.code(f"WebSocket: {CHAT_WS_URL}")
        st.code(f"Agno: {AGNO_URL}")
        
        if FILE_ID:
            st.markdown(f"📄 **Focus File:** {FILE_ID}")
        
        st.markdown("---")
        
        # Quick actions
        st.markdown("### ⚡ Quick Actions")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("👋 Hello", use_container_width=True):
                st.session_state.quick_query = "Hello! What can you help me with?"
        with col2:
            if st.button("📊 Data", use_container_width=True):
                st.session_state.quick_query = "Show me some data analysis and visualizations"
        
        col3, col4 = st.columns(2)
        with col3:
            if st.button("🔍 Search", use_container_width=True):
                st.session_state.quick_query = "Search through my documents"
        with col4:
            if st.button("🗑️ Clear", use_container_width=True):
                st.session_state.messages = []
                st.session_state.thought_process = []
                st.session_state.search_results = []
                st.session_state.current_response = ""
                st.session_state.is_streaming = False
                st.rerun()
    
    # Main content area
    # Mode selector
    render_mode_selector()
    
    # Thought process (if active)
    render_thought_process()
    
    # Search results (if available)
    render_search_results()
    
    # Chat messages
    render_chat_messages()
    
    # Streaming response (if active)
    render_streaming_response()
    
    # Chat input
    if prompt := st.chat_input(f"Ask me anything... (Mode: {st.session_state.ai_mode})"):
        # Add user message
        add_message("user", prompt)
        
        # Stream response in real-time
        with st.chat_message("assistant", avatar="🤖"):
            # Get the generator function
            generator_func = asyncio.run(send_message_to_ws(prompt, st.session_state.ai_mode))
            
            # Use st.write_stream for real-time streaming
            response_text = st.write_stream(generator_func())
            
            # Add the complete response to history
            add_message("assistant", response_text)
            
            # Handle special content types after streaming
            if hasattr(st.session_state, 'last_viz'):
                try:
                    viz_data = st.session_state.last_viz
                    if isinstance(viz_data, dict) and "traces" in viz_data:
                        try:
                            import plotly.graph_objects as go
                            fig = go.Figure()
                            for trace in viz_data.get("traces", []):
                                fig.add_trace(go.Scatter(
                                    x=trace.get("x", []),
                                    y=trace.get("y", []),
                                    mode=trace.get("mode", "lines"),
                                    name=trace.get("name", "Data")
                                ))
                            fig.update_layout(
                                title=viz_data.get("title", "Visualization"),
                                xaxis_title=viz_data.get("layout", {}).get("xaxis_title", "X"),
                                yaxis_title=viz_data.get("layout", {}).get("yaxis_title", "Y")
                            )
                            st.plotly_chart(fig, use_container_width=True)
                        except ImportError:
                            st.json(viz_data)
                    delattr(st.session_state, 'last_viz')
                except Exception as e:
                    st.error(f"Error displaying visualization: {e}")
            
            if hasattr(st.session_state, 'last_table'):
                try:
                    table_data = st.session_state.last_table
                    if isinstance(table_data, dict) and "rows" in table_data:
                        import pandas as pd
                        df = pd.DataFrame(table_data["rows"])
                        st.dataframe(df, use_container_width=True)
                    delattr(st.session_state, 'last_table')
                except Exception as e:
                    st.error(f"Error displaying table: {e}")
        
        st.rerun()
    
    # Handle quick queries
    if st.session_state.get("quick_query"):
        prompt = st.session_state.quick_query
        del st.session_state.quick_query
        
        # Add user message
        add_message("user", prompt)
        
        # Send to WebSocket
        with st.spinner(f"🤖 Processing in {st.session_state.ai_mode} mode..."):
            asyncio.run(send_message_to_ws(prompt, st.session_state.ai_mode))
        
        st.rerun()

if __name__ == "__main__":
    main()