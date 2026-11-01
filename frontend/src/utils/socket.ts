import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Each tab creates its own socket instance (because module is re-evaluated per tab)
let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket || socket.disconnected) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      withCredentials: true,
      auth: { token: getToken() || '' },
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket?.id);
    });
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });
    socket.on('connect_error', (err) => {
      console.warn('⚠️ Socket error:', err.message);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};
