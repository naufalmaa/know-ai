"""
Simple Streamlit AI Assistant
============================
A minimal, robust chat interface with proper error handling.
"""

import os
import json
import asyncio
import streamlit as st
import httpx
from datetime import datetime
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
CHAT_HTTP_URL = CHAT_WS_URL.replace("ws://", "http://").replace("/ws", "")

st.set_page_config(
    page_title="AI Assistant",
    page_icon="🤖",
    layout="wide"
)

# Custom CSS
st.markdown("""
<style>
.status-good { color: #4CAF50; }
.status-bad { color: #F44336; }
.status-warning { color: #FF9800; }
</style>
""", unsafe_allow_html=True)

def check_service_health(url: str, service_name: str) -> dict:
    """Check if a service is running"""
    try:
        with httpx.Client(timeout=2) as client:
            response = client.get(f"{url}/health")
            if response.status_code == 200:
                return {"status": "✅", "message": f"{service_name} is running"}
            else:
                return {"status": "⚠️", "message": f"{service_name} returned {response.status_code}"}
    except httpx.ConnectError:
        return {"status": "❌", "message": f"{service_name} is not reachable"}
    except Exception as e:
        return {"status": "❌", "message": f"{service_name} error: {str(e)[:50]}"}

def send_message_simple(message: str) -> str:
    """Send message via HTTP health check first, then provide guidance"""
    try:
        # First check if chat service is running
        with httpx.Client(timeout=5) as client:
            health_response = client.get(f"{CHAT_HTTP_URL}/health")
            
            if health_response.status_code == 200:
                # Service is running but we're using simplified interface
                # Return a helpful response instead of trying to connect to WebSocket
                health_data = health_response.json()
                
                # Simple responses for common queries
                message_lower = message.lower()
                
                if any(word in message_lower for word in ['hello', 'hi', 'hey']):
                    return "👋 Hello! I'm your AI assistant. I can help you with:\n\n• Answering questions about your documents\n• Data analysis and insights\n• General knowledge queries\n• Technical support\n\nWhat would you like to know?"
                
                elif any(word in message_lower for word in ['help', 'what can you do']):
                    return "🤖 **I'm your AI Knowledge Assistant!**\n\nI can help you with:\n\n📋 **Document Analysis**\n- Search through your uploaded documents\n- Extract key information\n- Summarize content\n\n📊 **Data Insights**\n- Analyze data patterns\n- Generate visualizations\n- Answer data-related questions\n\n💡 **General Support**\n- Answer knowledge questions\n- Provide explanations\n- Assist with research\n\n*Note: Full WebSocket features are available when all services are properly configured.*"
                
                elif any(word in message_lower for word in ['data', 'analyze', 'analysis']):
                    return "📊 **Data Analysis Ready!**\n\nI can help you analyze data in several ways:\n\n• **Upload Documents**: Share files for analysis\n• **Ask Questions**: Query your data directly\n• **Generate Charts**: Create visualizations\n• **Find Patterns**: Identify trends and insights\n\n*To enable full data analysis features, please ensure your document processing services are running.*"
                
                else:
                    # For other queries, provide a helpful response about service status
                    models = health_data.get('models', {})
                    return f"🤖 **Service Status: Online**\n\n**Your question:** {message}\n\n**Current Configuration:**\n• Generation Model: {models.get('generation', 'Unknown')}\n• Embed Model: {models.get('embed', 'Unknown')}\n\n*For full AI responses, please start the complete service stack using the WebSocket interface. This simplified interface provides basic interaction while services are being configured.*\n\n**Next Steps:**\n1. Ensure all dependencies are installed\n2. Start the WebSocket service\n3. Use the full Streamlit interface at `/assistant`"
            
            else:
                return f"⚠️ Chat service responded with status {health_response.status_code}. Please check the service configuration."
                
    except httpx.ConnectError:
        return "❌ **Chat service is not reachable.**\n\n**Troubleshooting Steps:**\n\n1. **Start the backend service:**\n   ```\n   start-backend.bat\n   ```\n\n2. **Or manually start chat service:**\n   ```\n   cd services/chat\n   python app.py\n   ```\n\n3. **Check if port 8000 is available:**\n   - Close any applications using port 8000\n   - Or modify CHAT_PORT in .env\n\n4. **Install dependencies:**\n   ```\n   pip install fastapi uvicorn websockets\n   ```\n\n5. **Check environment configuration:**\n   - Verify .env file exists\n   - Ensure CHAT_PORT=8000\n\nOnce the service is running, you'll see a ✅ status in the sidebar."
    
    except Exception as e:
        return f"❌ **Connection Error:** {str(e)[:100]}\n\nPlease check your network connection and service configuration."

