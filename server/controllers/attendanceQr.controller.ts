import type { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import prisma from '../utils/prisma.js';
import { validateSessionQr } from '../utils/sessionQr.js';
import { withTransientDbRetry } from '../utils/prismaTransient.js';
import { sendInternalServerError } from '../utils/errorResponse.js';

export async function verifyAttendanceQr(req: AuthRequest, res: Response): Promise<void> {
  try {
    const session = await withTransientDbRetry(
      () =>
        prisma.session.findUnique({
          where: { id: req.body.session_id },
          select: {
            id: true,
            status: true,
            qr_mode: true,
            qr_token: true,
            qr_secret: true,
            class_id: true,
            session_classes: { select: { class_id: true } },
            check_in_open_at: true,
            check_in_close_at: true,
          },
        }),
      { retries: 2, delayMs: 200 }
    );
    if (!session) {
      res.status(404).json({ success: false });
      return;
    }
    const classIds = [
      ...(session.class_id ? [session.class_id] : []),
      ...session.session_classes.map((item) => item.class_id),
    ];
    if (classIds.length) {
      const enrolled = await withTransientDbRetry(
        () =>
          prisma.classEnrollment.findFirst({
            where: { student_id: req.user!.id, class_id: { in: classIds } },
            select: { id: true },
          }),
        { retries: 2, delayMs: 200 }
      );
      if (!enrolled) {
        res.status(403).json({ success: false, error: 'Anda belum terdaftar di kelas ini.' });
        return;
      }
    }
    const now = new Date();
    if (
      session.status !== 'ACTIVE' ||
      (req.body.action !== 'checkout' &&
        (now < session.check_in_open_at || now > session.check_in_close_at))
    ) {
      res
        .status(400)
        .json({ success: false, error: 'Waktu absensi belum dibuka atau sudah berakhir.' });
      return;
    }
    const result = validateSessionQr(session, req.body.qr_token, now);
    if (!result.ok) {
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    sendInternalServerError(res, error);
  }
}
