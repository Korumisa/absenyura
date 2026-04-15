import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';

import cookie from 'cookie';

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  io.use((socket, next) => {
    let token = socket.handshake.auth.token;
    
    // Fallback to cookie
    if (!token && socket.handshake.headers.cookie) {
      const cookies = cookie.parse(socket.handshake.headers.cookie);
      token = cookies.accessToken;
    }

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const decoded = verifyAccessToken(token);
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`Socket connected: User ${user.id} (${user.role})`);

    // Join a room for a specific session (e.g. for Dosen monitoring QR/Attendees)
    socket.on('join_session', (sessionId: string) => {
      socket.join(`session_${sessionId}`);
      console.log(`User ${user.id} joined session_${sessionId}`);
    });

    socket.on('leave_session', (sessionId: string) => {
      socket.leave(`session_${sessionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: User ${user.id}`);
    });
  });

  return io;
};