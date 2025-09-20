#!/usr/bin/env node

/**
 * Comprehensive Integration Test for Know-AI with Agno
 * Tests the complete pipeline: Frontend -> Chat Service -> Agno Agents -> LiteLLM
 */

const WebSocket = require('ws');

// Configuration
const CHAT_WS_URL = 'ws://127.0.0.1:9001/ws';
const AGNO_BASE_URL = 'http://127.0.0.1:9010';
const LITELLM_BASE_URL = 'http://127.0.0.1:8000';

// Test Colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Test individual services
async function testServiceHealth(name, url) {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, { 
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      log(`✅ ${name} service: HEALTHY`, colors.green);
      return true;
    } else {
      log(`❌ ${name} service: UNHEALTHY (${response.status})`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ ${name} service: ERROR - ${error.message}`, colors.red);
    return false;
  }
}

// Test Agno Agents
async function testAgnoAgents() {
  log('\n🤖 Testing Agno AI Agents...', colors.cyan);
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Test Prompt Restructuring Agent
    log('   Testing Prompt Restructuring Agent...', colors.yellow);
    const promptResponse = await fetch(`${AGNO_BASE_URL}/agent/restructure-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        original_prompt: "Show me oil production data",
        context: "User is querying petroleum engineering data",
        domain: "knowledge_retrieval"
      }),
      timeout: 10000
    });
    
    if (promptResponse.ok) {
      const promptData = await promptResponse.json();
      log(`   ✅ Prompt Agent: Enhanced "${promptData.processed_output}"`, colors.green);
      log(`   📊 Confidence: ${(promptData.confidence_score * 100).toFixed(1)}%`, colors.blue);
    } else {
      log(`   ❌ Prompt Agent: Failed (${promptResponse.status})`, colors.red);
    }
    
    // Test Response Evaluation Agent
    log('   Testing Response Evaluation Agent...', colors.yellow);
    const evalResponse = await fetch(`${AGNO_BASE_URL}/agent/evaluate-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_content: "Oil production data shows increasing trends in Q3 2024.",
        original_prompt: "Show me oil production data",
        response_format: "text",
        evaluation_criteria: ["clarity", "completeness", "relevance"]
      }),
      timeout: 10000
    });
    
    if (evalResponse.ok) {
      const evalData = await evalResponse.json();
      log(`   ✅ Evaluation Agent: Processed successfully`, colors.green);
      log(`   📊 Confidence: ${(evalData.confidence_score * 100).toFixed(1)}%`, colors.blue);
    } else {
      log(`   ❌ Evaluation Agent: Failed (${evalResponse.status})`, colors.red);
    }
    
  } catch (error) {
    log(`   ❌ Agno Agents Test: ${error.message}`, colors.red);
  }
}

// Test WebSocket Chat Integration
function testChatIntegration() {
  return new Promise((resolve) => {
    log('\n💬 Testing Chat Service with Agno Integration...', colors.cyan);
    
    const ws = new WebSocket(CHAT_WS_URL);
    const messageLog = [];
    let testStarted = false;
    
    const timeout = setTimeout(() => {
      log('❌ Chat integration test timed out', colors.red);
      ws.close();
      resolve(false);
    }, 30000);
    
    ws.on('open', () => {
      log('   🔗 WebSocket connected', colors.green);
      
      // Send test query
      const testQuery = {
        user_id: 'test-user',
        conversation_id: 'test-conv',
        query: 'What is the current oil production status?',
        file_id: null
      };
      
      log('   📤 Sending test query...', colors.yellow);
      ws.send(JSON.stringify(testQuery));
      testStarted = true;
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        messageLog.push(message);
        
        // Log different message types with appropriate styling
        switch (message.type) {
          case 'agno_status':
            log(`   🔄 ${message.payload} (${message.stage})`, colors.yellow);
            break;
          case 'agno_enhancement':
            log(`   🔧 Prompt enhanced: "${message.payload.enhanced}"`, colors.blue);
            log(`   📊 Enhancement confidence: ${(message.payload.confidence * 100).toFixed(1)}%`, colors.cyan);
            break;
          case 'agno_evaluation':
            log(`   ✅ Response evaluated - Improvements: ${message.payload.improvements_made}`, colors.green);
            break;
          case 'answer':
            log(`   💬 Answer: ${message.payload.substring(0, 100)}...`, colors.green);
            break;
          case 'answer_enhanced':
            log(`   🚀 Enhanced Answer: ${message.payload.substring(0, 100)}...`, colors.green);
            break;
          case 'result':
            log(`   📄 Retrieved ${message.payload.objects?.length || 0} document chunks`, colors.blue);
            break;
          case 'heartbeat':
            // Skip heartbeat logs
            break;
          default:
            log(`   📝 ${message.type}: ${JSON.stringify(message).substring(0, 100)}...`, colors.reset);
        }
        
        // Check if we received the expected Agno message types
        const hasAgnoEnhancement = messageLog.some(m => m.type === 'agno_enhancement');
        const hasAgnoEvaluation = messageLog.some(m => m.type === 'agno_evaluation');
        const hasAnswer = messageLog.some(m => m.type === 'answer' || m.type === 'answer_enhanced');
        
        if (hasAgnoEnhancement && hasAnswer) {
          clearTimeout(timeout);
          log('\n✅ Chat Integration Test: SUCCESS!', colors.green);
          log('   🎯 All expected message types received:', colors.cyan);
          log(`   - Agno Enhancement: ${hasAgnoEnhancement ? '✅' : '❌'}`, colors.blue);
          log(`   - Agno Evaluation: ${hasAgnoEvaluation ? '✅' : '❌'}`, colors.blue);
          log(`   - Response: ${hasAnswer ? '✅' : '❌'}`, colors.blue);
          
          ws.close();
          resolve(true);
        }
        
      } catch (error) {
        log(`   ❌ Message parsing error: ${error.message}`, colors.red);
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      log(`❌ WebSocket error: ${error.message}`, colors.red);
      resolve(false);
    });
    
    ws.on('close', () => {
      if (!testStarted) {
        clearTimeout(timeout);
        log('❌ WebSocket closed before test could start', colors.red);
        resolve(false);
      }
    });
  });
}

// Main test runner
async function runIntegrationTest() {
  log(`${colors.bold}🧪 Know-AI + Agno Integration Test Suite${colors.reset}\n`);
  
  // Test service health
  log('🏥 Testing Service Health...', colors.cyan);
  const agnoHealthy = await testServiceHealth('Agno', `${AGNO_BASE_URL}/health`);
  const litellmHealthy = await testServiceHealth('LiteLLM', `${LITELLM_BASE_URL}/health`);
  
  if (!agnoHealthy) {
    log('\n❌ Agno service is not available. Please start it with: .\\start-agno.ps1', colors.red);
    return;
  }
  
  if (!litellmHealthy) {
    log('\n⚠️  LiteLLM service is not available. Some features may not work.', colors.yellow);
  }
  
  // Test Agno agents
  await testAgnoAgents();
  
  // Test chat integration
  const chatSuccess = await testChatIntegration();
  
  // Final summary
  log('\n' + '='.repeat(60), colors.cyan);
  log(`${colors.bold}🎯 Integration Test Summary:${colors.reset}`, colors.cyan);
  log(`  Agno Service: ${agnoHealthy ? '✅ PASS' : '❌ FAIL'}`, agnoHealthy ? colors.green : colors.red);
  log(`  LiteLLM Service: ${litellmHealthy ? '✅ PASS' : '⚠️  WARN'}`, litellmHealthy ? colors.green : colors.yellow);
  log(`  Chat Integration: ${chatSuccess ? '✅ PASS' : '❌ FAIL'}`, chatSuccess ? colors.green : colors.red);
  
  const overallSuccess = agnoHealthy && chatSuccess;
  log(`\n${colors.bold}Overall Status: ${overallSuccess ? '🎉 SUCCESS!' : '❌ FAILED'}${colors.reset}`, 
      overallSuccess ? colors.green : colors.red);
  
  if (overallSuccess) {
    log('\n🚀 Your Know-AI system with Agno integration is fully operational!', colors.green);
    log('   Frontend will now display enhanced prompts and improved responses.', colors.cyan);
  } else {
    log('\n🔧 Please address the failing components before using the system.', colors.yellow);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`❌ Uncaught Exception: ${error.message}`, colors.red);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection: ${reason}`, colors.red);
  process.exit(1);
});

// Run the test
runIntegrationTest().catch((error) => {
  log(`❌ Test suite failed: ${error.message}`, colors.red);
  process.exit(1);
});