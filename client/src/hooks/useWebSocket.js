import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url) {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimeout = useRef(null);
  const intentionalClose = useRef(false);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setReconnecting(false);
      reconnectAttempt.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (err) {
        // Ignore malformed messages
      }
    };

    ws.onerror = () => {};

    ws.onclose = () => {
      setIsConnected(false);
      if (!intentionalClose.current) {
        setReconnecting(true);
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 10000);
        reconnectTimeout.current = setTimeout(() => {
          reconnectAttempt.current++;
          connect();
        }, delay);
      }
    };
  }, [url]);

  useEffect(() => {
    intentionalClose.current = false;
    connect();
    return () => {
      intentionalClose.current = true;
      clearTimeout(reconnectTimeout.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected, lastMessage, reconnecting };
}
