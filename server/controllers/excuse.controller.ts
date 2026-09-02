import { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import prisma from '../utils/prisma.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { assertAdminSessionScope } from '../utils/sessionAccess.js';
import { sendForbidden } from '../utils/errorResponse.js';
import { parseFiniteNumber } from '../utils/attendanceValidation.js';
import {
  buildExcuseProofPayload,
  getExcuseProofSecret,
  isTimingSafeMatch,
  signExcuseProof,
} from '../utils/excuseProof.js';
import { queryWithSemesterFallback } from '../utils/prismaErrors.js';

// Configure Cloudinary if ENV vars exist
if (process.env.CLOUDINARY_URL) {
  // Automatically uses CLOUDINARY_URL
}

const VALID_EXCUSE_REASONS = new Set(['SICK', 'EXCUSED']);
const VALID_REVIEW_STATUSES = new Set(['APPROVED', 'REJECTED']);

export const getExcuseChallenge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.id;
    const sessionId = String(req.query.session_id || '').trim();
    const photoSize = parseFiniteNumber(req.query.photo_size);
    const photoType = String(req.query.photo_type || '')
      .trim()
      .toLowerCase();
    const secret = getExcuseProofSecret();

    if (!secret) {
      res.status(500).json({ success: false, error: 'Konfigurasi security proof belum lengkap' });
      return;
    }
    if (!user_id || !sessionId || photoSize === null || photoSize <= 0 || !photoType) {
      res.status(400).json({ success: false, error: 'Data security challenge tidak lengkap' });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        class_id: true,
        session_classes: { select: { class_id: true } },
      },
    });
    if (!session) {
      res.status(404).json({ success: false, error: 'Sesi tidak ditemukan' });
      return;
    }
    const scopedClassIds = session.class_id
      ? [session.class_id]
      : session.session_classes.flatMap((sc) => (sc.class_id ? [sc.class_id] : []));
    if (scopedClassIds.length > 0) {
      const enrolled = await prisma.classEnrollment.findFirst({
        where: { student_id: user_id, class_id: { in: scopedClassIds } },
        select: { id: true },
      });
      if (!enrolled) {
        res.status(403).json({
          success: false,
          error: 'Anda tidak terdaftar pada kelas untuk sesi ini.',
        });
        return;
      }
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const expires_at = new Date(Date.now() + 2 * 60000);
    await prisma.challengeNonce.create({ data: { nonce, expires_at } });

    const payload = buildExcuseProofPayload({
      userId: user_id,
      sessionId,
      photoSize,
      photoType,
      nonce,
      expiresAt: expires_at,
    });
    const signature = signExcuseProof(payload, secret);

    res.status(200).json({ success: true, data: { nonce, signature, expires_at } });
  } catch {
    res.status(500).json({ success: false, error: 'Gagal membuat security challenge' });
  }
};

async function verifyExcuseProof(input: {
  userId: string;
  sessionId: string;
  photoSize: number;
  photoType: string;
  nonce: string;
  signature: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!input.nonce || !input.signature) {
    return {
      ok: false,
      status: 400,
      error: 'Security proof (nonce/signature) tidak valid. Harap update aplikasi.',
    };
  }

  let nonceExpiresAt: Date;
  try {
    const deletedNonce = await prisma.challengeNonce.delete({ where: { nonce: input.nonce } });
    nonceExpiresAt = deletedNonce.expires_at;
    if (deletedNonce.expires_at < new Date()) {
      return {
        ok: false,
        status: 400,
        error:
          'Waktu pengambilan foto Anda telah habis demi keamanan. Mari ambil foto ulang untuk melanjutkan.',
      };
    }
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return {
        ok: false,
        status: 400,
        error:
          'Waktu pengambilan foto Anda telah habis demi keamanan. Mari ambil foto ulang untuk melanjutkan.',
      };
    }
    throw error;
  }

  const secret = getExcuseProofSecret();
  if (!secret) {
    return { ok: false, status: 500, error: 'Konfigurasi security proof belum lengkap' };
  }

  const payloadToSign = buildExcuseProofPayload({
    userId: input.userId,
    sessionId: input.sessionId,
    photoSize: input.photoSize,
    photoType: input.photoType,
    nonce: input.nonce,
    expiresAt: nonceExpiresAt,
  });
  const expectedSignature = signExcuseProof(payloadToSign, secret);
  if (!isTimingSafeMatch(String(input.signature), expectedSignature)) {
    return {
      ok: false,
      status: 400,
      error: 'Data foto tidak cocok. Silakan segarkan halaman dan ambil foto ulang.',
    };
  }
  return { ok: true };
}

