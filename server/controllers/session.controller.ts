import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import crypto from 'crypto';
import { ipRestrictionEnabledFromWifiBssid } from '../utils/attendanceValidation.js';
import {
  sessionDetailSelect,
  sessionListSelect,
  stripSessionQrSecrets,
} from '../utils/sessionQuerySelect.js';
import { buildDynamicQrToken, QR_WINDOW_MS } from '../utils/dynamicQr.js';
import { triggerSessionCronLazy } from '../jobs/cron.js';
import {
  adminOwnsAllClasses,
  adminSessionScopeWhere,
  assertAdminSessionScope,
} from '../utils/sessionAccess.js';
import { sendForbidden } from '../utils/errorResponse.js';

const isMissingSemesterColumn = (err: any) =>
  Boolean(
    err && err.code === 'P2022' && String(err?.meta?.column || '').includes('Class.semester')
  );

const VALID_QR_MODES = new Set(['NONE', 'STATIC', 'DYNAMIC']);
const VALID_SESSION_STATUSES = new Set(['UPCOMING', 'ACTIVE', 'CLOSED']);

function isValidQrMode(value: unknown): value is string {
  return typeof value === 'string' && VALID_QR_MODES.has(value);
}

function isValidSessionStatus(value: unknown): value is string {
  return typeof value === 'string' && VALID_SESSION_STATUSES.has(value);
}

