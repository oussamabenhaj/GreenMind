import { io } from 'socket.io-client';
import { useRef, useState, useEffect, useContext, createContext } from 'react';

import { CONFIG } from 'src/global-config';

import { TOKEN_STORAGE_KEY } from './axios';

// ----------------------------------------------------------------------

const SocketContext = createContext({ socket: null, connected: false });

/**
 * Opens one Socket.IO connection per signed-in user (see API_ROUTES.md §3).
 * Exposes live counters for notifications and chat badges.
 */
export function SocketProvider({ userId, children }) {
  const [state, setState] = useState({ socket: null, connected: false });
  const [counters, setCounters] = useState({ notifications: 0, messages: 0 });

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!userId || !token) return undefined;

    const socket = io(CONFIG.serverUrl, { auth: { token }, withCredentials: true });
    setState({ socket, connected: false });

    socket.on('connect', () => setState({ socket, connected: true }));
    socket.on('disconnect', () => setState({ socket, connected: false }));
    socket.on('notification:unread_count', ({ count }) =>
      setCounters((c) => ({ ...c, notifications: count }))
    );
    socket.on('chat:unread_count', ({ count }) => setCounters((c) => ({ ...c, messages: count })));

    return () => {
      socket.disconnect();
      setState({ socket: null, connected: false });
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={{ ...state, counters }}>{children}</SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);

/** Subscribes `handler` to a socket event for the lifetime of the component. */
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return undefined;
    const listener = (payload) => handlerRef.current?.(payload);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}
