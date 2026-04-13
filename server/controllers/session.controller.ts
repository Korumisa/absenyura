import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import crypto from 'crypto';

export const getSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    let sessions;

    if (user.role === 'USER') {
      // User sees upcoming/active sessions for classes they are enrolled in, or classes without class_id
      sessions = await prisma.session.findMany({
        where: {
          status: { in: ['UPCOMING', 'ACTIVE'] },
          OR: [
            { class_id: null },
            { class: { enrollments: { some: { student_id: user.id } } } }
          ]
        },
        include: { location: true, creator: { select: { name: true } }, class: { select: { name: true } } },
        orderBy: { session_start: 'asc' },
      });
    } else {
      // Admin/Super Admin sees all sessions they created (or all if super admin)
      sessions = await prisma.session.findMany({
        where: user.role === 'ADMIN' ? { created_by_id: user.id } : {},
        include: { location: true, creator: { select: { name: true } }, class: { select: { name: true } } },
        orderBy: { created_at: 'desc' },
      });
    }

    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, class_id, location_id, qr_mode, session_start, session_end, check_in_open_at, check_in_close_at, late_threshold_minutes, require_checkout } = req.body;
    const user_id = (req as any).user.id;

    // Generate static token if qr_mode is STATIC
    let qr_token = null;
    let qr_secret = null;

    if (qr_mode === 'STATIC') {
      qr_token = crypto.randomBytes(16).toString('hex');
    } else if (qr_mode === 'DYNAMIC') {
      qr_secret = crypto.randomBytes(32).toString('hex');
    }

    const session = await prisma.session.create({
      data: {
        title,
        description,
        class_id: class_id || null,
        location_id,
        created_by_id: user_id,
        qr_mode,
        qr_token,
        qr_secret,
        session_start: new Date(session_start),
        session_end: new Date(session_end),
        check_in_open_at: new Date(check_in_open_at),
        check_in_close_at: new Date(check_in_close_at),
        late_threshold_minutes: parseInt(late_threshold_minutes, 10),
        require_checkout: Boolean(require_checkout),
      },
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, class_id, location_id, qr_mode, session_start, session_end, check_in_open_at, check_in_close_at, late_threshold_minutes, require_checkout, status } = req.body;

    const session = await prisma.session.update({
      where: { id },
      data: {
        title,
        description,
        class_id: class_id || null,
        location_id,
        session_start: new Date(session_start),
        session_end: new Date(session_end),
        check_in_open_at: new Date(check_in_open_at),
        check_in_close_at: new Date(check_in_close_at),
        late_threshold_minutes: parseInt(late_threshold_minutes, 10),
        require_checkout: Boolean(require_checkout),
        status,
      },
    });

    res.status(200).json({ success: true, data: session });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.session.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getSessionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const session = await prisma.session.findUnique({
      where: { id },
      include: { location: true, creator: { select: { name: true } } },
    });

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};



// Generate Dynamic QR or return Static Token
export const getSessionQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const session = await prisma.session.findUnique({ where: { id } });

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    if (session.qr_mode === 'NONE') {
      res.status(400).json({ success: false, error: 'This session does not use QR codes' });
      return;
    }

    if (session.qr_mode === 'STATIC') {
      res.status(200).json({ success: true, data: { token: session.qr_token } });
      return;
    }

    // DYNAMIC QR mode logic
    const timestamp = Date.now();
    const payload = `${session.id}:${timestamp}`;
    
    // Create HMAC using the session's qr_secret
    const hmac = crypto.createHmac('sha256', session.qr_secret || 'defaultsecret');
    hmac.update(payload);
    const signature = hmac.digest('hex');

    const dynamicToken = `${payload}:${signature}`;

    res.status(200).json({ success: true, data: { token: dynamicToken, expires_in: 15000 } });
  } catch (error) {
    console.error('Error getting QR:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};