function buildQrFields(qrMode: string) {
  if (qrMode === 'STATIC') {
    return { qr_token: crypto.randomBytes(16).toString('hex'), qr_secret: null };
  }
  if (qrMode === 'DYNAMIC') {
    return { qr_token: null, qr_secret: crypto.randomBytes(32).toString('hex') };
  }
  return { qr_token: null, qr_secret: null };
}

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
              {
                session_classes: {
                  some: { class: { enrollments: { some: { student_id: userId } } } },
                },
              },
            ],
          },
          select: sessionListSelect({ userId, withSemester: true }),
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
              {
                session_classes: {
                  some: { class: { enrollments: { some: { student_id: userId } } } },
                },
              },
            ],
          },
          select: sessionListSelect({ userId, withSemester: false }),
          orderBy: { session_start: 'asc' },
        });
      }
    } else {
      try {
        sessions = await prisma.session.findMany({
          where: user.role === 'ADMIN' ? adminSessionScopeWhere(user.id) : {},
          select: sessionListSelect({ withSemester: true }),
          orderBy: { created_at: 'desc' },
        });
      } catch (err: any) {
        if (!isMissingSemesterColumn(err)) throw err;
        sessions = await prisma.session.findMany({
          where: user.role === 'ADMIN' ? adminSessionScopeWhere(user.id) : {},
          select: sessionListSelect({ withSemester: false }),
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
  opts: { allowPastClose: boolean }
): SessionTimeError | null => {
  const openAt = new Date(body.check_in_open_at).getTime();
  const closeAt = new Date(body.check_in_close_at).getTime();
  const startAt = new Date(body.session_start).getTime();
  const endAt = new Date(body.session_end).getTime();
  if (
    Number.isNaN(openAt) ||
    Number.isNaN(closeAt) ||
    Number.isNaN(startAt) ||
    Number.isNaN(endAt)
  ) {
    return {
      field: 'check_in_close_at',
      message: 'Format waktu sesi tidak valid.',
      error_code: 'INVALID_TIME',
    };
  }
  if (closeAt <= openAt) {
    return {
      field: 'check_in_close_at',
      message: 'Tutup absen harus setelah Buka absen.',
      error_code: 'CLOSE_BEFORE_OPEN',
    };
  }
  if (endAt < startAt) {
    return {
      field: 'session_end',
      message: 'Berakhir sesi tidak boleh sebelum mulai sesi.',
      error_code: 'END_BEFORE_START',
    };
  }
  if (!opts.allowPastClose && closeAt <= Date.now() + 60_000) {
    return {
      field: 'check_in_close_at',
      message: 'Tutup absen harus minimal 1 menit ke depan.',
      error_code: 'CLOSE_AT_IN_PAST',
    };
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
    const {
      title,
      description,
      class_id,
      class_ids,
      location_id,
      qr_mode,
      session_start,
      session_end,
      check_in_open_at,
      check_in_close_at,
      late_threshold_minutes,
      require_checkout,
    } = req.body;
    const user = (req as any).user;
    const user_id = user.id;
    const incomingClassIds = Array.isArray(class_ids)
      ? class_ids.flatMap((x: any) => {
          const result = String(x || '').trim();
          return result ? [result] : [];
        })
      : [];
    const uniqueClassIds = Array.from(new Set(incomingClassIds));
    const useMultiClass = uniqueClassIds.length > 0;
    const selectedClassIds = useMultiClass ? uniqueClassIds : class_id ? [class_id] : [];

    if (user.role === 'ADMIN') {
      if (selectedClassIds.length === 0) {
        sendForbidden(res, {
          error_code: 'ADMIN_SESSION_REQUIRES_CLASS',
          message: 'Admin harus memilih minimal 1 kelas untuk membuat sesi.',
        });
        return;
      }
      const owned = await adminOwnsAllClasses(user.id, selectedClassIds);
      if (!owned) {
        sendForbidden(res, {
          error_code: 'CLASS_OUT_OF_SCOPE',
          message: 'Kelas yang dipilih bukan kelas yang Anda ampu.',
        });
        return;
      }
    }

    if (!title || !String(title).trim()) {
      sendSessionTimeError(res, {
        field: 'title',
        message: 'Judul sesi wajib diisi.',
        error_code: 'MISSING_TITLE',
      });
      return;
    }
    if (!location_id) {
      sendSessionTimeError(res, {
        field: 'location_id',
        message: 'Lokasi sesi wajib dipilih.',
        error_code: 'MISSING_LOCATION',
      });
      return;
    }
    if (!isValidQrMode(qr_mode)) {
      sendSessionTimeError(res, {
        field: 'qr_mode',
        message: 'Mode QR tidak valid.',
        error_code: 'INVALID_QR_MODE',
      });
      return;
    }

    const timeError = validateSessionTimes(
      { session_start, session_end, check_in_open_at, check_in_close_at },
      { allowPastClose: false }
    );
    if (timeError) {
      sendSessionTimeError(res, timeError);
      return;
    }

    const qrFields = buildQrFields(qr_mode);

    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          title,
          description,
          class_id: useMultiClass ? null : class_id || null,
          location_id,
          created_by_id: user_id,
          qr_mode,
          ...qrFields,
          session_start: new Date(session_start),
          session_end: new Date(session_end),
          check_in_open_at: new Date(check_in_open_at),
          check_in_close_at: new Date(check_in_close_at),
          late_threshold_minutes: parseInt(late_threshold_minutes, 10),
          require_checkout: Boolean(require_checkout),
        },
      });

      if (useMultiClass) {
        await tx.sessionClass.createMany({
          data: uniqueClassIds.map((cid) => ({ session_id: created.id, class_id: cid })),
          skipDuplicates: true,
        });
      }
      return created;
    });

    // Notify students about the new session
    let expectedUserIds: string[] = [];
    if (useMultiClass) {
      const enrollments = await prisma.classEnrollment.findMany({
        where: { class_id: { in: uniqueClassIds } },
        select: { student_id: true },
      });
      expectedUserIds = Array.from(new Set(enrollments.map((e) => e.student_id)));
    } else if (class_id) {
      const enrollments = await prisma.classEnrollment.findMany({
        where: { class_id },
        select: { student_id: true },
      });
      expectedUserIds = enrollments.map((e) => e.student_id);
    } else {
      const allUsers = await prisma.user.findMany({ where: { role: 'USER', is_active: true } });
      expectedUserIds = allUsers.map((u) => u.id);
    }

    if (expectedUserIds.length > 0) {
      try {
        await prisma.notification.createMany({
          data: expectedUserIds.map((id) => ({
            user_id: id,
            title: 'Jadwal Sesi Baru',
            message: `Sesi baru "${title}" telah dijadwalkan pada ${new Date(session_start).toLocaleString('id-ID')}.`,
            type: 'INFO',
          })),
        });
      } catch (notifyErr) {
        console.error('Error sending session notifications (session saved):', notifyErr);
      }
    }

    res
      .status(201)
      .json({ success: true, data: stripSessionQrSecrets(session as Record<string, unknown>) });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    if (!(await assertAdminSessionScope(user, id))) {
      sendForbidden(res, {
        error_code: 'SESSION_OUT_OF_SCOPE',
        message: 'Sesi ini di luar akses Anda.',
      });
      return;
    }
    const {
      title,
      description,
      class_id,
      class_ids,
      location_id,
      qr_mode,
      session_start,
      session_end,
      check_in_open_at,
      check_in_close_at,
      late_threshold_minutes,
      require_checkout,
      status,
    } = req.body;
    const hasClassIds = Array.isArray(class_ids);
    const incomingClassIds = hasClassIds
      ? class_ids.flatMap((x: any) => {
          const result = String(x || '').trim();
          return result ? [result] : [];
        })
      : [];
    const uniqueClassIds = Array.from(new Set(incomingClassIds));
    const selectedClassIds =
      uniqueClassIds.length > 0 ? uniqueClassIds : class_id ? [class_id] : [];

    // Edit sesi yang sudah berjalan (ACTIVE/CLOSED) boleh punya close_at di masa lalu —
    // hanya block kalau sesi masih UPCOMING (belum mulai).
    const existing = await prisma.session.findUnique({
      where: { id },
      select: { status: true, qr_mode: true, qr_token: true, qr_secret: true },
    });
    const allowPastClose = Boolean(existing && existing.status !== 'UPCOMING');
    const timeError = validateSessionTimes(
      { session_start, session_end, check_in_open_at, check_in_close_at },
      { allowPastClose }
    );
    if (timeError) {
      sendSessionTimeError(res, timeError);
      return;
    }
    const nextQrMode = qr_mode == null ? existing?.qr_mode : qr_mode;
    if (!isValidQrMode(nextQrMode)) {
      sendSessionTimeError(res, {
        field: 'qr_mode',
        message: 'Mode QR tidak valid.',
        error_code: 'INVALID_QR_MODE',
      });
      return;
    }
    if (status != null && !isValidSessionStatus(status)) {
      sendSessionTimeError(res, {
        field: 'status',
        message: 'Status sesi tidak valid.',
        error_code: 'INVALID_SESSION_STATUS',
      });
      return;
    }
    if (user.role === 'ADMIN') {
      if (selectedClassIds.length === 0) {
        sendForbidden(res, {
          error_code: 'ADMIN_SESSION_REQUIRES_CLASS',
          message: 'Admin harus memilih minimal 1 kelas untuk sesi.',
        });
        return;
      }
      const owned = await adminOwnsAllClasses(user.id, selectedClassIds);
      if (!owned) {
        sendForbidden(res, {
          error_code: 'CLASS_OUT_OF_SCOPE',
          message: 'Kelas yang dipilih bukan kelas yang Anda ampu.',
        });
        return;
      }
    }

    const qrFields =
      nextQrMode !== existing?.qr_mode
        ? buildQrFields(nextQrMode)
        : nextQrMode === 'STATIC'
          ? {
              qr_token: existing?.qr_token ?? crypto.randomBytes(16).toString('hex'),
              qr_secret: null,
            }
          : nextQrMode === 'DYNAMIC'
            ? {
                qr_token: null,
                qr_secret: existing?.qr_secret ?? crypto.randomBytes(32).toString('hex'),
              }
            : { qr_token: null, qr_secret: null };

    const session = await prisma.$transaction(async (tx) => {
      const updated = await tx.session.update({
        where: { id },
        data: {
          title,
          description,
          class_id: uniqueClassIds.length > 0 ? null : class_id || null,
          location_id,
          qr_mode: nextQrMode,
          ...qrFields,
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
        await tx.sessionClass.deleteMany({ where: { session_id: id } });
        if (uniqueClassIds.length > 0) {
          await tx.sessionClass.createMany({
            data: uniqueClassIds.map((cid) => ({ session_id: id, class_id: cid })),
            skipDuplicates: true,
          });
        }
      }
      return updated;
    });

    res
      .status(200)
      .json({ success: true, data: stripSessionQrSecrets(session as Record<string, unknown>) });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    if (!(await assertAdminSessionScope(user, id))) {
      sendForbidden(res, {
        error_code: 'SESSION_OUT_OF_SCOPE',
        message: 'Sesi ini di luar akses Anda.',
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.attendance.deleteMany({ where: { session_id: id } });
      await tx.excuseRequest.deleteMany({ where: { session_id: id } });
      await tx.sessionClass.deleteMany({ where: { session_id: id } });
      await tx.session.delete({ where: { id } });
    });

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
    let session;
    try {
      session = await prisma.session.findUnique({
        where: { id },
        select: sessionDetailSelect({ withSemester: true }),
      });
    } catch (err: any) {
      if (!isMissingSemesterColumn(err)) throw err;
      session = await prisma.session.findUnique({
        where: { id },
        select: sessionDetailSelect({ withSemester: false }),
      });
    }

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    if (user.role === 'USER') {
      const classIds = session.class_id
        ? [session.class_id]
        : (session.session_classes ?? []).flatMap((sc: any) => {
            const result = sc.class_id;
            return result ? [result] : [];
          });
      if (classIds.length > 0) {
        const enrolled = await prisma.classEnrollment.findFirst({
          where: {
            student_id: user.id,
            class_id: { in: classIds },
          },
        });
        if (!enrolled) {
          res.status(403).json({
            success: false,
            error_code: 'BOLA_UNAUTHORIZED_CLASS',
            error: 'Kode QR ini bukan untuk kelas Anda. Pastikan Anda memindai kode yang benar.',
          });
          return;
        }
      }
    } else if (user.role === 'ADMIN') {
      if (!(await assertAdminSessionScope(user, id))) {
        sendForbidden(res, {
          error_code: 'SESSION_OUT_OF_SCOPE',
          message: 'Sesi ini di luar akses Anda.',
        });
        return;
      }
    }

    const ipMeta = await prisma.location.findUnique({
      where: { id: session.location.id },
      select: { wifi_bssid: true },
    });
    const data = {
      ...session,
      location: {
        ...session.location,
        ip_restriction_enabled: ipRestrictionEnabledFromWifiBssid(ipMeta?.wifi_bssid),
      },
    };
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Generate Dynamic QR or return Static Token
export const getSessionQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const session = await prisma.session.findUnique({
      where: { id },
      select: { id: true, qr_mode: true, qr_token: true, qr_secret: true },
    });

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }
    if (!(await assertAdminSessionScope(user, id))) {
      sendForbidden(res, {
        error_code: 'SESSION_OUT_OF_SCOPE',
        message: 'Sesi ini di luar akses Anda.',
      });
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
      res
        .status(500)
        .json({ success: false, error: 'QR Secret is not configured for this session' });
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
    const user = (req as any).user;
    if (!(await assertAdminSessionScope(user, id))) {
      sendForbidden(res, {
        error_code: 'SESSION_OUT_OF_SCOPE',
        message: 'Sesi ini di luar akses Anda.',
      });
      return;
    }
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
