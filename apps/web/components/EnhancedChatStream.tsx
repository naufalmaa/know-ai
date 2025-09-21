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
  type: 'user' | 'assistant'
  content: string
  timestamp: number
  streaming?: boolean
  thoughtProcess?: ThoughtStage[]
  chunks?: Chunk[]
  visualizations?: any[]
  tables?: any[]
  isComplete?: boolean
}

type ConversationSession = {
  id: string
  title: string
  timestamp: number
  messages: ChatMessage[]
}

type Frame =
  | { type: 'result', payload: { objects: Chunk[] } }
  | { type: 'answer', payload: string }
  | { type: 'answer_enhanced', payload: string }
  | { type: 'viz', payload: any }
  | { type: 'table', payload: { columns: string[], rows: any[] } }
  | { type: 'heartbeat' }
  | { type: 'user', payload: string }
  | { type: 'agno_status', payload: string, stage: string }
  | { type: 'agno_enhancement', payload: { original: string, enhanced: string, confidence: number, reasoning: string } }
  | { type: 'agno_evaluation', payload: { improvements_made: boolean, confidence: number, reasoning: string, suggestions: string[] } }
  | { type: 'stream_start', payload: {} }
  | { type: 'stream_chunk', payload: string }
  | { type: 'stream_end', payload: {} }

