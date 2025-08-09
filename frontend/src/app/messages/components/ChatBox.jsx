'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './ChatBox.module.css'
import EmojiPicker from '../../home/components/Emoji'

export default function ChatBox({ currentUser, recipient, onSendMessage, messages, input, setInput, onClose }) {
  const scrollRef = useRef()
  const inputRef = useRef()
  const [chatHistory, setChatHistory] = useState([])
  const [allMessages, setAllMessages] = useState([])
  const [chatError, setChatError] = useState('') // Nouvel état pour les erreurs
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Support both recipient.id and recipient.ID for compatibility
  const recipientId = recipient.id || recipient.ID
  const userId = currentUser?.ID

  // Load chat history only once when chat opens
  useEffect(() => {
    const loadChatHistory = async () => {
      setChatError('') // Reset error state
      try {
        const res = await fetch(`http://localhost:8080/api/chat/history?with=${recipientId}`, {
          credentials: 'include'
        });

        if (!res.ok) {
          if (res.status === 403) {
            setChatError('Vous ne pouvez pas discuter avec cet utilisateur. Vous devez vous suivre mutuellement.')
            setChatHistory([])
            setAllMessages([])
            return
          }
          const errorText = await res.text();
          throw new Error(errorText || 'Failed to load chat history');
        }

        const history = await res.json();
        const validHistory = Array.isArray(history) ? history.filter(msg => msg && msg.content) : [];
        setChatHistory(validHistory);
        setAllMessages(validHistory); // Initialize with history
      } catch (err) {
        console.error('Error loading chat history:', err);
        setChatHistory([]);
        setAllMessages([]);
        setChatError('Erreur lors du chargement de l\'historique du chat')
      }
    };

    if (recipientId && userId) {
      loadChatHistory();
    }
  }, [recipientId, userId, messages]);

  // Handle new real-time messages
  useEffect(() => {
    if (!messages || !Array.isArray(messages) || chatError) return;

    // Filter messages for this specific chat
    const relevantMessages = messages.filter(msg =>
      (msg.from === userId && msg.to === recipientId) ||
      (msg.to === userId && msg.from === recipientId)
    );

    if (relevantMessages.length === 0) return;

    setAllMessages(prevMessages => {
      const existingIds = new Set(
        prevMessages.map(msg => `${msg.from}-${msg.to}-${msg.timestamp}-${msg.content}`)
      );

      const newMessages = relevantMessages.filter(msg => {
        const msgId = `${msg.from}-${msg.to}-${msg.timestamp}-${msg.content}`;
        return !existingIds.has(msgId);
      });

      if (newMessages.length === 0) return prevMessages;

      return [...prevMessages, ...newMessages].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    });
  }, [messages, userId, recipientId, chatError]);

  const handleSend = () => {
    if (!input.trim()) return
    if (!userId || !recipientId) return
    if (chatError) return // Empêcher l'envoi si il y a une erreur

    const msg = {
      from: userId,
      to: recipientId,
      content: input.trim(),
      type: 'private',
      timestamp: new Date().toISOString()
    }

    onSendMessage(msg)
    setInput('')
  }

  const handleEmojiSelect = (emoji) => {
    const cursorPos = inputRef.current?.selectionStart || input.length
    const textBefore = input.substring(0, cursorPos)
    const textAfter = input.substring(cursorPos)
    const newText = textBefore + emoji + textAfter

    setInput(newText)

    // Remettre le focus et positionner le curseur après l'emoji
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length)
      }
    }, 0)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!chatError) {
        handleSend()
      }
    }
  }

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [allMessages])

  // Fonction pour détecter et rendre les emojis dans les messages
  const renderMessageContent = (content) => {
    // Cette fonction peut être étendue pour détecter d'autres éléments comme les liens
    return content
  }

  return (
    <div className={styles.chatBox}>
      <div className={styles.header}>
        <span className={styles.recipientName}>{recipient.full_name}</span>
        <button
          className={styles.closeButton}
          onClick={onClose}
        >
          ✖
        </button>
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {chatError ? (
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>🚫</div>
            <p className={styles.errorText}>{chatError}</p>
            <p className={styles.errorHint}>
              Pour pouvoir discuter, vous devez vous suivre mutuellement.
            </p>
          </div>
        ) : allMessages.length === 0 ? (
          <p className={styles.noMessages}>No messages yet...</p>
        ) : (
          allMessages.map((m, i) => (
            <div
              key={`${m.from}-${m.to}-${m.timestamp}-${i}`}
              className={`${styles.messageBubbleContainer} ${m.from === userId ? styles.sent : styles.received}`}
            >
              <div className={`${styles.messageBubble} ${m.from === userId
                ? styles.sent
                : styles.received
                }`}>
                <div className={styles.messageHeader}>
                  {m.from === userId ? 'Vous' : recipient.full_name}
                </div>
                {renderMessageContent(m.content)}
                <div className={styles.messageTimestamp}>
                  {new Date(m.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input avec support emoji */}
      <div className={styles.inputContainer}>
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            type="text"
            className={`${styles.input} ${chatError
              ? styles.error
              : styles.valid
              }`}
            value={input}
            onChange={(e) => !chatError && setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={chatError ? "Chat non autorisé" : "Type a message..."}
            disabled={!!chatError}
          />

          {/* Bouton emoji */}
          {!chatError && (
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={styles.emojiButton}
              title="Ajouter un emoji"
            >
              😊
            </button>
          )}
        </div>

        <button
          className={`${styles.sendButton} ${chatError || !input.trim()
            ? styles.disabled
            : styles.enabled
            }`}
          onClick={handleSend}
          disabled={!!chatError || !input.trim()}
        >
          Envoyer
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