export const getExcuses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let excuses;

    if (user.role === 'USER') {
      // TODO: remove fallback once all envs confirm semester column exists (2026-02 migration applied)
      excuses = await queryWithSemesterFallback(
        () =>
          prisma.excuseRequest.findMany({
            where: { user_id: user.id },
            include: {
              session: {
                select: {
                  title: true,
                  session_start: true,
                  class: { select: { name: true, semester: true } },
                  session_classes: {
                    select: { class: { select: { id: true, name: true, semester: true } } },
                  },
                },
              },
              reviewer: { select: { name: true } },
            },
            orderBy: { created_at: 'desc' },
          }),
        () =>
          prisma.excuseRequest.findMany({
            where: { user_id: user.id },
            include: {
              session: {
                select: {
                  title: true,
                  session_start: true,
                  class: { select: { name: true } },
                  session_classes: { select: { class: { select: { id: true, name: true } } } },
                },
              },
              reviewer: { select: { name: true } },
            },
            orderBy: { created_at: 'desc' },
          })
      );
    } else if (user.role === 'ADMIN') {
      // TODO: remove fallback once all envs confirm semester column exists (2026-02 migration applied)
      excuses = await queryWithSemesterFallback(
        () =>
          prisma.excuseRequest.findMany({
            where: { session: { created_by_id: user.id } },
            include: {
              user: { select: { name: true, nim_nip: true } },
              session: {
                select: {
                  title: true,
                  session_start: true,
                  class: { select: { name: true, semester: true } },
                  session_classes: {
                    select: { class: { select: { id: true, name: true, semester: true } } },
                  },
                },
              },
              reviewer: { select: { name: true } },
            },
            orderBy: { created_at: 'desc' },
          }),
        () =>
          prisma.excuseRequest.findMany({
            where: { session: { created_by_id: user.id } },
            include: {
              user: { select: { name: true, nim_nip: true } },
              session: {
                select: {
                  title: true,
                  session_start: true,
                  class: { select: { name: true } },
                  session_classes: { select: { class: { select: { id: true, name: true } } } },
                },
              },
              reviewer: { select: { name: true } },
            },
            orderBy: { created_at: 'desc' },
          })
      );
    } else {
      // Super Admin
      // TODO: remove fallback once all envs confirm semester column exists (2026-02 migration applied)
      excuses = await queryWithSemesterFallback(
        () =>
          prisma.excuseRequest.findMany({
            include: {
              user: { select: { name: true, nim_nip: true } },
              session: {
                select: {
                  title: true,
                  session_start: true,
                  class: { select: { name: true, semester: true } },
                  session_classes: {
                    select: { class: { select: { id: true, name: true, semester: true } } },
                  },
                },
              },
              reviewer: { select: { name: true } },
            },
            orderBy: { created_at: 'desc' },
          }),
        () =>
          prisma.excuseRequest.findMany({
            include: {
              user: { select: { name: true, nim_nip: true } },
              session: {
                select: {
                  title: true,
                  session_start: true,
                  class: { select: { name: true } },
                  session_classes: { select: { class: { select: { id: true, name: true } } } },
                },
              },
              reviewer: { select: { name: true } },
            },
            orderBy: { created_at: 'desc' },
          })
      );
    }

    res.status(200).json({ success: true, data: excuses });
  } catch (error) {
    console.error('Error fetching excuses:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createExcuse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { session_id, reason, description } = req.body;
    const user_id = req.user!.id;
    const file = req.file;
    const nonce = String(req.body?.nonce || '').trim();
    const signature = String(req.body?.signature || '').trim();
    const photoSizeValue = parseFiniteNumber(req.body?.photo_size);
    const photoType = String(req.body?.photo_type || '')
      .trim()
      .toLowerCase();

    if (!VALID_EXCUSE_REASONS.has(String(reason))) {
      res.status(400).json({ success: false, error: 'Alasan izin tidak valid' });
      return;
    }
    if (!session_id) {
      res.status(400).json({ success: false, error: 'Sesi wajib dipilih' });
      return;
    }
    if (!file || !file.path) {
      res.status(400).json({ success: false, error: 'Foto bukti wajib diambil melalui kamera.' });
      return;
    }
    if (photoSizeValue === null || photoSizeValue <= 0 || !photoType) {
      await fs.promises.unlink(file.path).catch(() => {});
      req.file = undefined;
      res.status(400).json({
        success: false,
        error: 'Metadata foto tidak lengkap. Silakan ambil foto ulang.',
      });
      return;
    }
    const proofCheck = await verifyExcuseProof({
      userId: user_id,
      sessionId: String(session_id),
      photoSize: photoSizeValue,
      photoType,
      nonce,
      signature,
    });
    if (!proofCheck.ok) {
      await fs.promises.unlink(file.path).catch(() => {});
      req.file = undefined;
      res.status(proofCheck.status).json({ success: false, error: proofCheck.error });
      return;
    }

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { id: session_id },
      select: {
        id: true,
        class_id: true,
        session_classes: { select: { class_id: true } },
      },
    });
    if (!session) {
      res.status(404).json({ success: false, error: 'Sesi tidak ditemukan' });
      return;
    }
    const scopedClassIds = session.class_id
      ? [session.class_id]
      : session.session_classes.flatMap((sc) => (sc.class_id ? [sc.class_id] : []));
    if (scopedClassIds.length > 0) {
      const enrolled = await prisma.classEnrollment.findFirst({
        where: { student_id: user_id, class_id: { in: scopedClassIds } },
        select: { id: true },
      });
      if (!enrolled) {
        res.status(403).json({
          success: false,
          error: 'Anda tidak terdaftar pada kelas untuk sesi ini.',
        });
        return;
      }
    }

    // Prevent duplicate pending excuses for the same session
    const existingExcuse = await prisma.excuseRequest.findFirst({
      where: { user_id, session_id },
    });

    if (existingExcuse) {
      res.status(400).json({ success: false, error: 'Anda sudah mengajukan izin untuk sesi ini' });
      return;
    }

    let proof_url = null;
    if (file && file.path) {
      if (process.env.CLOUDINARY_URL) {
        try {
          const result = await cloudinary.uploader.upload(file.path, { folder: 'excuses' });
          proof_url = result.secure_url;
        } catch (err) {
          console.error('Cloudinary Upload Error:', err);
          await fs.promises.unlink(file.path).catch(() => {});
          res.status(500).json({ success: false, error: 'Gagal mengunggah dokumen bukti' });
          return;
        } finally {
          await fs.promises.unlink(file.path).catch(() => {});
        }
      } else {
        try {
          const extFromMime: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
          };
          const rawExt = path.extname(path.basename(String(file.originalname || ''))).toLowerCase();
          const ext =
            (rawExt && rawExt.length <= 10 ? rawExt : '') ||
            extFromMime[String(file.mimetype || '').toLowerCase()] ||
            '';

          const uploadDir = path.join(process.cwd(), 'uploads', 'excuses');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const filename = `${file.fieldname}-${crypto.randomBytes(16).toString('hex')}${ext}`;
          const finalFilePath = path.join(uploadDir, filename);
          await fs.promises.rename(file.path, finalFilePath);
          proof_url = `/uploads/excuses/${filename}`;
        } catch (err) {
          console.error('Local File Save Error:', err);
          await fs.promises.unlink(file.path).catch(() => {});
          res.status(500).json({ success: false, error: 'Gagal memproses dokumen bukti' });
          return;
        }
      }
    }

    let newExcuse: any;
    try {
      // TODO: remove fallback once all envs confirm semester column exists (2026-02 migration applied)
      newExcuse = await queryWithSemesterFallback(
        () =>
          prisma.excuseRequest.create({
            data: {
              user_id,
              session_id,
              reason,
              description,
              proof_url,
            },
            include: {
              session: {
                select: {
                  title: true,
                  session_start: true,
                  class: { select: { name: true, semester: true } },
                  session_classes: {
                    select: { class: { select: { id: true, name: true, semester: true } } },
                  },
                  created_by_id: true,
                },
              },
            },
          }),
        () =>
          prisma.excuseRequest.create({
            data: {
              user_id,
              session_id,
              reason,
              description,
              proof_url,
            },
            include: {
              session: {
                select: {
                  title: true,
                  session_start: true,
                  class: { select: { name: true } },
                  session_classes: { select: { class: { select: { id: true, name: true } } } },
                  created_by_id: true,
                },
              },
            },
          })
      );
    } catch (err: any) {
      if (err?.code === 'P2002') {
        res
          .status(400)
          .json({ success: false, error: 'Anda sudah mengajukan izin untuk sesi ini' });
        return;
      }
      throw err;
    }

    // Notify creator
    const userDetails = await prisma.user.findUnique({
      where: { id: user_id },
      select: { name: true },
    });
    if (newExcuse.session.created_by_id) {
      await prisma.notification.create({
        data: {
          user_id: newExcuse.session.created_by_id,
          title: 'Pengajuan Izin Baru',
          message: `Mahasiswa ${userDetails?.name || ''} mengajukan izin untuk sesi "${newExcuse.session.title}".`,
          type: 'INFO',
        },
      });
    }

    res.status(201).json({ success: true, data: newExcuse });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(400).json({ success: false, error: 'Anda sudah mengajukan izin untuk sesi ini' });
      return;
    }
    console.error('Error creating excuse:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const reviewExcuse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body; // APPROVED or REJECTED
    const user = req.user!;
    const user_id = user.id;

    if (!VALID_REVIEW_STATUSES.has(String(status))) {
      res.status(400).json({ success: false, error: 'Status tidak valid' });
      return;
    }

    const excuse = await prisma.excuseRequest.findUnique({ where: { id } });
    if (!excuse) {
      res.status(404).json({ success: false, error: 'Pengajuan izin tidak ditemukan' });
      return;
    }
    if (!(await assertAdminSessionScope(user, excuse.session_id))) {
      sendForbidden(res, {
        error_code: 'SESSION_OUT_OF_SCOPE',
        message: 'Pengajuan izin ini di luar akses Anda.',
      });
      return;
    }

    if (excuse.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        error: 'Pengajuan izin ini sudah diproses dan tidak dapat diubah lagi.',
      });
      return;
    }

    const updatedExcuse = await prisma.$transaction(async (tx) => {
      const updated = await tx.excuseRequest.update({
        where: { id },
        data: {
          status,
          reviewed_by: user_id,
          reviewed_at: new Date(),
        },
      });

      // If approved, update or create attendance record as SICK or EXCUSED
      if (status !== 'APPROVED') return updated;
      const attendanceStatus = excuse.reason === 'SICK' ? 'SICK' : 'EXCUSED';

      const existingAttendance = await tx.attendance.findUnique({
        where: { session_id_user_id: { session_id: excuse.session_id, user_id: excuse.user_id } },
      });

      if (existingAttendance) {
        await tx.attendance.update({
          where: { id: existingAttendance.id },
          data: {
            status: attendanceStatus,
            manual_entry_note: excuse.description,
            manual_entry_by: user_id,
          },
        });
      } else {
        await tx.attendance.create({
          data: {
            session_id: excuse.session_id,
            user_id: excuse.user_id,
            status: attendanceStatus,
            check_in_time: new Date(),
            is_manual_entry: true,
            manual_entry_note: excuse.description,
            manual_entry_by: user_id,
          },
        });
      }
      return updated;
    });

    // Send notification to student
    const sessionDetails = await prisma.session.findUnique({
      where: { id: excuse.session_id },
      select: { title: true },
    });
    await prisma.notification.create({
      data: {
        user_id: excuse.user_id,
        title: `Pengajuan Izin ${status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}`,
        message: `Pengajuan izin Anda untuk sesi "${sessionDetails?.title || 'Tidak diketahui'}" telah ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}.`,
        type: status === 'APPROVED' ? 'SUCCESS' : 'WARNING',
      },
    });

    res.status(200).json({ success: true, data: updatedExcuse });
  } catch (error) {
    console.error('Error reviewing excuse:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
