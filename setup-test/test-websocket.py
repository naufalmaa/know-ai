#!/usr/bin/env python3
"""
Quick WebSocket Connection Test
Tests if the WebSocket endpoint is accessible from the frontend
"""

import asyncio
import json
try:
    import websockets
except ImportError:
    print("❌ websockets library not installed. Installing...")
    import subprocess
    subprocess.check_call(["pip", "install", "websockets"])
    import websockets

async def check_chat_service():
    """Check if chat service is running on port 8000"""
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get('http://127.0.0.1:8000/', timeout=aiohttp.ClientTimeout(total=3)) as response:
                print(f"✅ Chat service responding on port 8000 (status: {response.status})")
                return True
    except ImportError:
        # Fallback to basic socket check
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        result = sock.connect_ex(('127.0.0.1', 8000))
        sock.close()
        if result == 0:
            print("✅ Port 8000 is open")
            return True
        else:
            print("❌ Port 8000 is not accessible")
            return False
    except Exception as e:
        print(f"❌ Cannot reach chat service on port 8000: {e}")
        return False

async def test_websocket_connection():
    """Test WebSocket connection to chat service"""
    try:
        print("🔍 Testing WebSocket connection to ws://127.0.0.1:8000/ws...")
        
        # Try connecting without timeout parameter first (for compatibility)
        try:
            async with websockets.connect('ws://127.0.0.1:8000/ws') as websocket:
                print("✅ WebSocket connected successfully!")
                
                # Send a test message
                test_message = {
                    "user_id": "test-user",
                    "conversation_id": "test-conv",
                    "query": "Hello, testing connection",
                    "file_id": None
                }
                
                print("📤 Sending test message...")
                await websocket.send(json.dumps(test_message))
                
                print("👂 Listening for response...")
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    message = json.loads(response)
                    print(f"📨 Received: {message['type']}")
                    
                    if message['type'] == 'agno_status':
                        print(f"   Status: {message['payload']}")
                    
                    print("✅ WebSocket communication working!")
                    return True
                    
                except asyncio.TimeoutError:
                    print("⚠️  No response received (but connection works)")
                    return True
        
        except Exception as connect_error:
            print(f"❌ WebSocket connection failed: {connect_error}")
            return False
                
    except ConnectionRefusedError:
        print("❌ Connection refused - Chat service not running on port 8000")
        print("   Make sure the chat service is running with: python services/chat/app.py")
        return False
    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")
        print(f"   Error type: {type(e).__name__}")
        return False

async def main():
    print("🧪 WebSocket Connection Test\n")
    
    # First check if chat service is running
    print("🔍 Step 1: Checking if chat service is running...")
    service_running = await check_chat_service()
    
    if not service_running:
        print("\n🔧 Chat service is not running. Please start it with:")
        print("   cd services/chat && python app.py")
        print("   OR check if it's running on a different port")
        return
    
    print("\n🔍 Step 2: Testing WebSocket connection...")
    success = await test_websocket_connection()
    
    if success:
        print("\n🎉 WebSocket is ready!")
        print("   Your frontend at localhost:3000 should now connect properly.")
        print("   Try accessing the assistant section again.")
    else:
        print("\n🔧 WebSocket connection failed.")
        print("   Please ensure the chat service is running on port 8000.")

if __name__ == "__main__":
    asyncio.run(main())