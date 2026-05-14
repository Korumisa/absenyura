import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import crypto from 'crypto';

const isMissingSemesterColumn = (err: any) =>
  Boolean(err && err.code === 'P2022' && String(err?.meta?.column || '').includes('Class.semester'));

export const getSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    let sessions;

    if (user.role === 'USER') {
      const userId = user.id as string;
      try {
        sessions = await prisma.session.findMany({
          where: {
            status: { in: ['UPCOMING', 'ACTIVE'] },
            OR: [
              { class_id: null, session_classes: { none: {} } },
              { class: { enrollments: { some: { student_id: userId } } } },
              { session_classes: { some: { class: { enrollments: { some: { student_id: userId } } } } } },
            ]
          },
          include: {
            location: true,
            creator: { select: { name: true } },
            class: { select: { id: true, name: true, semester: true } },
            session_classes: { include: { class: { select: { id: true, name: true, semester: true } } } },
            attendances: { where: { user_id: userId } },
          },
          orderBy: { session_start: 'asc' },
        });
      } catch (err: any) {
        if (!isMissingSemesterColumn(err)) throw err;
        sessions = await prisma.session.findMany({
          where: {
            status: { in: ['UPCOMING', 'ACTIVE'] },
            OR: [
              { class_id: null, session_classes: { none: {} } },
              { class: { enrollments: { some: { student_id: userId } } } },
              { session_classes: { some: { class: { enrollments: { some: { student_id: userId } } } } } },
            ]
          },
          include: {
            location: true,
            creator: { select: { name: true } },
            class: { select: { id: true, name: true } },
            session_classes: { include: { class: { select: { id: true, name: true } } } },
            attendances: { where: { user_id: userId } },
          },
          orderBy: { session_start: 'asc' },
        });
      }
    } else {
      // Admin/Super Admin sees all sessions they created (or all if super admin)
      try {
        sessions = await prisma.session.findMany({
          where: user.role === 'ADMIN' ? { created_by_id: user.id } : {},
          include: {
            location: true,
            creator: { select: { name: true } },
            class: { select: { id: true, name: true, semester: true } },
            session_classes: { include: { class: { select: { id: true, name: true, semester: true } } } },
          },
          orderBy: { created_at: 'desc' },
        });
      } catch (err: any) {
        if (!isMissingSemesterColumn(err)) throw err;
        sessions = await prisma.session.findMany({
          where: user.role === 'ADMIN' ? { created_by_id: user.id } : {},
          include: {
            location: true,
            creator: { select: { name: true } },
            class: { select: { id: true, name: true } },
            session_classes: { include: { class: { select: { id: true, name: true } } } },
          },
          orderBy: { created_at: 'desc' },
        });
      }
    }

    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, class_id, class_ids, location_id, qr_mode, session_start, session_end, check_in_open_at, check_in_close_at, late_threshold_minutes, require_checkout } = req.body;
    const user_id = (req as any).user.id;
    const incomingClassIds = Array.isArray(class_ids) ? class_ids.map((x: any) => String(x || '').trim()).filter(Boolean) : [];
    const uniqueClassIds = Array.from(new Set(incomingClassIds));
    const useMultiClass = uniqueClassIds.length > 0;

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
        class_id: useMultiClass ? null : (class_id || null),
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

    if (useMultiClass) {
      await prisma.sessionClass.createMany({
        data: uniqueClassIds.map((cid) => ({ session_id: session.id, class_id: cid })),
        skipDuplicates: true,
      });
    }

    // Notify students about the new session
    let expectedUserIds: string[] = [];
    if (useMultiClass) {
      const enrollments = await prisma.classEnrollment.findMany({
        where: { class_id: { in: uniqueClassIds } },
        select: { student_id: true }
      });
      expectedUserIds = Array.from(new Set(enrollments.map(e => e.student_id)));
    } else if (class_id) {
      const enrollments = await prisma.classEnrollment.findMany({
        where: { class_id },
        select: { student_id: true }
      });
      expectedUserIds = enrollments.map(e => e.student_id);
    } else {
      const allUsers = await prisma.user.findMany({ where: { role: 'USER', is_active: true } });
      expectedUserIds = allUsers.map(u => u.id);
    }

    if (expectedUserIds.length > 0) {
      await prisma.notification.createMany({
        data: expectedUserIds.map(id => ({
          user_id: id,
          title: 'Jadwal Sesi Baru',
          message: `Sesi baru "${title}" telah dijadwalkan pada ${new Date(session_start).toLocaleString('id-ID')}.`,
          type: 'INFO'
        }))
      });
    }

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, class_id, class_ids, location_id, qr_mode, session_start, session_end, check_in_open_at, check_in_close_at, late_threshold_minutes, require_checkout, status } = req.body;
    const hasClassIds = Array.isArray(class_ids);
    const incomingClassIds = hasClassIds ? class_ids.map((x: any) => String(x || '').trim()).filter(Boolean) : [];
    const uniqueClassIds = Array.from(new Set(incomingClassIds));

    const session = await prisma.session.update({
      where: { id },
      data: {
        title,
        description,
        class_id: uniqueClassIds.length > 0 ? null : (class_id || null),
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

    if (hasClassIds) {
      await prisma.sessionClass.deleteMany({ where: { session_id: id } });
      if (uniqueClassIds.length > 0) {
        await prisma.sessionClass.createMany({
          data: uniqueClassIds.map((cid) => ({ session_id: id, class_id: cid })),
          skipDuplicates: true,
        });
      }
    }

    res.status(200).json({ success: true, data: session });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Hapus data terkait terlebih dahulu untuk menghindari error Foreign Key Constraint
    // (Karena pada schema.prisma tidak menggunakan onDelete: Cascade pada tabel terkait)
    await prisma.attendance.deleteMany({ where: { session_id: id } });
    await prisma.excuseRequest.deleteMany({ where: { session_id: id } });
    await prisma.sessionClass.deleteMany({ where: { session_id: id } });

    // Setelah tabel anak dihapus, barulah hapus sesi utamanya
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
    if (!session.qr_secret) {
      res.status(500).json({ success: false, error: 'QR Secret is not configured for this session' });
      return;
    }
    const hmac = crypto.createHmac('sha256', session.qr_secret);
    hmac.update(payload);
    const signature = hmac.digest('hex');

    const dynamicToken = `${payload}:${signature}`;

    res.status(200).json({ success: true, data: { token: dynamicToken, expires_in: 15000 } });
  } catch (error) {
    console.error('Error getting QR:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getSessionAttendances = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const attendances = await prisma.attendance.findMany({
      where: { session_id: id },
      include: {
        user: { select: { name: true, nim_nip: true } }
      },
      orderBy: { check_in_time: 'desc' }
    });

    res.status(200).json({ success: true, data: attendances });
  } catch (error) {
    console.error('Error fetching session attendances:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
