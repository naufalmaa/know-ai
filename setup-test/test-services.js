// Test script to verify services are working
// import fetch from 'node:fetch'

async function testServices() {
  console.log('🧪 Testing Know-AI Services...\n')
  
  // Test Ingest Service
  try {
    const ingestResponse = await fetch('http://127.0.0.1:9009/')
    console.log(`✅ Ingest Service (9009): ${ingestResponse.status} ${ingestResponse.statusText}`)
  } catch (error) {
    console.log(`❌ Ingest Service (9009): ${error.message}`)
  }
  
  // Test Chat Service  
  try {
    const chatResponse = await fetch('http://127.0.0.1:8000/')
    console.log(`✅ Chat Service (8000): ${chatResponse.status} ${chatResponse.statusText}`)
  } catch (error) {
    console.log(`❌ Chat Service (8000): ${error.message}`)
  }
  
  // Test LiteLLM
  try {
    const litellmResponse = await fetch('http://127.0.0.1:4001/')
    console.log(`✅ LiteLLM (4001): ${litellmResponse.status} ${litellmResponse.statusText}`)
  } catch (error) {
    console.log(`❌ LiteLLM (4001): ${error.message}`)
  }
  
  // Test API Server
  try {
    const apiResponse = await fetch('http://127.0.0.1:4000/api/health')
    console.log(`✅ API Server (4000): ${apiResponse.status} ${apiResponse.statusText}`)
  } catch (error) {
    console.log(`❌ API Server (4000): ${error.message}`)
  }
}

testServices()