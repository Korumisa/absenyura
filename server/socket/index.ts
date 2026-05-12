import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import prisma from '../utils/prisma.js';

import cookie from 'cookie';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseAllowedOrigins(): Set<string> {
  const raw = String(process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '');
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export const initSocket = (server: HttpServer) => {
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = parseAllowedOrigins();
  if (isProd && allowedOrigins.size === 0) {
    throw new Error('Socket CORS not configured: set CORS_ORIGINS or FRONTEND_URL');
  }

  const io = new Server(server, {
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(isProd ? new Error('Origin required') : null, !isProd);
        if (!isProd) return cb(null, origin === 'http://localhost:5173');
        return cb(null, allowedOrigins.has(origin));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    let token: string | undefined = undefined;

    if (!isProd) {
      token = socket.handshake.auth?.token;
    }

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
    } catch {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;

    // Join a room for a specific session (e.g. for Dosen monitoring QR/Attendees)
    socket.on('join_session', async (sessionId: string, ack?: (res: any) => void) => {
      try {
        const id = String(sessionId || '').trim();
        if (!UUID_RE.test(id)) {
          ack?.({ ok: false, error: 'sessionId tidak valid' });
          return;
        }

        if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
          ack?.({ ok: false, error: 'Forbidden' });
          return;
        }

        const session = await prisma.session.findUnique({
          where: { id },
          select: {
            id: true,
            created_by_id: true,
            class: { select: { lecturer_id: true } },
          },
        });

        if (!session) {
          ack?.({ ok: false, error: 'Session tidak ditemukan' });
          return;
        }

        if (user.role === 'ADMIN') {
          const isOwner = session.created_by_id === user.id;
          const isLecturer = session.class?.lecturer_id === user.id;
          if (!isOwner && !isLecturer) {
            ack?.({ ok: false, error: 'Forbidden' });
            return;
          }
        }

        socket.join(`session_${id}`);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false, error: 'Internal error' });
      }
    });

    socket.on('leave_session', (sessionId: string) => {
      const id = String(sessionId || '').trim();
      if (!UUID_RE.test(id)) return;
      socket.leave(`session_${id}`);
    });

    socket.on('disconnect', () => {});
  });

  return io;
};
