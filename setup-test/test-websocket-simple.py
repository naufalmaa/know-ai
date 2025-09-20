#!/usr/bin/env python3
"""
Simple WebSocket Connection Test - Compatible Version
"""

import asyncio
import json
import socket

def check_port_open(host, port):
    """Check if a port is open using socket"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception:
        return False

async def simple_websocket_test():
    """Simple WebSocket test using websockets library"""
    try:
        # Import websockets with error handling
        try:
            import websockets
        except ImportError:
            print("❌ websockets library not found. Installing...")
            import subprocess
            subprocess.check_call(["pip", "install", "websockets>=10.0"])
            import websockets
        
        print("🔍 Testing WebSocket connection to ws://127.0.0.1:8000/ws...")
        
        # Simple connection test
        websocket = await websockets.connect('ws://127.0.0.1:8000/ws')
        print("✅ WebSocket connected successfully!")
        
        # Send test message
        test_message = {
            "user_id": "test-user",
            "conversation_id": "test-conv",
            "query": "Hello WebSocket test",
            "file_id": None
        }
        
        print("📤 Sending test message...")
        await websocket.send(json.dumps(test_message))
        
        # Try to receive a response
        try:
            response = await asyncio.wait_for(websocket.recv(), timeout=3.0)
            message = json.loads(response)
            print(f"📨 Received response: {message['type']}")
            
            if message.get('type') == 'agno_status':
                print(f"   Agno Status: {message.get('payload', 'Unknown')}")
                print("✅ Agno integration is working!")
            
        except asyncio.TimeoutError:
            print("⚠️  No response received in 3 seconds (connection still works)")
        
        await websocket.close()
        print("✅ WebSocket test completed successfully!")
        return True
        
    except ConnectionRefusedError:
        print("❌ Connection refused - Chat service not running on port 8000")
        return False
    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")
        print(f"   Error details: {type(e).__name__}")
        return False

def main():
    print("🧪 Simple WebSocket Connection Test\n")
    
    # Check if port 8000 is open
    print("🔍 Step 1: Checking if port 8000 is accessible...")
    if check_port_open('127.0.0.1', 8000):
        print("✅ Port 8000 is open")
    else:
        print("❌ Port 8000 is not accessible")
        print("   Please start the chat service: cd services/chat && python app.py")
        return
    
    # Test WebSocket connection
    print("\n🔍 Step 2: Testing WebSocket connection...")
    try:
        success = asyncio.run(simple_websocket_test())
        
        if success:
            print("\n🎉 WebSocket connection is working!")
            print("   Your frontend should now be able to connect properly.")
            print("   Try refreshing localhost:3000/assistant")
        else:
            print("\n🔧 WebSocket connection failed.")
            print("   Check the chat service logs for errors.")
            
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")

if __name__ == "__main__":
    main()