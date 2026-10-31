'use client'

import { useEffect, useState } from 'react';
import { WS_URL } from '@/config/api';

export function useWebSocket(userId) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messageQueue, setMessageQueue] = useState([]);

  useEffect(() => {
    if (!userId) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setIsConnected(true);
      setSocket(ws);
      // Envoyer les messages en attente
      messageQueue.forEach(msg => ws.send(JSON.stringify(msg)));
      setMessageQueue([]);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws) ws.close();
    };
  }, [userId, messageQueue]);

  const sendMessage = (message) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    } else {
      setMessageQueue(prev => [...prev, message]);
    }
  };

  return { socket, isConnected, sendMessage };
}