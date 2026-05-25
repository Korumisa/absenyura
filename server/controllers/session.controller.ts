import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import crypto from 'crypto';
import { locationAttendSelect, sessionListRelations } from '../utils/sessionQuerySelect.js';
import { buildDynamicQrToken, QR_WINDOW_MS } from '../utils/dynamicQr.js';
import { triggerSessionCronLazy } from '../jobs/cron.js';

const isMissingSemesterColumn = (err: any) =>
  Boolean(err && err.code === 'P2022' && String(err?.meta?.column || '').includes('Class.semester'));

export const getSessions = async (req: Request, res: Response): Promise<void> => {
  triggerSessionCronLazy();
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
          include: sessionListRelations({ userId, withSemester: true }),
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
          include: sessionListRelations({ userId, withSemester: false }),
          orderBy: { session_start: 'asc' },
        });
      }
    } else {
      // Admin/Super Admin sees all sessions they created (or all if super admin)
      try {
        sessions = await prisma.session.findMany({
          where: user.role === 'ADMIN' ? { created_by_id: user.id } : {},
          include: sessionListRelations({ withSemester: true }),
          orderBy: { created_at: 'desc' },
        });
      } catch (err: any) {
        if (!isMissingSemesterColumn(err)) throw err;
        sessions = await prisma.session.findMany({
          where: user.role === 'ADMIN' ? { created_by_id: user.id } : {},
          include: sessionListRelations({ withSemester: false }),
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

type SessionTimeError = { field: string; message: string; error_code: string };

/** Mengembalikan `null` jika valid, atau objek error jika tidak. */
const validateSessionTimes = (
  body: {
    session_start: string;
    session_end: string;
    check_in_open_at: string;
    check_in_close_at: string;
  },
  opts: { allowPastClose: boolean },
): SessionTimeError | null => {
  const openAt = new Date(body.check_in_open_at).getTime();
  const closeAt = new Date(body.check_in_close_at).getTime();
  const startAt = new Date(body.session_start).getTime();
  const endAt = new Date(body.session_end).getTime();
  if (Number.isNaN(openAt) || Number.isNaN(closeAt) || Number.isNaN(startAt) || Number.isNaN(endAt)) {
    return { field: 'check_in_close_at', message: 'Format waktu sesi tidak valid.', error_code: 'INVALID_TIME' };
  }
  if (closeAt <= openAt) {
    return { field: 'check_in_close_at', message: 'Tutup absen harus setelah Buka absen.', error_code: 'CLOSE_BEFORE_OPEN' };
  }
  if (endAt < startAt) {
    return { field: 'session_end', message: 'Berakhir sesi tidak boleh sebelum mulai sesi.', error_code: 'END_BEFORE_START' };
  }
  if (!opts.allowPastClose && closeAt <= Date.now() + 60_000) {
    return { field: 'check_in_close_at', message: 'Tutup absen harus minimal 1 menit ke depan.', error_code: 'CLOSE_AT_IN_PAST' };
  }
  return null;
};

const sendSessionTimeError = (res: Response, v: SessionTimeError): void => {
  res.status(400).json({
    success: false,
    error_code: v.error_code,
    field_errors: { [v.field]: v.message },
    message: v.message,
  });
};

export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, class_id, class_ids, location_id, qr_mode, session_start, session_end, check_in_open_at, check_in_close_at, late_threshold_minutes, require_checkout } = req.body;
    const user_id = (req as any).user.id;
    const incomingClassIds = Array.isArray(class_ids) ? class_ids.map((x: any) => String(x || '').trim()).filter(Boolean) : [];
    const uniqueClassIds = Array.from(new Set(incomingClassIds));
    const useMultiClass = uniqueClassIds.length > 0;

    if (!title || !String(title).trim()) {
      sendSessionTimeError(res, { field: 'title', message: 'Judul sesi wajib diisi.', error_code: 'MISSING_TITLE' });
      return;
    }
    if (!location_id) {
      sendSessionTimeError(res, { field: 'location_id', message: 'Lokasi sesi wajib dipilih.', error_code: 'MISSING_LOCATION' });
      return;
    }

    const timeError = validateSessionTimes(
      { session_start, session_end, check_in_open_at, check_in_close_at },
      { allowPastClose: false },
    );
    if (timeError) {
      sendSessionTimeError(res, timeError);
      return;
    }

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
      try {
        await prisma.notification.createMany({
          data: expectedUserIds.map(id => ({
            user_id: id,
            title: 'Jadwal Sesi Baru',
            message: `Sesi baru "${title}" telah dijadwalkan pada ${new Date(session_start).toLocaleString('id-ID')}.`,
            type: 'INFO'
          }))
        });
      } catch (notifyErr) {
        console.error('Error sending session notifications (session saved):', notifyErr);
      }
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

    // Edit sesi yang sudah berjalan (ACTIVE/CLOSED) boleh punya close_at di masa lalu —
    // hanya block kalau sesi masih UPCOMING (belum mulai).
    const existing = await prisma.session.findUnique({ where: { id }, select: { status: true } });
    const allowPastClose = Boolean(existing && existing.status !== 'UPCOMING');
    const timeError = validateSessionTimes(
      { session_start, session_end, check_in_open_at, check_in_close_at },
      { allowPastClose },
    );
    if (timeError) {
      sendSessionTimeError(res, timeError);
      return;
    }

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
  triggerSessionCronLazy();
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        location: { select: locationAttendSelect },
        creator: { select: { name: true } },
        class: { select: { id: true, name: true, semester: true } },
        session_classes: {
          select: { class: { select: { id: true, name: true, semester: true } } },
        },
      },
    });

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    if (user.role === 'USER') {
      const classIds = session.class_id ? [session.class_id] : (session.session_classes ?? []).map((sc: any) => sc.class_id).filter(Boolean);
      if (classIds.length > 0) {
        const enrolled = await prisma.classEnrollment.findFirst({
          where: {
            student_id: user.id,
            class_id: { in: classIds }
          }
        });
        if (!enrolled) {
          res.status(403).json({
            success: false,
            error_code: 'BOLA_UNAUTHORIZED_CLASS',
            error: 'Kode QR ini bukan untuk kelas Anda. Pastikan Anda memindai kode yang benar.'
          });
          return;
        }
      }
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
    const session = await prisma.session.findUnique({
      where: { id },
      select: { id: true, qr_mode: true, qr_token: true, qr_secret: true },
    });

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

    if (!session.qr_secret) {
      res.status(500).json({ success: false, error: 'QR Secret is not configured for this session' });
      return;
    }

    const dynamicToken = buildDynamicQrToken(session.id, session.qr_secret);

    res.status(200).json({
      success: true,
      data: { token: dynamicToken, expires_in: QR_WINDOW_MS },
    });
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
      select: {
        id: true,
        status: true,
        check_in_time: true,
        check_out_time: true,
        user: { select: { name: true, nim_nip: true } },
      },
      orderBy: { check_in_time: 'desc' },
    });

    res.status(200).json({ success: true, data: attendances });
  } catch (error) {
    console.error('Error fetching session attendances:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
