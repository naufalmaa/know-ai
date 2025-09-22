'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PlotCard from './PlotCard'
import TableCard from './TableCard'

// Simple chevron icons as inline SVGs
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
)

const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
  </svg>
)

const WS = process.env.NEXT_PUBLIC_CHAT_WS || 'ws://127.0.0.1:8000/ws'

type Chunk = { 
  text: string, 
  meta: { file_id: string, page: number, section: string } 
}

type ThoughtStage = {
  stage: string
  status: 'processing' | 'complete' | 'error'
  message: string
  details?: any
  timestamp?: number
}

type ChatMessage = {
  id: string
  type: 'user' | 'assistant' | 'loading' | 'thinking'
  content: string
  timestamp: number
  streaming?: boolean
  thoughtProcess?: ThoughtStage[]
  chunks?: Chunk[]
  visualizations?: any[]
  tables?: any[]
  isComplete?: boolean
  isLoading?: boolean
  isThinking?: boolean
}

type ConversationSession = {
  id: string
  title: string
  timestamp: number
  messages: ChatMessage[]
}

export default function EnhancedChatStream() {
  const [conversations, setConversations] = useState<ConversationSession[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string>('')
  const [input, setInput] = useState('')
  const [wsConnected, setWsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({})
  const [loadingMessageId, setLoadingMessageId] = useState<string>('')
  const [thinkingMessageId, setThinkingMessageId] = useState<string>('')
  const [responseMessageId, setResponseMessageId] = useState<string>('')
  
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const params = useSearchParams()
  const fileId = params.get('file_id') || undefined

  const currentMessages = useMemo(() => {
    if (!currentConversationId) return []
    return conversations.find(c => c.id === currentConversationId)?.messages || []
  }, [conversations, currentConversationId])

  const lastResult = useMemo(() => {
    const lastMessage = currentMessages[currentMessages.length - 1]
    return lastMessage?.chunks || []
  }, [currentMessages])

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentMessages])

  // WebSocket connection
  useEffect(() => {
    console.log('Connecting to WebSocket:', WS)
    const ws = new WebSocket(WS)
    
    ws.onopen = () => {
      console.log('WebSocket connected')
      setWsConnected(true)
    }
    
    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setWsConnected(false)
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setWsConnected(false)
    }
    
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'heartbeat') return

      setConversations(prevConvs => {
        if (!currentConversationId) return prevConvs
        
        return prevConvs.map(conv => {
          if (conv.id !== currentConversationId) return conv

          let newMessages = [...conv.messages]

          switch (msg.type) {
            // THOUGHT PROCESS COMPONENT - Show AI thinking stages
            case 'agno_status': {
              // Remove loading bubble and create thinking bubble if not exists
              if (loadingMessageId) {
                newMessages = newMessages.filter(m => m.id !== loadingMessageId)
                setLoadingMessageId('')
              }
              
              if (!thinkingMessageId) {
                const thinkingMsg: ChatMessage = {
                  id: crypto.randomUUID(),
                  type: 'thinking',
                  content: '',
                  timestamp: Date.now(),
                  isThinking: true,
                  thoughtProcess: []
                }
                setThinkingMessageId(thinkingMsg.id)
                newMessages.push(thinkingMsg)
              }
              
              // Add thought stage to thinking message
              const thinkingMsg = newMessages.find(m => m.id === thinkingMessageId)
              if (thinkingMsg && thinkingMsg.thoughtProcess) {
                const stage: ThoughtStage = {
                  stage: msg.stage || 'processing',
                  status: 'processing',
                  message: msg.payload,
                  timestamp: Date.now()
                }
                thinkingMsg.thoughtProcess.push(stage)
              }
              break
            }
          
            // CONTEXT RETRIEVAL - Add chunks to thinking message
            case 'result': {
              const thinkingMsg = newMessages.find(m => m.id === thinkingMessageId)
              if (thinkingMsg) {
                thinkingMsg.chunks = msg.payload.objects
              }
              break
            }
          
            // FINAL RESPONSE COMPONENT - Start streaming response
            case 'stream_start': {
              // Remove loading bubble if it exists
              if (loadingMessageId) {
                newMessages = newMessages.filter(m => m.id !== loadingMessageId)
                setLoadingMessageId('')
              }
              
              // Complete thinking stage if it exists
              const thinkingMsg = newMessages.find(m => m.id === thinkingMessageId)
              if (thinkingMsg && thinkingMsg.thoughtProcess) {
                thinkingMsg.thoughtProcess.forEach(stage => stage.status = 'complete')
                thinkingMsg.isThinking = false
                thinkingMsg.isComplete = true
              }
              
              // Create response bubble
              const responseMsg: ChatMessage = {
                id: crypto.randomUUID(),
                type: 'assistant',
                content: '',
                timestamp: Date.now(),
                streaming: true,
                isComplete: false,
                chunks: thinkingMsg?.chunks || [],
                visualizations: [],
                tables: []
              }
              setResponseMessageId(responseMsg.id)
              newMessages.push(responseMsg)
              setIsStreaming(true)
              break
            }
          
            // Streaming content
            case 'stream_chunk': {
              const responseMsg = newMessages.find(m => m.id === responseMessageId)
              if (responseMsg) {
                responseMsg.content += msg.payload
              }
              break
            }
            
            // End streaming
            case 'stream_end': {
              const responseMsg = newMessages.find(m => m.id === responseMessageId)
              if (responseMsg) {
                responseMsg.streaming = false
                responseMsg.isComplete = true
              }
              setIsStreaming(false)
              setLoadingMessageId('')
              setThinkingMessageId('')
              setResponseMessageId('')
              break
            }
          
            // Add visualizations to response
            case 'viz': {
              const responseMsg = newMessages.find(m => m.id === responseMessageId)
              if (responseMsg) {
                if (!responseMsg.visualizations) responseMsg.visualizations = []
                responseMsg.visualizations.push(msg.payload)
              }
              break
            }
          
            // Add tables to response
            case 'table': {
              const responseMsg = newMessages.find(m => m.id === responseMessageId)
              if (responseMsg) {
                if (!responseMsg.tables) responseMsg.tables = []
                responseMsg.tables.push(msg.payload)
              }
              break
            }
          
            // Handle non-streaming responses (fallback)
            case 'answer':
            case 'answer_enhanced': {
              if (!responseMessageId) {
                // Remove any existing loading/thinking bubbles
                if (loadingMessageId) {
                  newMessages = newMessages.filter(m => m.id !== loadingMessageId)
                  setLoadingMessageId('')
                }
                if (thinkingMessageId) {
                  newMessages = newMessages.filter(m => m.id !== thinkingMessageId)
                  setThinkingMessageId('')
                }
                
                const responseMsg: ChatMessage = {
                  id: crypto.randomUUID(),
                  type: 'assistant',
                  content: msg.payload,
                  timestamp: Date.now(),
                  streaming: false,
                  isComplete: true,
                  chunks: [],
                  visualizations: [],
                  tables: []
                }
                newMessages.push(responseMsg)
                setIsStreaming(false)
                setResponseMessageId('')
              }
              break
            }
          }
          
          return { ...conv, messages: newMessages }
        })
      })
    }
    
    wsRef.current = ws
    return () => {
      ws.close()
      setWsConnected(false)
    }
  }, [currentConversationId, loadingMessageId, thinkingMessageId, responseMessageId])

  const sendMessage = () => {
    if (!wsConnected || !wsRef.current || !input.trim() || isStreaming) {
      return
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      isComplete: true
    }

    let conversationId = currentConversationId

    // Create new conversation if needed
    if (!currentConversationId) {
      conversationId = crypto.randomUUID()
      const newConversation: ConversationSession = {
        id: conversationId,
        title: input.trim().substring(0, 50) + (input.length > 50 ? '...' : ''),
        timestamp: Date.now(),
        messages: [userMessage]
      }
      setConversations(prevConvs => [newConversation, ...prevConvs])
      setCurrentConversationId(conversationId)
    } else {
      // Add to existing conversation
      setConversations(prevConvs =>
        prevConvs.map(conv =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, userMessage] }
            : conv
        )
      )
    }

    // Create loading bubble immediately
    const loadingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'loading',
      content: '',
      timestamp: Date.now(),
      isLoading: true
    }
    setLoadingMessageId(loadingMsg.id)
    
    setConversations(prevConvs =>
      prevConvs.map(conv =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, loadingMsg] }
          : conv
      )
    )

    // Send to server
    wsRef.current.send(JSON.stringify({
      user_id: 'demo',
      conversation_id: conversationId,
      query: input.trim(),
      file_id: fileId
    }))

    setInput('')
    setIsStreaming(true)
  }

  const startNewChat = () => {
    setCurrentConversationId('')
    setIsStreaming(false)
    setLoadingMessageId('')
    setThinkingMessageId('')
    setResponseMessageId('')
  }

  const loadConversation = (conversationId: string) => {
    if (isStreaming) return // Prevent switching during streaming
    
    setCurrentConversationId(conversationId)
    setIsStreaming(false)
    setLoadingMessageId('')
    setThinkingMessageId('')
    setResponseMessageId('')
  }

  const toggleThoughtProcess = (messageId: string) => {
    setExpandedThoughts(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }))
  }

  const renderMessage = (message: ChatMessage, index: number) => {
    if (message.type === 'user') {
      return (
        <div className="flex justify-end mb-4">
          <div className="max-w-[80%]">
            <div className="bg-blue-600 text-white rounded-2xl px-4 py-2">
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className="text-xs text-blue-100 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    // LOADING COMPONENT
    if (message.type === 'loading') {
      return (
        <div className="flex justify-start mb-4">
          <div className="max-w-[80%]">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                ZA
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                    <span className="text-gray-700">Zara is processing your request...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    // THOUGHT PROCESS COMPONENT  
    if (message.type === 'thinking') {
      const isExpanded = expandedThoughts[message.id]
      
      return (
        <div className="flex justify-start mb-4">
          <div className="max-w-[80%]">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                ZA
              </div>
              <div className="flex-1">
                <div className="border border-gray-200 rounded-lg bg-gray-50/50">
                  <button
                    onClick={() => toggleThoughtProcess(message.id)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        message.isThinking ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-700">
                        {message.isThinking ? 'AI is thinking...' : `Thought Process (${message.thoughtProcess?.length || 0} stages)`}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  
                  {isExpanded && message.thoughtProcess && (
                    <div className="border-t border-gray-200 p-3 space-y-3">
                      {message.thoughtProcess.map((stage, idx) => (
                        <div key={idx} className="flex items-start space-x-3">
                          <div className={`w-3 h-3 rounded-full mt-1 ${
                            stage.status === 'complete' ? 'bg-green-500' :
                            stage.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                            'bg-red-500'
                          }`}></div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800 capitalize">
                              {stage.stage.replace('_', ' ')}
                            </div>
                            <div className="text-xs text-gray-600">{stage.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Show chunks retrieved during thinking */}
                  {message.chunks && message.chunks.length > 0 && (
                    <div className="border-t border-gray-200 p-3">
                      <div className="text-xs font-medium text-gray-600 mb-2">
                        📄 Documents found:
                      </div>
                      <div className="space-y-1">
                        {message.chunks.slice(0, 3).map((chunk, idx) => (
                          <div key={idx} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                            <span className="font-medium">{chunk.meta.file_id}</span> 
                            • Page {chunk.meta.page}
                          </div>
                        ))}
                        {message.chunks.length > 3 && (
                          <div className="text-xs text-gray-400">... and {message.chunks.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    // FINAL RESPONSE COMPONENT
    if (message.type === 'assistant') {
      return (
        <div className="flex justify-start mb-4">
          <div className="max-w-[80%]">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                ZA
              </div>
              <div className="flex-1">
                {/* Main Response */}
                <div className="bg-gray-100 rounded-2xl px-4 py-3 mb-2">
                  <div className="whitespace-pre-wrap text-gray-800">
                    {message.content}
                    {message.streaming && <span className="animate-pulse">▋</span>}
                  </div>
                  
                  {/* Source Citations */}
                  {message.chunks && message.chunks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs font-medium text-gray-600 mb-2">
                        📄 Sources referenced:
                      </div>
                      <div className="space-y-1">
                        {message.chunks.map((chunk, idx) => (
                          <div key={idx} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                            <span className="font-medium">{chunk.meta.file_id}</span> 
                            • Page {chunk.meta.page} 
                            • {chunk.meta.section}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Visualizations */}
                {message.visualizations?.map((viz, idx) => (
                  <div key={idx} className="mb-2">
                    <PlotCard spec={viz} />
                  </div>
                ))}
                
                {/* Tables */}
                {message.tables?.map((table, idx) => (
                  <div key={idx} className="mb-2">
                    <TableCard table={table} />
                  </div>
                ))}
                
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    return null
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar - Chat History & Context */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-800">Zara AI</h2>
            <button
              onClick={startNewChat}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              + New Chat
            </button>
          </div>
          <div className={`text-sm ${
            wsConnected ? 'text-green-600' : 'text-red-600'
          }`}>
            {wsConnected ? '● Connected' : '● Disconnected'}
          </div>
        </div>
        
        {/* Chat History */}
        <div className="flex-1 overflow-auto">
          {conversations.length > 0 && (
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-700 mb-3">Chat History</h3>
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentConversationId === conv.id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {conv.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(conv.timestamp).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Retrieved Context */}
          <div className="p-4">
            <h3 className="font-medium text-gray-700 mb-3">Document Sources</h3>
            {lastResult.length > 0 ? (
              <div className="space-y-3">
                {lastResult.map((chunk: Chunk, i: number) => (
                  <div key={i} className="bg-gray-50 border rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-2">
                      📄 {chunk.meta.file_id} • Page {chunk.meta.page} • {chunk.meta.section}
                    </div>
                    <div className="text-sm text-gray-700 line-clamp-4">
                      {chunk.text}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">📚</div>
                <div className="text-sm">No documents retrieved yet</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Current Processing Indicator */}
        {isStreaming && (
          <div className="p-4 border-t border-gray-200 bg-blue-50">
            <h4 className="font-medium text-gray-700 mb-2 flex items-center">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
              Processing...
            </h4>
          </div>
        )}
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-auto p-6">
          {currentMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome to Zara AI</h2>
                <p className="text-gray-600 mb-4">Your AI Knowledge Navigator Assistant, will help you find anything you need to know from your documents!</p>
                <div className="text-sm text-gray-500">
                  <div>• Upload documents to search through them</div>
                  <div>• Ask for charts and data analysis</div>
                  <div>• Get AI-enhanced responses with Agno</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {currentMessages.map((message, index) => (
                <div key={message.id}>{renderMessage(message, index)}</div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about your data or documents..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!wsConnected || isStreaming}
              />
              <button
                onClick={sendMessage}
                disabled={!wsConnected || !input.trim() || isStreaming}
                className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                  wsConnected && input.trim() && !isStreaming
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isStreaming ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Thinking...</span>
                  </div>
                ) : (
                  'Send'
                )}
              </button>
            </div>
            
            {fileId && (
              <div className="mt-2 text-xs text-gray-500">
                🔍 Currently focused on file: {fileId}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