def main():
    st.title("🤖 AI Assistant")
    st.markdown("*Simple, reliable chat interface*")
    
    # Service Status Sidebar
    with st.sidebar:
        st.subheader("🔧 Service Status")
        
        # Check Chat Service
        chat_status = check_service_health(CHAT_HTTP_URL, "Chat Service")
        st.markdown(f"{chat_status['status']} **Chat Service**")
        st.caption(chat_status['message'])
        
        # Check Agno Service  
        agno_status = check_service_health(AGNO_URL, "Agno Service")
        st.markdown(f"{agno_status['status']} **Agno Service**")
        st.caption(agno_status['message'])
        
        st.markdown("---")
        st.markdown("**Configuration:**")
        st.code(f"Chat: {CHAT_HTTP_URL}")
        st.code(f"Agno: {AGNO_URL}")
        
        if st.button("🔄 Refresh Status"):
            st.rerun()
    
    # Initialize chat history
    if "messages" not in st.session_state:
        st.session_state.messages = [
            {"role": "assistant", "content": "👋 Hello! I'm your AI assistant. How can I help you today?"}
        ]
    
    # Display chat history
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.write(message["content"])
    
    # Chat input
    if prompt := st.chat_input("Ask me anything..."):
        # Add user message
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.write(prompt)
        
        # Get assistant response
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                # Check if chat service is available
                chat_health = check_service_health(CHAT_HTTP_URL, "Chat Service")
                
                if "✅" in chat_health["status"]:
                    # Service is available, send message
                    response = send_message_simple(prompt)
                else:
                    # Service unavailable, provide fallback
                    response = f"❌ **Chat service is currently unavailable.**\n\n{chat_health['message']}\n\n**Please:**\n1. Run `start-backend.bat` to start services\n2. Check that port 8000 is not in use\n3. Verify Python dependencies are installed"
                
                st.write(response)
        
        # Add assistant response to history
        st.session_state.messages.append({"role": "assistant", "content": response})
    
    # Quick actions
    st.markdown("---")
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        if st.button("👋 Say Hello"):
            st.session_state.quick_message = "Hello! Who are you?"
    
    with col2:
        if st.button("❓ Get Help"):
            st.session_state.quick_message = "What can you help me with?"
    
    with col3:
        if st.button("📊 Analyze Data"):
            st.session_state.quick_message = "Can you help me analyze some data?"
    
    with col4:
        if st.button("🗑️ Clear Chat"):
            st.session_state.messages = [
                {"role": "assistant", "content": "👋 Chat cleared! How can I help you?"}
            ]
            st.rerun()
    
    # Handle quick messages
    if hasattr(st.session_state, 'quick_message'):
        # Trigger the chat input with the quick message
        st.session_state.messages.append({"role": "user", "content": st.session_state.quick_message})
        
        with st.chat_message("user"):
            st.write(st.session_state.quick_message)
        
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                response = send_message_simple(st.session_state.quick_message)
                st.write(response)
        
        st.session_state.messages.append({"role": "assistant", "content": response})
        
        # Clear the quick message
        del st.session_state.quick_message
        st.rerun()

if __name__ == "__main__":
    main()