export default function EnhancedChatStream() {
//   const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<ConversationSession[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string>('')
  const [input, setInput] = useState('')
  const [wsConnected, setWsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('')
  const [currentThoughtProcess, setCurrentThoughtProcess] = useState<ThoughtStage[]>([])
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({})
  const [processingStage, setProcessingStage] = useState<string>('')
  const [activeMessageId, setActiveMessageId] = useState<string>('')
  
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const params = useSearchParams()
  const fileId = params.get('file_id') || undefined

  // Di dalam komponen, tambahkan sebuah Ref untuk melacak ID pesan aktif
  const activeMessageIdRef = useRef<string | null>(null);

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
  }, [currentMessages, currentStreamingMessage])

  // WebSocket connection
  useEffect(() => {
    console.log('Connecting to WebSocket:', WS)
    const ws = new WebSocket(WS)
    
    let currentMessageId = ''
    let currentMessage: Partial<ChatMessage> = {}
    let thoughtStages: ThoughtStage[] = []
    
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
        // Cari percakapan yang sedang aktif
        const newConvs = prevConvs.map(conv => {
          if (conv.id !== currentConversationId) return conv;

          let newMessages = [...conv.messages];
          const activeMessageId = activeMessageIdRef.current;

          // Temukan pesan AI yang sedang di-stream
          let streamingMessage = activeMessageId ? newMessages.find(m => m.id === activeMessageId) : null;
      
      switch (msg.type) {
                    case 'agno_status': {
              if (streamingMessage && streamingMessage.thoughtProcess) {
                const stage: ThoughtStage = {
                  stage: msg.stage || 'processing',
                  status: msg.status || 'processing',
                  message: msg.payload,
                  timestamp: Date.now()
                };
                streamingMessage.thoughtProcess.push(stage);
              }
              break;
            }
          
        case 'result':
          if (currentMessage) {
            currentMessage.chunks = msg.payload.objects
          }
          break
          
            case 'stream_start': {
              const newAssistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                type: 'assistant',
                content: '',
                timestamp: Date.now(),
                streaming: true,
                isComplete: false,
                thoughtProcess: [] // Siapkan untuk thought process
              };
              activeMessageIdRef.current = newAssistantMessage.id;
              newMessages.push(newAssistantMessage);
              break;
            }
          
            case 'stream_chunk': {
              if (streamingMessage) {
                streamingMessage.content += msg.payload;
              }
              break;
            }
        case 'stream_end': {
              if (streamingMessage) {
                streamingMessage.streaming = false;
                streamingMessage.isComplete = true;
              }
              activeMessageIdRef.current = null; // Reset pelacak
              break;
            }
          
        case 'viz':
          if (currentMessage) {
            currentMessage.visualizations = currentMessage.visualizations || []
            currentMessage.visualizations.push(msg.payload)
          }
          break
          
        case 'table':
          if (currentMessage) {
            currentMessage.tables = currentMessage.tables || []
            currentMessage.tables.push(msg.payload)
          }
          break
          
        case 'answer':
        case 'answer_enhanced': {
          // Handle non-streaming responses
          if (!isStreaming) { // Cek jika tidak sedang dalam proses streaming
            const newMessage: ChatMessage = {
              id: crypto.randomUUID(), // Gunakan UUID
              type: 'assistant',
              content: msg.payload,
              timestamp: Date.now(),
              streaming: false,
              thoughtProcess: [...currentThoughtProcess],
              chunks: currentMessage?.chunks || [],
              visualizations: currentMessage?.visualizations || [],
              tables: currentMessage?.tables || [],
              isComplete: true
            };
            
            // Langsung update state conversations
            setConversations(prevConvs =>
              prevConvs.map(conv =>
                conv.id === currentConversationId
                  ? { ...conv, messages: [...conv.messages, newMessage] }
                  : conv
              )
            );
            
            setCurrentThoughtProcess([])
            setProcessingStage('')
            setActiveMessageId('')
            currentMessageId = ''
          }
          break
        }
      }
      return { ...conv, messages: newMessages };
    });
        return newConvs;
      });
      };
    
    wsRef.current = ws
    return () => {
      ws.close()
      setWsConnected(false)
    }
  }, [])

  const sendMessage = () => {
    if (!wsConnected || !wsRef.current || !input.trim()) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      isComplete: true
    };

    // Jika ini adalah percakapan baru
    if (!currentConversationId) {
      const newConvId = crypto.randomUUID(); // Gunakan UUID untuk ID unik
      const newConversation: ConversationSession = {
        id: newConvId,
        title: input.trim().substring(0, 50) + (input.length > 50 ? '...' : ''),
        timestamp: Date.now(),
        messages: [userMessage] // Langsung masukkan pesan pertama
      };
      
      // Update state conversations dan set ID percakapan saat ini
      setConversations(prevConvs => [newConversation, ...prevConvs]);
      setCurrentConversationId(newConvId);

    // Jika percakapan sudah ada
    } else {
      setConversations(prevConvs =>
        prevConvs.map(conv =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, userMessage] }
            : conv
        )
      );
    }

    // Kirim ke server (ini tetap sama)
    wsRef.current.send(JSON.stringify({
      user_id: 'demo',
      conversation_id: currentConversationId || 'conv-1',
      query: input.trim(),
      file_id: fileId
    }));

    setInput('');
  };

  const startNewChat = () => {
    // setMessages([])
    setCurrentConversationId('')
    setCurrentThoughtProcess([])
    setProcessingStage('')
    setCurrentStreamingMessage('')
    setIsStreaming(false)
    setActiveMessageId('')
  }

  const loadConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    // const conversation = conversations.find(c => c.id === conversationId)
    // if (conversation) {
    //   setMessages(conversation.messages)
    //   setCurrentConversationId(conversationId)
    // }
  }

  const toggleThoughtProcess = (messageId: string) => {
    setExpandedThoughts(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }))
  }

  const renderThoughtProcess = (stages: ThoughtStage[], messageId: string) => {
    const isExpanded = expandedThoughts[messageId]
    
    if (!stages.length) return null
    
    return (
      <div className="mt-2 border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleThoughtProcess(messageId)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">
              Thought Process ({stages.length} stages)
            </span>
          </div>
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          )}
        </button>
        
        {isExpanded && (
          <div className="border-t border-gray-200 p-3 space-y-3">
            {stages.map((stage, idx) => (
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
                  {stage.details && (
                    <div className="mt-2 text-xs bg-gray-50 p-2 rounded border">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(stage.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderMessage = (message: ChatMessage, index: number) => {
    if (message.type === 'user') {
      // Check if this is the most recent user message and show live thought process
      const isLastUserMessage = index === currentMessages.length - 1 && isStreaming
      
      return (
        <div className="flex justify-end mb-4">
          <div className="max-w-[80%]">
            <div className="bg-blue-600 text-white rounded-2xl px-4 py-2">
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className="text-xs text-blue-100 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
            
            {/* Show live thought process under the latest user message */}
            {isLastUserMessage && currentThoughtProcess.length > 0 && (
              <div className="mt-3 max-w-full">
                <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="animate-spin w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">AI is thinking...</span>
                  </div>
                  <div className="space-y-2">
                    {currentThoughtProcess.map((stage, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          stage.status === 'complete' ? 'bg-green-500' :
                          stage.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                          'bg-red-500'
                        }`}></div>
                        <span className="text-xs text-gray-600">{stage.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }
    
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[80%]">
          {/* Assistant Avatar */}
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              ZA
            </div>
            <div className="flex-1">
            {/* Thought Process (ditampilkan jika ada) */}
              {message.thoughtProcess && message.thoughtProcess.length > 0 && (
                <details className="mb-2 border border-gray-200 rounded-lg bg-gray-50/50">
                  <summary className="p-3 text-sm font-medium text-gray-700 cursor-pointer list-none flex items-center justify-between hover:bg-gray-100/50 transition-colors">
                    <div className="flex items-center space-x-2">
                      {message.isComplete ? '✅' : '⏳'}
                      <span>
                        {message.isComplete ? 'Lihat Proses Berpikir' : 'Sedang Berpikir...'}
                      </span>
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
              {/* Main Response */}
              {(message.content || message.streaming) && (
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
              )}
              
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
              
              {/* Thought Process (only for completed messages) */}
              {message.thoughtProcess && message.isComplete && renderThoughtProcess(message.thoughtProcess, message.id)}
              
              <div className="text-xs text-gray-500 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const lastResult = useMemo(() => {
    const lastMessage = currentMessages[currentMessages.length - 1]
    return lastMessage?.chunks || []
  }, [currentMessages])

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
                {lastResult.map((chunk, i) => (
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
        
        {/* Current Processing Stages - Live thought process indicator */}
        {isStreaming && currentThoughtProcess.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-blue-50">
            <h4 className="font-medium text-gray-700 mb-2 flex items-center">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
              Processing...
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {currentThoughtProcess.map((stage, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    stage.status === 'complete' ? 'bg-green-500' :
                    stage.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                    'bg-red-500'
                  }`}></div>
                  <span className="text-xs text-gray-700">{stage.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-auto p-6">
          {currentMessages.length === 0 && isStreaming ? (
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
              
              {/* Current Streaming Message */}
              {isStreaming && (
                <div className="flex justify-start mb-4">
                  <div className="max-w-[80%]">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        AI
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-2xl px-4 py-3">
                          <div className="whitespace-pre-wrap text-gray-800">
                            {currentStreamingMessage}
                            <span className="animate-pulse">▋</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
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