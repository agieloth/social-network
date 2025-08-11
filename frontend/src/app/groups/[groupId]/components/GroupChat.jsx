import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import { useSharedWorker } from '../../../../contexts/SharedWorkerContext'
import styles from './GroupChat.module.css'

export default function GroupChat({ showGroupChat, setShowGroupChat, group }) {
  const [groupChatInput, setGroupChatInput] = useState('')
  const [groupChatMessages, setGroupChatMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()
  const { worker, sendWorkerMessage } = useSharedWorker()

  useEffect(() => {
    if (showGroupChat && group?.id) {
      fetchMessages()
    }
  }, [showGroupChat, group?.id])

  useEffect(() => {
    if (worker) {
      worker.port.onmessage = (event) => {
        console.log("rah dkhel");
        
        const message = event.data.data;
        if (event.type === 'user_online' && message.groupId === parseInt(group?.id)) {
          setOnlineUsers(prev => [...prev, message.from])
        } else if (message.type === 'group' && message.groupId === parseInt(group?.id)) {
          console.log("dkhel tra hna ");
          
          setGroupChatMessages(prev => [...prev, message])
        }
      }
    }
  }, [worker, group?.id])

  const fetchMessages = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/groups/${group.id}/chat`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch messages')
      const data = await res.json()
      setGroupChatMessages(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const sendGroupChatMessage = () => {
    if (!groupChatInput.trim() || !user?.ID) return

    const message = {
      type: "group",
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

    sendWorkerMessage(message)
  }

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendGroupChatMessage()
    }
  }

  if (!showGroupChat) return null

  return (
    <div className={styles.chatOverlay}>
      <div className={styles.chatContainer}>
        <div className={styles.chatHeader}>
          <div className={styles.headerTitleContainer}>
            <h3 className={styles.headerTitle}>Group Chat: {group?.title}</h3>
            <span className={`${styles.statusIndicator} ${user ? styles.statusOnline : styles.statusOffline}`}></span>
          </div>
          <button
            onClick={() => setShowGroupChat(false)}
            className={styles.closeButton}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={styles.closeIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ChatMessages messages={groupChatMessages} user={user} loading={loading} error={error} onlineUsers={onlineUsers} />
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

function ChatMessages({ messages, user, loading, error, onlineUsers }) {
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages]);

  if (loading) return <div className={styles.centered}><p>Loading messages...</p></div>
  if (error) return <div className={styles.centered}><p className={styles.errorText}>{error}</p></div>

  return (
    <div className={styles.messagesContainer}>
      {messages.length === 0 ? (
        <p className={styles.emptyMessages}>
          {user ? "No messages yet. Start the conversation!" : "Connecting to chat..."}
        </p>
      ) : (
        messages.map((msg, index) => (
          <ChatMessage key={index} message={{...msg, isCurrentUser: msg.from === user?.ID, isOnline: onlineUsers.includes(msg.from)}} />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}

function ChatMessage({ message }) {
  const messageRowClasses = [
    styles.messageRow,
    message.isCurrentUser ? styles.currentUser : styles.otherUser
  ].join(' ')

  const messageBubbleClasses = [
    styles.messageBubble,
    message.isCurrentUser ? styles.currentUser : styles.otherUser
  ].join(' ')

  return (
    <div className={messageRowClasses}>
      <div className={messageBubbleClasses}>
        <p className={styles.messageContent}>{message.content}</p>
        <p className={styles.messageInfo}>
          {message.isCurrentUser ? 'You' : message.sender_name || 'User'} 
          {message.isOnline && <span className={styles.onlineIndicator}></span>}
          • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

function ChatInput({ value, onChange, onKeyPress, onSend, disabled }) {
  return (
    <div className={styles.chatInputContainer}>
      <div className={styles.inputWrapper}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={disabled ? "Connecting..." : "Type a message..."}
          disabled={disabled}
          className={styles.chatInput}
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className={styles.sendButton}
        >
          Send
        </button>
      </div>
    </div>
  )
}
