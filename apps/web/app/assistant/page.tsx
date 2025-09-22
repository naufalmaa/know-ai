'use client'

import { useEffect, useState } from 'react'

export default function AssistantPage() {
  const [streamlitUrl, setStreamlitUrl] = useState('http://localhost:8501')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check if Streamlit is available
    const checkStreamlit = async () => {
      try {
        const response = await fetch('http://localhost:8501/_stcore/health', { mode: 'no-cors' })
        setIsLoaded(true)
      } catch (error) {
        console.log('Streamlit not yet available, retrying...')
        setTimeout(checkStreamlit, 2000)
      }
    }

    checkStreamlit()
  }, [])

  return (
    <div className="h-screen w-full bg-gray-50">
      {!isLoaded && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">Loading AI Assistant...</h2>
            <p className="text-gray-500 mt-2">Starting Streamlit interface</p>
            <div className="mt-4 text-sm text-gray-400">
              Make sure the Streamlit service is running on port 8501
            </div>
          </div>
        </div>
      )}
      
      <iframe
        src={streamlitUrl}
        className={`w-full h-full border-0 ${isLoaded ? 'block' : 'hidden'}`}
        title="Zara AI Assistant"
        allow="microphone; camera"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          console.error('Failed to load Streamlit iframe')
          setIsLoaded(true) // Show iframe anyway to display error
        }}
      />
    </div>
  )
}