import { useState, useEffect } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'

export default function GroupChat({ showGroupChat, setShowGroupChat, group }) {
  const [groupChatInput, setGroupChatInput] = useState('')
  const [groupChatMessages, setGroupChatMessages] = useState([])
  const { user } = useAuth()

  const sendGroupChatMessage = () => {
    if (!groupChatInput.trim() || !user?.ID) return

    const message = {
      type: "group_message",
      groupId: parseInt(group.id),
      from: user.ID,
      content: groupChatInput.trim(),
      timestamp: new Date().toISOString()
    }

    // Optimistically update UI
    setGroupChatMessages(prev => [...prev, {
      ...message,
      sender_name: 'You',
      isCurrentUser: true
    }])

    setGroupChatInput('')
  }

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendGroupChatMessage()
    }
  }

  if (!showGroupChat) return null

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div className="absolute right-0 top-0 h-full w-96 bg-gray-800 shadow-lg border-l border-gray-700 flex flex-col pointer-events-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white">Group Chat: {group?.title}</h3>
            <span className={`h-2 w-2 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </div>
          <button
            onClick={() => setShowGroupChat(false)}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ChatMessages messages={groupChatMessages} user={user} />
        <ChatInput 
          value={groupChatInput}
          onChange={setGroupChatInput}
          onKeyPress={handleChatKeyPress}
          onSend={sendGroupChatMessage}
          disabled={!user}
        />
      </div>
    </div>
  )
}

function ChatMessages({ messages, user }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <p className="text-gray-400 text-center py-10">
          {user ? "No messages yet. Start the conversation!" : "Connecting to chat..."}
        </p>
      ) : (
        messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))
      )}
    </div>
  )
}

function ChatMessage({ message }) {
  return (
    <div className={`flex ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs p-3 rounded-lg ${message.isCurrentUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}
      >
        <p className="text-sm">{message.content}</p>
        <p className="text-xs mt-1 opacity-70">
          {message.isCurrentUser ? 'You' : message.sender_name || 'User'} • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

function ChatInput({ value, onChange, onKeyPress, onSend, disabled }) {
  return (
    <div className="p-4 border-t border-gray-700">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={disabled ? "Connecting..." : "Type a message..."}
          disabled={disabled}
          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  )
}