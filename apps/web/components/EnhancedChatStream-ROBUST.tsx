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

const WS = process.env.NEXT_PUBLIC_CHAT_WS || 'ws://127.0.0.1:8001/ws'

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
  type: 'user' | 'assistant'
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
  isError?: boolean
}

type ConversationSession = {
  id: string
  title: string
  timestamp: number
  messages: ChatMessage[]
}

// Debug console helper
const debugLog = (message: string, data?: any) => {
  console.log(`🔍 [DEBUG] ${message}`, data || '')
}

export default function EnhancedChatStream() {
  const [conversations, setConversations] = useState<ConversationSession[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string>('')
  const [input, setInput] = useState('')
  const [wsConnected, setWsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('')
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({})
  
  // Bubble state tracking - simplified and robust
  const [currentBubbleState, setCurrentBubbleState] = useState<{
    loading?: string
    thinking?: string
    response?: string
  }>({})
  
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const params = useSearchParams()
  const fileId = params.get('file_id') || undefined

  const currentMessages = useMemo(() => {
    if (!currentConversationId) return []
    return conversations.find(c => c.id === currentConversationId)?.messages || []
  }, [conversations, currentConversationId])

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentMessages])

  // WebSocket connection with robust message handling
  useEffect(() => {
    debugLog('🔗 Connecting to WebSocket:', WS)
    const ws = new WebSocket(WS)
    
    ws.onopen = () => {
      debugLog('✅ WebSocket connected successfully')
      setWsConnected(true)
    }
    
    ws.onclose = () => {
      debugLog('❌ WebSocket disconnected')
      setWsConnected(false)
    }
    
    ws.onerror = (error) => {
      debugLog('💥 WebSocket error:', error)
      setWsConnected(false)
    }
    
    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch (error) {
        debugLog('💀 Failed to parse WebSocket message:', ev.data)
        return;
      }
      
      debugLog(`📨 Received: ${msg.type}`, {
        type: msg.type,
        payload: typeof msg.payload === 'string' ? msg.payload.substring(0, 100) + '...' : msg.payload,
        stage: msg.stage,
        conversationId: currentConversationId,
        bubbleState: currentBubbleState
      })
      
      if (msg.type === 'heartbeat') return

      // Process message with robust error handling
      setConversations(prevConvs => {
        return prevConvs.map(conv => {
          if (conv.id !== currentConversationId) return conv

          let newMessages = [...conv.messages]
          
          try {
            switch (msg.type) {
              case 'agno_status': {
                debugLog('🧠 Processing agno_status', { stage: msg.stage, payload: msg.payload })
                
                // Remove loading bubble if exists
                if (currentBubbleState.loading) {
                  newMessages = newMessages.filter(m => m.id !== currentBubbleState.loading)
                  debugLog('🗑️ Removed loading bubble')
                }
                
                // Create or find thinking bubble
                let thinkingMsg = currentBubbleState.thinking ? 
                  newMessages.find(m => m.id === currentBubbleState.thinking) : null
                
                if (!thinkingMsg) {
                  const thinkingId = crypto.randomUUID()
                  thinkingMsg = {
                    id: thinkingId,
                    type: 'assistant',
                    content: 'AI is thinking...',
                    timestamp: Date.now(),
                    isThinking: true,
                    thoughtProcess: [],
                    isComplete: false
                  }
                  newMessages.push(thinkingMsg)
                  setCurrentBubbleState(prev => ({ ...prev, loading: undefined, thinking: thinkingId }))
                  debugLog('💭 Created thinking bubble', { id: thinkingId })
                }
                
                // Add thought stage
                if (thinkingMsg.thoughtProcess) {
                  const stage: ThoughtStage = {
                    stage: msg.stage || 'processing',
                    status: msg.status === 'complete' ? 'complete' : 'processing',
                    message: msg.payload,
                    timestamp: Date.now()
                  }
                  thinkingMsg.thoughtProcess.push(stage)
                  debugLog('📝 Added thought stage', stage)
                }
                break
              }

              case 'result': {
                debugLog('📄 Processing result', { documents: msg.payload?.objects?.length || 0 })
                // Add chunks to thinking message if exists
                const thinkingMsg = currentBubbleState.thinking ? 
                  newMessages.find(m => m.id === currentBubbleState.thinking) : null
                if (thinkingMsg) {
                  thinkingMsg.chunks = msg.payload?.objects || []
                  debugLog('📎 Added chunks to thinking message')
                }
                break
              }

              case 'stream_start': {
                debugLog('▶️ Processing stream_start')
                
                // Complete thinking bubble if exists
                const thinkingMsg = currentBubbleState.thinking ? 
                  newMessages.find(m => m.id === currentBubbleState.thinking) : null
                if (thinkingMsg) {
                  if (thinkingMsg.thoughtProcess) {
                    thinkingMsg.thoughtProcess.forEach(stage => stage.status = 'complete')
                  }
                  thinkingMsg.isThinking = false
                  thinkingMsg.isComplete = true
                  debugLog('✅ Completed thinking bubble')
                }
                
                // Create response bubble
                const responseId = crypto.randomUUID()
                const responseMsg: ChatMessage = {
                  id: responseId,
                  type: 'assistant',
                  content: '',
                  timestamp: Date.now(),
                  streaming: true,
                  isComplete: false,
                  chunks: thinkingMsg?.chunks || [],
                  visualizations: [],
                  tables: []
                }
                
                newMessages.push(responseMsg)
                setCurrentBubbleState(prev => ({ ...prev, response: responseId }))
                setIsStreaming(true)
                debugLog('📝 Created response bubble', { id: responseId })
                break
              }

              case 'stream_chunk': {
                debugLog('📦 Processing stream_chunk', { content: msg.payload?.substring(0, 20) + '...' })
                
                // Find and update response message
                const responseMsg = currentBubbleState.response ? 
                  newMessages.find(m => m.id === currentBubbleState.response) : null
                
                if (responseMsg) {
                  responseMsg.content += msg.payload
                  debugLog('✏️ Updated response content', { 
                    currentLength: responseMsg.content.length,
                    chunk: msg.payload?.substring(0, 20) + '...'
                  })
                } else {
                  debugLog('⚠️ No response message found for stream_chunk!', { 
                    responseId: currentBubbleState.response,
                    availableMessages: newMessages.map(m => ({ id: m.id, type: m.type }))
                  })
                }
                break
              }

              case 'stream_end': {
                debugLog('⏹️ Processing stream_end')
                
                // Complete response message
                const responseMsg = currentBubbleState.response ? 
                  newMessages.find(m => m.id === currentBubbleState.response) : null
                
                if (responseMsg) {
                  responseMsg.streaming = false
                  responseMsg.isComplete = true
                  debugLog('✅ Completed response message')
                }
                
                // Complete thinking message if still exists
                const thinkingMsg = currentBubbleState.thinking ? 
                  newMessages.find(m => m.id === currentBubbleState.thinking) : null
                if (thinkingMsg && thinkingMsg.thoughtProcess) {
                  thinkingMsg.thoughtProcess.forEach(stage => stage.status = 'complete')
                  thinkingMsg.isThinking = false
                  thinkingMsg.isComplete = true
                }
                
                // Clean up states
                setIsStreaming(false)
                setTimeout(() => {
                  setCurrentBubbleState({})
                  debugLog('🧹 Cleaned up bubble state')
                }, 100)
                break
              }

              case 'answer':
              case 'answer_enhanced': {
                debugLog('💬 Processing direct answer', { 
                  type: msg.type, 
                  content: msg.payload?.substring(0, 50) + '...' 
                })
                
                // Clean up loading bubble
                if (currentBubbleState.loading) {
                  newMessages = newMessages.filter(m => m.id !== currentBubbleState.loading)
                }
                
                // Complete thinking bubble if exists
                const thinkingMsg = currentBubbleState.thinking ? 
                  newMessages.find(m => m.id === currentBubbleState.thinking) : null
                if (thinkingMsg) {
                  if (thinkingMsg.thoughtProcess) {
                    thinkingMsg.thoughtProcess.forEach(stage => stage.status = 'complete')
                  }
                  thinkingMsg.isThinking = false
                  thinkingMsg.isComplete = true
                }
                
                // Create or update response message
                let responseMsg = currentBubbleState.response ? 
                  newMessages.find(m => m.id === currentBubbleState.response) : null
                
                if (!responseMsg) {
                  const responseId = crypto.randomUUID()
                  responseMsg = {
                    id: responseId,
                    type: 'assistant',
                    content: msg.payload,
                    timestamp: Date.now(),
                    streaming: false,
                    isComplete: true,
                    chunks: thinkingMsg?.chunks || []
                  }
                  newMessages.push(responseMsg)
                  setCurrentBubbleState(prev => ({ ...prev, response: responseId }))
                  debugLog('📝 Created direct answer message')
                } else {
                  responseMsg.content = msg.payload
                  responseMsg.streaming = false
                  responseMsg.isComplete = true
                  debugLog('✏️ Updated existing response with direct answer')
                }
                
                setIsStreaming(false)
                setTimeout(() => {
                  setCurrentBubbleState({})
                }, 100)
                break
              }

              case 'table': {
                debugLog('📊 Processing table', msg.payload)
                const responseMsg = currentBubbleState.response ? 
                  newMessages.find(m => m.id === currentBubbleState.response) : 
                  newMessages.filter(m => m.type === 'assistant').pop()
                
                if (responseMsg) {
                  responseMsg.tables = responseMsg.tables || []
                  responseMsg.tables.push(msg.payload)
                  debugLog('📋 Added table to response message')
                } else {
                  // Create new message for table
                  const tableMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    type: 'assistant',
                    content: 'Table data received',
                    timestamp: Date.now(),
                    tables: [msg.payload],
                    isComplete: true
                  }
                  newMessages.push(tableMsg)
                  debugLog('📋 Created new message for table')
                }
                break
              }

              case 'viz': {
                debugLog('📈 Processing visualization', msg.payload)
                const responseMsg = currentBubbleState.response ? 
                  newMessages.find(m => m.id === currentBubbleState.response) : 
                  newMessages.filter(m => m.type === 'assistant').pop()
                
                if (responseMsg) {
                  responseMsg.visualizations = responseMsg.visualizations || []
                  responseMsg.visualizations.push(msg.payload)
                  debugLog('📊 Added visualization to response message')
                } else {
                  // Create new message for visualization
                  const vizMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    type: 'assistant',
                    content: 'Visualization data received',
                    timestamp: Date.now(),
                    visualizations: [msg.payload],
                    isComplete: true
                  }
                  newMessages.push(vizMsg)
                  debugLog('📊 Created new message for visualization')
                }
                break
              }

              default: {
                debugLog('❓ Unknown message type, showing as-is', { type: msg.type, payload: msg.payload })
                const unknownMsg: ChatMessage = {
                  id: crypto.randomUUID(),
                  type: 'assistant',
                  content: `[${msg.type}]: ${typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload)}`,
                  timestamp: Date.now(),
                  isComplete: true,
                  isError: true
                }
                newMessages.push(unknownMsg)
                break
              }
            }
          } catch (error) {
            debugLog('💥 Error processing message:', { error, msg })
            const errorMsg: ChatMessage = {
              id: crypto.randomUUID(),
              type: 'assistant',
              content: `⚠️ Error processing ${msg.type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: Date.now(),
              isComplete: true,
              isError: true
            }
            newMessages.push(errorMsg)
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
  }, [currentConversationId, currentBubbleState])

  const sendMessage = () => {
    if (!wsConnected || !wsRef.current || !input.trim()) {
      debugLog('❌ Cannot send message', { 
        connected: wsConnected, 
        hasWs: !!wsRef.current, 
        hasInput: !!input.trim() 
      })
      return;
    }

    debugLog('📤 Sending message', { input: input.trim() })

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      isComplete: true
    };

    // Create loading bubble
    const loadingId = crypto.randomUUID()
    const loadingMessage: ChatMessage = {
      id: loadingId,
      type: 'assistant',
      content: '',
      timestamp: Date.now(),
      isLoading: true,
      isComplete: false
    };

    setCurrentBubbleState({ loading: loadingId })

    // Handle conversation creation/update
    let conversationId = currentConversationId;
    
    if (!currentConversationId) {
      const newConvId = crypto.randomUUID();
      conversationId = newConvId;
      const newConversation: ConversationSession = {
        id: newConvId,
        title: input.trim().substring(0, 50) + (input.length > 50 ? '...' : ''),
        timestamp: Date.now(),
        messages: [userMessage, loadingMessage]
      };
      
      setConversations(prevConvs => [newConversation, ...prevConvs]);
      setCurrentConversationId(newConvId);
      debugLog('🆕 Created new conversation', { id: newConvId })
    } else {
      setConversations(prevConvs =>
        prevConvs.map(conv =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, userMessage, loadingMessage] }
            : conv
        )
      );
      debugLog('➕ Added to existing conversation', { id: currentConversationId })
    }

    // Send to WebSocket
    const wsMessage = {
      user_id: 'demo',
      conversation_id: conversationId,
      query: input.trim(),
      file_id: fileId
    }
    
    debugLog('🚀 Sending WebSocket message', wsMessage)
    wsRef.current.send(JSON.stringify(wsMessage));
    setInput('');
  };

  const startNewChat = () => {
    debugLog('🆕 Starting new chat')
    setCurrentConversationId('')
    setIsStreaming(false)
    setCurrentBubbleState({})
  }

  const loadConversation = (conversationId: string) => {
    debugLog('📂 Loading conversation', { id: conversationId })
    setCurrentConversationId(conversationId)
    setIsStreaming(false)
    setCurrentBubbleState({})
  }

  const renderMessage = (message: ChatMessage, index: number) => {
    if (message.type === 'user') {
      return (
        <div key={message.id} className="flex justify-end mb-4">
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
    
    return (
      <div key={message.id} className="flex justify-start mb-4">
        <div className="max-w-[80%]">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              ZA
            </div>
            <div className="flex-1">
              {/* Thought Process */}
              {message.thoughtProcess && message.thoughtProcess.length > 0 && (
                <details className="mb-2 border border-gray-200 rounded-lg bg-gray-50/50">
                  <summary className="p-3 text-sm font-medium text-gray-700 cursor-pointer list-none flex items-center justify-between hover:bg-gray-100/50 transition-colors">
                    <div className="flex items-center space-x-2">
                      {message.isComplete ? '✅' : '⏳'}
                      <span>{message.isComplete ? 'View Thought Process' : 'Thinking...'}</span>
                    </div>
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  </summary>
                  <div className="border-t border-gray-200 p-3 space-y-2">
                    {message.thoughtProcess.map((stage, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-xs text-gray-600">
                        <span className={stage.status === 'complete' ? 'text-green-500' : 'text-blue-500'}>●</span>
                        <span>{stage.message}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Main Content */}
              {(message.content || message.isLoading || message.isThinking) && (
                <div className={`rounded-2xl px-4 py-3 mb-2 ${
                  message.isError ? 'bg-red-50 border border-red-200' : 'bg-gray-100'
                }`}>
                  {/* Loading State */}
                  {message.isLoading && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                      <span>Loading...</span>
                    </div>
                  )}
                  
                  {/* Thinking State */}
                  {message.isThinking && !message.isLoading && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <div className="animate-pulse w-4 h-4 bg-blue-400 rounded-full"></div>
                      <span>AI is thinking...</span>
                      {message.thoughtProcess && message.thoughtProcess.length > 0 && (
                        <span className="text-xs text-gray-500">({message.thoughtProcess.length} steps)</span>
                      )}
                    </div>
                  )}
                  
                  {/* Regular Content */}
                  {!message.isLoading && !message.isThinking && message.content && (
                    <div className={`whitespace-pre-wrap ${message.isError ? 'text-red-700' : 'text-gray-800'}`}>
                      {message.content}
                      {message.streaming && <span className="animate-pulse">▋</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Source Citations */}
              {message.chunks && message.chunks.length > 0 && (
                <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs font-medium text-blue-800 mb-2">📄 Sources:</div>
                  <div className="space-y-1">
                    {message.chunks.map((chunk, idx) => (
                      <div key={idx} className="text-xs text-blue-700">
                        <span className="font-medium">{chunk.meta.file_id}</span> • Page {chunk.meta.page} • {chunk.meta.section}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visualizations */}
              {message.visualizations && message.visualizations.length > 0 && (
                <div className="mb-2">
                  {message.visualizations.map((viz, idx) => (
                    <div key={idx} className="mb-2">
                      <div className="text-xs text-gray-500 mb-1 flex items-center">
                        📊 <span className="ml-1">Visualization {idx + 1}</span>
                      </div>
                      <PlotCard spec={viz} />
                    </div>
                  ))}
                </div>
              )}

              {/* Tables */}
              {message.tables && message.tables.length > 0 && (
                <div className="mb-2">
                  {message.tables.map((table, idx) => (
                    <div key={idx} className="mb-2">
                      <div className="text-xs text-gray-500 mb-1 flex items-center">
                        📋 <span className="ml-1">Table {idx + 1}</span>
                      </div>
                      <TableCard table={table} />
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs text-gray-500 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
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
          <div className={`text-sm flex items-center space-x-2 ${wsConnected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          {/* Debug Info */}
          <div className="text-xs text-gray-500 mt-1">
            Bubble State: {JSON.stringify(currentBubbleState)}
          </div>
        </div>
        
        {/* Chat History */}
        <div className="flex-1 overflow-auto">
          {conversations.length > 0 && (
            <div className="p-4">
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
        </div>
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
                <p className="text-gray-600 mb-4">Your AI Knowledge Navigator Assistant</p>
                <div className="text-sm text-gray-500">
                  <div>• Ask questions about your data</div>
                  <div>• Get visualizations and tables</div>
                  <div>• View AI thought processes</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {currentMessages.map((message, index) => renderMessage(message, index))}
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
                disabled={!wsConnected}
              />
              <button
                onClick={sendMessage}
                disabled={!wsConnected || !input.trim()}
                className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                  wsConnected && input.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isStreaming ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Sending...</span>
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
            
            {/* Debug Info */}
            <div className="mt-2 text-xs text-gray-400">
              Debug: Connected={wsConnected.toString()}, Streaming={isStreaming.toString()}, Messages={currentMessages.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}