'use client'

import { useEffect, useRef, useState } from 'react';
import { WS_URL } from '@/config/api';

export function useWebSocket(userId) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messageQueue, setMessageQueue] = useState([]);

  useEffect(() => {
    if (!userId) return;

    // Créer la connexion WebSocket
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

    // Nettoyage
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [userId, messageQueue]);

  // Fonction pour envoyer un message
  const sendMessage = (message) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    } else {
      // Mettre en file d'attente si pas connecté
      setMessageQueue(prev => [...prev, message]);
    }
  };

  return { socket, isConnected, sendMessage };
}