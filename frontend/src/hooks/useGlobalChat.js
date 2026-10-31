'use client'

import { useState, useCallback, useRef, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';
import { useWebSocket } from './useWebSocket';


export function useGlobalChat() {
  const [chatUsers, setChatUsers] = useState([]);
  const [openChats, setOpenChats] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [messages, setMessages] = useState({});
  const [input, setInput] = useState({});
  const [messageNotifications, setMessageNotifications] = useState([]);
  const { worker: contextWorker } = useWorker();
  const workerRef = useRef(contextWorker);
  const { socket, isConnected, sendMessage: sendWsMessage } = useWebSocket(workerRef.current?.userId);

  // Mettre à jour le workerRef
  useEffect(() => {
    workerRef.current = contextWorker;
  }, [contextWorker]);

  // Récupérer les utilisateurs du chat
  const fetchChatUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat-users`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setChatUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, []);

  // Envoyer un message via WebSocket
  const sendMessage = useCallback((recipientId, content, currentUserId) => {
    if (!content.trim() || !socket) return;

    const message = {
      type: 'private',
      to: recipientId,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      from: currentUserId,
    };

    // Envoyer via WebSocket
    sendWsMessage(message);

    // Mettre à jour l'input
    setInput(prev => ({
      ...prev,
      [recipientId]: '',
    }));
  }, [socket, sendWsMessage]);

  const openChat = useCallback((user) => {
    setOpenChats(prev => {
      const exists = prev.find(c => (c.id || c.ID) === (user.id || user.ID))
      if (!exists) {
        return [...prev, user]
      }
      return prev
    })
    // Mark as read when opening chat
    setUnreadMessages(prev => ({
      ...prev,
      [user.id || user.ID]: 0
    }))
    // Mark messages as read inline to avoid dependency issues
    setMessageNotifications(prev =>
      prev.map(notif =>
        (notif.sender.id || notif.sender.ID) === (user.id || user.ID)
          ? { ...notif, read: true }
          : notif
      )
    )
  }, [])

  const closeChat = useCallback((userId) => {
    setOpenChats(prev => prev.filter(c => (c.id || c.ID) !== userId))
  }, [])

  const addMessage = useCallback((from, to, content, timestamp) => {
    // Store in keyed format (private messages)
    const key = `${Math.min(from, to)}-${Math.max(from, to)}`
    setMessages(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { from, to, content, timestamp }]
    }))
  }, [])

  const addMessageForRecipient = useCallback((data) => {
    // Add message to both sender and recipient conversation
    const userId = Math.min(data.from, data.to)
    const otherId = Math.max(data.from, data.to)
    const key = `${userId}-${otherId}`

    setMessages(prev => {
      const existing = prev[key] || []
      // Check for duplicates
      const isDuplicate = existing.some(m =>
        m.from === data.from &&
        m.to === data.to &&
        m.content === data.content &&
        Math.abs(new Date(m.timestamp) - new Date(data.timestamp)) < 1000
      )
      
      if (isDuplicate) {
        console.log('⚠️ Duplicate message detected')
        return prev
      }

      return {
        ...prev,
        [key]: [...existing, data]
      }
    })
  }, [])

  const markMessagesAsRead = useCallback((userId) => {
    setUnreadMessages(prev => ({
      ...prev,
      [userId]: 0
    }))

    setMessageNotifications(prev =>
      prev.map(notif =>
        (notif.sender.id || notif.sender.ID) === userId
          ? { ...notif, read: true }
          : notif
      )
    )
  }, [])

  const addMessageNotification = useCallback((sender, message) => {
    setMessageNotifications(prev => [{
      id: Date.now(),
      sender,
      message,
      timestamp: new Date(),
      read: false
    }, ...prev.slice(0, 9)])
  }, [])

  const incrementUnreadFor = useCallback((userId) => {
    setUnreadMessages(prev => ({
      ...prev,
      [userId]: (prev[userId] || 0) + 1
    }))
  }, [])

  return {
    chatUsers,
    openChats,
    unreadMessages,
    messages,
    messageNotifications,
    input,
    setInput,
    fetchChatUsers,
    openChat,
    closeChat,
    sendMessage,
    addMessage,
    addMessageForRecipient,
    markMessagesAsRead,
    addMessageNotification,
    incrementUnreadFor,
    setChatUsers,
  }
}

