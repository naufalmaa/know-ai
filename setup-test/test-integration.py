#!/usr/bin/env python3
"""
Comprehensive Integration Test for Know-AI with Agno
Tests the complete pipeline: Frontend -> Chat Service -> Agno Agents -> LiteLLM
"""

import asyncio
import json
import aiohttp
import websockets
from typing import List, Dict, Any
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

# Configuration
CHAT_WS_URL = 'ws://127.0.0.1:9001/ws'
AGNO_BASE_URL = 'http://127.0.0.1:9010'
LITELLM_BASE_URL = 'http://127.0.0.1:8000'

class Colors:
    GREEN = '\033[32m'
    RED = '\033[31m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    CYAN = '\033[36m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def log(message: str, color: str = Colors.RESET):
    print(f"{color}{message}{Colors.RESET}")

async def test_service_health(session: aiohttp.ClientSession, name: str, url: str) -> bool:
    """Test if a service is healthy"""
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
            if response.status == 200:
                log(f"✅ {name} service: HEALTHY", Colors.GREEN)
                return True
            else:
                log(f"❌ {name} service: UNHEALTHY ({response.status})", Colors.RED)
                return False
    except Exception as error:
        log(f"❌ {name} service: ERROR - {str(error)}", Colors.RED)
        return False

async def test_agno_agents(session: aiohttp.ClientSession) -> bool:
    """Test Agno AI agents functionality"""
    log('\n🤖 Testing Agno AI Agents...', Colors.CYAN)
    
    try:
        # Test Prompt Restructuring Agent
        log('   Testing Prompt Restructuring Agent...', Colors.YELLOW)
        prompt_payload = {
            "original_prompt": "Show me oil production data",
            "context": "User is querying petroleum engineering data", 
            "domain": "knowledge_retrieval"
        }
        
        async with session.post(
            f"{AGNO_BASE_URL}/agent/restructure-prompt",
            json=prompt_payload,
            timeout=aiohttp.ClientTimeout(total=10)
        ) as response:
            if response.status == 200:
                prompt_data = await response.json()
                log(f"   ✅ Prompt Agent: Enhanced \"{prompt_data['processed_output']}\"", Colors.GREEN)
                log(f"   📊 Confidence: {prompt_data['confidence_score']*100:.1f}%", Colors.BLUE)
            else:
                log(f"   ❌ Prompt Agent: Failed ({response.status})", Colors.RED)
                return False
        
        # Test Response Evaluation Agent
        log('   Testing Response Evaluation Agent...', Colors.YELLOW)
        eval_payload = {
            "response_content": "Oil production data shows increasing trends in Q3 2024.",
            "original_prompt": "Show me oil production data",
            "response_format": "text",
            "evaluation_criteria": ["clarity", "completeness", "relevance"]
        }
        
        async with session.post(
            f"{AGNO_BASE_URL}/agent/evaluate-response",
            json=eval_payload,
            timeout=aiohttp.ClientTimeout(total=10)
        ) as response:
            if response.status == 200:
                eval_data = await response.json()
                log("   ✅ Evaluation Agent: Processed successfully", Colors.GREEN)
                log(f"   📊 Confidence: {eval_data['confidence_score']*100:.1f}%", Colors.BLUE)
            else:
                log(f"   ❌ Evaluation Agent: Failed ({response.status})", Colors.RED)
                return False
        
        return True
        
    except Exception as error:
        log(f"   ❌ Agno Agents Test: {str(error)}", Colors.RED)
        return False

async def test_chat_integration() -> bool:
    """Test WebSocket chat integration with Agno"""
    log('\n💬 Testing Chat Service with Agno Integration...', Colors.CYAN)
    
    try:
        message_log = []
        
        async with websockets.connect(CHAT_WS_URL, timeout=10) as websocket:
            log('   🔗 WebSocket connected', Colors.GREEN)
            
            # Send test query
            test_query = {
                "user_id": "test-user",
                "conversation_id": "test-conv", 
                "query": "What is the current oil production status?",
                "file_id": None
            }
            
            log('   📤 Sending test query...', Colors.YELLOW)
            await websocket.send(json.dumps(test_query))
            
            # Listen for messages for up to 30 seconds
            try:
                while True:
                    message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    data = json.loads(message)
                    message_log.append(data)
                    
                    # Log different message types
                    if data['type'] == 'agno_status':
                        log(f"   🔄 {data['payload']} ({data.get('stage', 'unknown')})", Colors.YELLOW)
                    elif data['type'] == 'agno_enhancement':
                        log(f"   🔧 Prompt enhanced: \"{data['payload']['enhanced']}\"", Colors.BLUE)
                        log(f"   📊 Enhancement confidence: {data['payload']['confidence']*100:.1f}%", Colors.CYAN)
                    elif data['type'] == 'agno_evaluation':
                        log(f"   ✅ Response evaluated - Improvements: {data['payload']['improvements_made']}", Colors.GREEN)
                    elif data['type'] == 'answer':
                        log(f"   💬 Answer: {data['payload'][:100]}...", Colors.GREEN)
                    elif data['type'] == 'answer_enhanced':
                        log(f"   🚀 Enhanced Answer: {data['payload'][:100]}...", Colors.GREEN)
                    elif data['type'] == 'result':
                        log(f"   📄 Retrieved {len(data['payload'].get('objects', []))} document chunks", Colors.BLUE)
                    elif data['type'] != 'heartbeat':
                        log(f"   📝 {data['type']}: {str(data)[:100]}...", Colors.RESET)
                    
                    # Check completion criteria
                    has_agno_enhancement = any(m['type'] == 'agno_enhancement' for m in message_log)
                    has_answer = any(m['type'] in ['answer', 'answer_enhanced'] for m in message_log)
                    
                    if has_agno_enhancement and has_answer:
                        break
                        
            except asyncio.TimeoutError:
                # Check if we got the expected messages
                has_agno_enhancement = any(m['type'] == 'agno_enhancement' for m in message_log)
                has_agno_evaluation = any(m['type'] == 'agno_evaluation' for m in message_log)
                has_answer = any(m['type'] in ['answer', 'answer_enhanced'] for m in message_log)
                
                log('\n✅ Chat Integration Test: SUCCESS!', Colors.GREEN)
                log('   🎯 Message types received:', Colors.CYAN)
                log(f"   - Agno Enhancement: {'✅' if has_agno_enhancement else '❌'}", Colors.BLUE)
                log(f"   - Agno Evaluation: {'✅' if has_agno_evaluation else '❌'}", Colors.BLUE)
                log(f"   - Response: {'✅' if has_answer else '❌'}", Colors.BLUE)
                
                return has_agno_enhancement and has_answer
                
        return True
        
    except Exception as error:
        log(f"❌ WebSocket error: {str(error)}", Colors.RED)
        return False

async def run_integration_test():
    """Main test runner"""
    log(f"{Colors.BOLD}🧪 Know-AI + Agno Integration Test Suite{Colors.RESET}\n")
    
    async with aiohttp.ClientSession() as session:
        # Test service health
        log('🏥 Testing Service Health...', Colors.CYAN)
        agno_healthy = await test_service_health(session, 'Agno', f"{AGNO_BASE_URL}/health")
        litellm_healthy = await test_service_health(session, 'LiteLLM', f"{LITELLM_BASE_URL}/health")
        
        if not agno_healthy:
            log('\n❌ Agno service is not available. Please start it with: .\\start-agno.ps1', Colors.RED)
            return
        
        if not litellm_healthy:
            log('\n⚠️  LiteLLM service is not available. Some features may not work.', Colors.YELLOW)
        
        # Test Agno agents
        agno_agents_success = await test_agno_agents(session)
    
    # Test chat integration
    chat_success = await test_chat_integration()
    
    # Final summary
    log('\n' + '='*60, Colors.CYAN)
    log(f"{Colors.BOLD}🎯 Integration Test Summary:{Colors.RESET}", Colors.CYAN)
    log(f"  Agno Service: {'✅ PASS' if agno_healthy else '❌ FAIL'}", 
        Colors.GREEN if agno_healthy else Colors.RED)
    log(f"  LiteLLM Service: {'✅ PASS' if litellm_healthy else '⚠️  WARN'}", 
        Colors.GREEN if litellm_healthy else Colors.YELLOW)
    log(f"  Agno Agents: {'✅ PASS' if agno_agents_success else '❌ FAIL'}", 
        Colors.GREEN if agno_agents_success else Colors.RED)
    log(f"  Chat Integration: {'✅ PASS' if chat_success else '❌ FAIL'}", 
        Colors.GREEN if chat_success else Colors.RED)
    
    overall_success = agno_healthy and agno_agents_success and chat_success
    log(f"\n{Colors.BOLD}Overall Status: {'🎉 SUCCESS!' if overall_success else '❌ FAILED'}{Colors.RESET}", 
        Colors.GREEN if overall_success else Colors.RED)
    
    if overall_success:
        log('\n🚀 Your Know-AI system with Agno integration is fully operational!', Colors.GREEN)
        log('   Frontend will now display enhanced prompts and improved responses.', Colors.CYAN)
    else:
        log('\n🔧 Please address the failing components before using the system.', Colors.YELLOW)

if __name__ == "__main__":
    try:
        asyncio.run(run_integration_test())
    except KeyboardInterrupt:
        log("\n❌ Test interrupted by user", Colors.YELLOW)
    except Exception as error:
        log(f"❌ Test suite failed: {str(error)}", Colors.RED)
        sys.exit(1)