// Test script to verify the upload endpoints
// import fetch from 'node:fetch'

async function testUpload() {
  try {
    console.log('Testing S3 debug endpoint...')
    const debugResponse = await fetch('http://127.0.0.1:4000/api/debug/s3-config')
    const debugData = await debugResponse.json()
    console.log('S3 Config:', debugData)

    console.log('\nTesting presign endpoint...')
    const presignResponse = await fetch('http://127.0.0.1:4000/api/uploads/presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: 'test.txt',
        mime_type: 'text/plain',
        folder_id: null
      })
    })

    if (presignResponse.ok) {
      const presignData = await presignResponse.json()
      console.log('✅ Presign successful!')
      console.log('File ID:', presignData.file.id)
      console.log('Upload URL:', presignData.presign.url)
    } else {
      const errorText = await presignResponse.text()
      console.log('❌ Presign failed:', presignResponse.status, errorText)
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testUpload()