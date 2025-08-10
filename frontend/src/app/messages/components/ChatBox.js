'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import EmojiPicker from '../../home/components/Emoji'

export default function ChatBox({ currentUser, recipient, onSendMessage, messages = [], input, setInput, onClose }) {
  const scrollRef = useRef()
  const inputRef = useRef()
  const [chatHistory, setChatHistory] = useState([])
  const [allMessages, setAllMessages] = useState([])
  const [chatError, setChatError] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Support both recipient.id and recipient.ID for compatibility
  const recipientId = recipient?.id || recipient?.ID
  const userId = currentUser?.ID

  // Validate message structure
  const isValidMessage = useCallback((msg) => {
    return msg && 
           typeof msg === 'object' && 
           'from' in msg && 
           'to' in msg &&
           'content' in msg &&
           'timestamp' in msg
  }, [])

  // Load chat history only once when chat opens
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!recipientId || !userId) return
      
      setChatError('')
      setIsLoading(true)
      
      try {
        const res = await fetch(`http://localhost:8080/api/chat/history?with=${recipientId}`, {
          credentials: 'include'
        })

        if (!res.ok) {
          if (res.status === 403) {
            setChatError('You cannot chat with this user. You need to follow each other.')
            setChatHistory([])
            setAllMessages([])
            return
          }
          throw new Error(await res.text() || 'Failed to load chat history')
        }

        const history = await res.json()
        const validHistory = Array.isArray(history) 
          ? history.filter(msg => isValidMessage(msg)) 
          : []
        
        setChatHistory(validHistory)
        setAllMessages(validHistory)
      } catch (err) {
        console.error('Error loading chat history:', err)
        setChatError('Error loading chat history')
        setChatHistory([])
        setAllMessages([])
      } finally {
        setIsLoading(false)
      }
    }

    loadChatHistory()
  }, [recipientId, userId, isValidMessage])

  // Handle new real-time messages
  useEffect(() => {
    if (!Array.isArray(messages)) return
    
    // Filter and validate messages for this chat
    const relevantMessages = messages
      .filter(msg => isValidMessage(msg))
      .filter(msg => 
        (msg.from === userId && msg.to === recipientId) ||
        (msg.to === userId && msg.from === recipientId)
      )

    if (relevantMessages.length === 0) return

    setAllMessages(prev => {
      const existingIds = new Set(
        prev.map(m => `${m.from}-${m.to}-${m.timestamp}-${m.content}`)
      )

      const newMessages = relevantMessages.filter(msg => {
        const msgId = `${msg.from}-${msg.to}-${msg.timestamp}-${msg.content}`
        return !existingIds.has(msgId)
      })

      if (newMessages.length === 0) return prev

      const merged = [...prev, ...newMessages].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      )

      return merged
    })
  }, [messages, userId, recipientId, isValidMessage])

  const handleSend = useCallback(() => {
    if (!input.trim() || !userId || !recipientId || chatError) return

    const msg = {
      from: userId,
      to: recipientId,
      content: input.trim(),
      type: 'private',
      timestamp: new Date().toISOString()
    }

    onSendMessage(msg)
    setInput('')
    setShowEmojiPicker(false)
  }, [input, userId, recipientId, chatError, onSendMessage, setInput])

  const handleEmojiSelect = useCallback((emoji) => {
    if (!inputRef.current) return
    
    const cursorPos = inputRef.current.selectionStart || input.length
    const newText = input.substring(0, cursorPos) + emoji + input.substring(cursorPos)
    
    setInput(newText)
    
    // Focus and position cursor after emoji
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(
          cursorPos + emoji.length, 
          cursorPos + emoji.length
        )
      }
    }, 0)
  }, [input, setInput])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!chatError) handleSend()
    }
  }, [handleSend, chatError])

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [allMessages])

  // Render message content with basic formatting
  const renderMessageContent = useCallback((content) => {
    if (!content) return null
    
    // Simple URL detection
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return content.split(urlRegex).map((part, i) => 
      part.match(urlRegex) 
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{part}</a>
        : part
    )
  }, [])

  if (!recipient) {
    return (
      <div className="w-96 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4">
        <p className="text-red-400">Recipient information missing</p>
      </div>
    )
  }

  return (
    <div className="w-96 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-3 flex flex-col relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-white">
          {recipient.full_name || 'Unknown User'}
        </span>
        <button
          className="text-red-400 hover:text-red-300 text-lg"
          onClick={onClose}
          aria-label="Close chat"
        >
          ✖
        </button>
      </div>

      {/* Messages area */}
      <div className="max-h-[60vh] min-h-[300px] overflow-y-auto bg-gray-900 rounded p-2 text-sm text-gray-300 flex-1 mb-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-400">Loading messages...</p>
          </div>
        ) : chatError ? (
          <div className="text-center p-4">
            <div className="text-red-400 mb-2">🚫</div>
            <p className="text-red-400 text-sm">{chatError}</p>
            <p className="text-gray-500 text-xs mt-2">
              To chat, you need to follow each other.
            </p>
          </div>
        ) : allMessages.length === 0 ? (
          <p className="text-gray-500 italic text-center py-4">No messages yet</p>
        ) : (
          allMessages.map((message) => (
            <div
              key={`${message.from}-${message.to}-${message.timestamp}`}
              className={`mb-2 ${message.from === userId ? 'text-right' : 'text-left'}`}
            >
              <div className={`inline-block px-3 py-1 rounded-lg max-w-[80%] break-words ${
                message.from === userId
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-200'
              }`}>
                <div className="text-xs opacity-70 mb-1">
                  {message.from === userId ? 'You' : recipient.full_name}
                </div>
                <div>{renderMessageContent(message.content)}</div>
                <div className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input area */}
      <div className="flex relative">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            className={`w-full border text-white rounded-l px-2 py-1 pr-8 text-sm focus:outline-none ${
              chatError
                ? 'bg-gray-600 border-gray-500 cursor-not-allowed'
                : 'bg-gray-700 border-gray-600 focus:border-blue-500'
            }`}
            value={input}
            onChange={(e) => !chatError && setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={chatError ? "Chat disabled" : "Type a message..."}
            disabled={!!chatError}
            aria-label="Message input"
          />

          {!chatError && (
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400 text-sm"
              aria-label="Toggle emoji picker"
            >
              😊
            </button>
          )}
        </div>

        <button
          className={`ml-2 px-3 rounded-r text-sm ${
            chatError || !input.trim()
              ? 'bg-gray-600 cursor-not-allowed opacity-50'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          onClick={handleSend}
          disabled={!!chatError || !input.trim()}
          aria-label="Send message"
        >
          Send
        </button>
      </div>

      {/* Emoji Picker */}
      <EmojiPicker
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
      />
    </div>
  )
}