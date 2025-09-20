// Test LiteLLM embeddings endpoint directly
// import fetch from 'node:fetch'

async function testLiteLLMEmbeddings() {
  console.log('🧪 Testing LiteLLM Embeddings...\n')
  
  try {
    const response = await fetch('http://127.0.0.1:4001/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer sk-local',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mxbai-embed-large:latest',
        input: ['Hello world', 'This is a test']
      })
    })
    
    console.log(`Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ LiteLLM embeddings successful!')
      console.log(`Embeddings received: ${data.data?.length || 0}`)
      if (data.data && data.data[0]) {
        console.log(`Embedding dimension: ${data.data[0].embedding?.length || 0}`)
      }
    } else {
      const errorText = await response.text()
      console.log('❌ LiteLLM embeddings failed:')
      console.log(errorText)
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message)
  }
}

async function testIngestService() {  
  console.log('\n🧪 Testing Ingest Service Embeddings...\n')
  
  try {
    const response = await fetch('http://127.0.0.1:9009/test/embed')
    console.log(`Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Ingest service test successful!')
      console.log(JSON.stringify(data, null, 2))
    } else {
      const errorText = await response.text()
      console.log('❌ Ingest service test failed:')
      console.log(errorText)
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message)
  }
}

async function main() {
  await testLiteLLMEmbeddings()
  await testIngestService()
}

main()