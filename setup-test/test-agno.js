// Comprehensive test for Agno AI Agent Service
// import fetch from 'node:fetch'

async function testAgnoService() {
  console.log('🤖 Testing Agno AI Agent Service...\n')
  
  const baseUrl = 'http://127.0.0.1:9010'
  
  // Test 1: Health Check
  console.log('1️⃣ Testing Health Check...')
  try {
    const response = await fetch(`${baseUrl}/health`)
    const data = await response.json()
    console.log(`✅ Health: ${data.status} (LLM: ${data.llm_connectivity})`)
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`)
    return
  }
  
  // Test 2: Service Info
  console.log('\n2️⃣ Testing Service Info...')
  try {
    const response = await fetch(`${baseUrl}/`)
    const data = await response.json()
    console.log(`✅ Service: ${data.service} v${data.version}`)
    console.log(`   Agents: ${data.agents.join(', ')}`)
    console.log(`   Primary Model: ${data.models.primary}`)
  } catch (error) {
    console.log(`❌ Service info failed: ${error.message}`)
  }
  
  // Test 3: Prompt Restructuring Agent
  console.log('\n3️⃣ Testing Prompt Restructuring Agent...')
  try {
    const response = await fetch(`${baseUrl}/agent/restructure-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        original_prompt: "tell me about oil production",
        context: "User is asking about petroleum industry data",
        domain: "petroleum_engineering"
      })
    })
    
    const data = await response.json()
    if (data.success) {
      console.log(`✅ Prompt Restructuring: ${data.confidence_score.toFixed(2)} confidence`)
      console.log(`   Original: "tell me about oil production"`)
      console.log(`   Enhanced: "${data.processed_output.substring(0, 150)}..."`)
      console.log(`   Reasoning: ${data.reasoning.substring(0, 100)}...`)
    } else {
      console.log(`❌ Prompt restructuring failed: ${data.reasoning}`)
    }
  } catch (error) {
    console.log(`❌ Prompt restructuring test failed: ${error.message}`)
  }
  
  // Test 4: Response Evaluation Agent
  console.log('\n4️⃣ Testing Response Evaluation Agent...')
  try {
    const response = await fetch(`${baseUrl}/agent/evaluate-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_content: "Oil production involves extracting crude oil from underground reservoirs through drilling operations.",
        original_prompt: "tell me about oil production",
        response_format: "text",
        evaluation_criteria: ["clarity", "completeness", "technical_accuracy"]
      })
    })
    
    const data = await response.json()
    if (data.success) {
      console.log(`✅ Response Evaluation: ${data.confidence_score.toFixed(2)} confidence`)
      console.log(`   Original Response: "Oil production involves extracting crude oil..."`)
      console.log(`   Improved: "${data.processed_output.substring(0, 150)}..."`)
      console.log(`   Suggestions: ${data.suggestions.length} improvements identified`)
    } else {
      console.log(`❌ Response evaluation failed: ${data.reasoning}`)
    }
  } catch (error) {
    console.log(`❌ Response evaluation test failed: ${error.message}`)
  }
  
  // Test 5: Multi-Agent Pipeline
  console.log('\n5️⃣ Testing Multi-Agent Pipeline...')
  try {
    const response = await fetch(`${baseUrl}/agent/multi-agent-process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: "show me production data trends",
        context: "User wants to analyze petroleum production metrics",
        domain: "data_analysis"
      })
    })
    
    const data = await response.json()
    if (data.success) {
      const results = data.pipeline_results
      console.log(`✅ Multi-Agent Pipeline: Complete`)
      console.log(`   Original: "${results.original_prompt}"`)
      console.log(`   Restructured: "${results.restructured_prompt.substring(0, 100)}..."`)
      console.log(`   Restructure Confidence: ${results.restructure_confidence.toFixed(2)}`)
      console.log(`   Evaluation Confidence: ${results.evaluation_confidence.toFixed(2)}`)
      console.log(`   Prompt Suggestions: ${results.suggestions.prompt_improvements.length}`)
      console.log(`   Response Suggestions: ${results.suggestions.response_improvements.length}`)
    } else {
      console.log(`❌ Multi-agent pipeline failed: ${data.error}`)
    }
  } catch (error) {
    console.log(`❌ Multi-agent pipeline test failed: ${error.message}`)
  }
  
  // Test 6: Quick Agent Test
  console.log('\n6️⃣ Testing Quick Agent Test...')
  try {
    const response = await fetch(`${baseUrl}/test/agents`)
    const data = await response.json()
    
    console.log(`✅ Quick Tests Completed:`)
    console.log(`   Prompt Restructuring: ${data.test_results.prompt_restructuring.success ? '✅' : '❌'} (${data.test_results.prompt_restructuring.confidence.toFixed(2)})`)
    console.log(`   Response Evaluation: ${data.test_results.response_evaluation.success ? '✅' : '❌'} (${data.test_results.response_evaluation.confidence.toFixed(2)})`)
  } catch (error) {
    console.log(`❌ Quick agent test failed: ${error.message}`)
  }
  
  console.log('\n🎉 Agno AI Agent Service testing completed!')
}

testAgnoService()