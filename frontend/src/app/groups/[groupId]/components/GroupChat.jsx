import { useState, useEffect } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import styles from './GroupChat.module.css'

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
    <div className={styles.messagesContainer}>
      {messages.length === 0 ? (
        <p className={styles.emptyMessages}>
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
          {message.isCurrentUser ? 'You' : message.sender_name || 'User'} • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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