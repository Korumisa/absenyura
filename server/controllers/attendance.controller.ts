import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { sessionCheckInSelect } from '../utils/sessionQuerySelect.js';
import { validateDynamicQrToken } from '../utils/dynamicQr.js';
import { logCheckinStep } from '../utils/checkinLogger.js';
import { triggerSessionCronLazy } from '../jobs/cron.js';
import {
  AttendanceProofAction,
  buildAttendanceProofPayload,
  getAttendanceProofSecret,
  getDistance,
  isTimingSafeMatch,
  parseFiniteNumber,
  signAttendanceProof,
  validateGeofence,
  validateGpsInput,
  validateIpRestriction,
} from '../utils/attendanceValidation.js';
import crypto from 'crypto';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary if ENV vars exist
if (process.env.CLOUDINARY_URL) {
  // It will automatically use the CLOUDINARY_URL
}

// Background photo upload helper
const uploadPhotoInBackground = async (
  attendanceId: string,
  filePath: string,
  originalname: string,
  fieldname: string
): Promise<void> => {
  try {
    let photoUrl: string | null = null;
    if (process.env.CLOUDINARY_URL) {
      const result = await cloudinary.uploader.upload(filePath, { folder: 'attendance' });
      photoUrl = result.secure_url;
    } else {
      const extFromMime: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
      };
      const rawExt = path.extname(path.basename(String(originalname || ''))).toLowerCase();
      const ext = (rawExt && rawExt.length <= 10 ? rawExt : '') || '.jpg';

      const uploadDir = path.join(process.cwd(), 'uploads', 'attendance');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filename = `${fieldname}-${crypto.randomBytes(16).toString('hex')}${ext}`;
      const newFilePath = path.join(uploadDir, filename);
      await fsPromises.rename(filePath, newFilePath);
      photoUrl = `/uploads/attendance/${filename}`;
    }

    if (photoUrl) {
      await prisma.attendance.update({
        where: { id: attendanceId },
        data: { photo_url: photoUrl },
      });
    }
  } catch (error) {
    console.error(`[Background Upload Error] Attendance ID: ${attendanceId}`, error);
  } finally {
    await fsPromises.unlink(filePath).catch(() => {});
  }
};

export const getChallenge = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = (req as any).user?.id;
    const sessionId = String(req.query.session_id || '').trim();
    const action: AttendanceProofAction =
      String(req.query.action || 'checkin').toLowerCase() === 'checkout' ? 'checkout' : 'checkin';
    const attendanceId = String(req.query.attendance_id || '').trim();
    const gps = validateGpsInput(req.query.latitude, req.query.longitude, req.query.accuracy);
    const photoSize = parseFiniteNumber(req.query.photo_size);
    const photoType = String(req.query.photo_type || '')
      .trim()
      .toLowerCase();
    const secret = getAttendanceProofSecret();

    if (!secret) {
      res.status(500).json({ success: false, error: 'Konfigurasi security proof belum lengkap' });
      return;
    }
    if (!user_id || !sessionId || !gps.ok || photoSize === null || photoSize <= 0 || !photoType) {
      res.status(400).json({ success: false, error: 'Data security challenge tidak lengkap' });
      return;
    }
    if (action === 'checkout') {
      if (!attendanceId) {
        res.status(400).json({ success: false, error: 'ID absensi wajib untuk check-out' });
        return;
      }
      const attendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        select: { user_id: true, session_id: true, check_out_time: true },
      });
      if (!attendance || attendance.user_id !== user_id || attendance.session_id !== sessionId) {
        res.status(404).json({ success: false, error: 'Data absensi tidak ditemukan' });
        return;
      }
      if (attendance.check_out_time) {
        res.status(400).json({ success: false, error: 'Anda sudah melakukan check-out' });
        return;
      }
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const expires_at = new Date(Date.now() + 2 * 60000);

    await prisma.challengeNonce.create({
      data: { nonce, expires_at },
    });

    const payload = buildAttendanceProofPayload({
      userId: user_id,
      sessionId,
      action,
      attendanceId: action === 'checkout' ? attendanceId : '-',
      latitude: gps.latitude,
      longitude: gps.longitude,
      accuracy: gps.accuracy,
      photoSize,
      photoType,
      nonce,
      expiresAt: expires_at,
    });
    const signature = signAttendanceProof(payload, secret);

    res.status(200).json({ success: true, data: { nonce, signature, expires_at } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal membuat security challenge' });
  }
};

async function verifyAttendanceProof(input: {
  userId: string;
  sessionId: string;
  action: AttendanceProofAction;
  attendanceId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  photoSize: number;
  photoType: string;
  nonce: string;
  signature: string;
}): Promise<{ ok: true; expiresAt: Date } | { ok: false; status: number; error: string }> {
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

  const secret = getAttendanceProofSecret();
  if (!secret) {
    return { ok: false, status: 500, error: 'Konfigurasi security proof belum lengkap' };
  }

  const payloadToSign = buildAttendanceProofPayload({
    userId: input.userId,
    sessionId: input.sessionId,
    action: input.action,
    attendanceId: input.action === 'checkout' ? input.attendanceId : '-',
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy,
    photoSize: input.photoSize,
    photoType: input.photoType,
    nonce: input.nonce,
    expiresAt: nonceExpiresAt,
  });
  const expectedSignature = signAttendanceProof(payloadToSign, secret);
  if (!isTimingSafeMatch(String(input.signature), expectedSignature)) {
    return {
      ok: false,
      status: 400,
      error:
        'Data foto atau koordinat lokasi tidak cocok. Silakan segarkan halaman dan ambil foto ulang di lokasi kelas.',
    };
  }
  return { ok: true, expiresAt: nonceExpiresAt };
}

export const checkIn = async (req: Request, res: Response): Promise<void> => {
  triggerSessionCronLazy();
  let isUploadingInBackground = false;
  const checkinStart = Date.now();
  try {
    const user_id = (req as any).user.id;
    const {
      session_id,
      qr_token,
      latitude,
      longitude,
      accuracy,
      ip_address,
      device_fingerprint,
      nonce,
      signature,
      photo_size,
      photo_type,
    } = req.body;
    const gps = validateGpsInput(latitude, longitude, accuracy);
    const photoSizeValue = parseFiniteNumber(photo_size);
    const normalizedPhotoType = String(photo_type || '')
      .trim()
      .toLowerCase();

    if (!gps.ok) {
      res.status(gps.status).json({ success: false, error: gps.error });
      return;
    }
    const latitudeValue = gps.latitude;
    const longitudeValue = gps.longitude;
    const accuracyValue = gps.accuracy;
    if (
      !req.file ||
      !req.file.path ||
      photoSizeValue === null ||
      photoSizeValue <= 0 ||
      !normalizedPhotoType
    ) {
      res.status(400).json({
        success: false,
        error: 'Foto bukti dan metadata foto wajib dikirim untuk absensi.',
      });
      return;
    }
    if (
      req.file.size !== photoSizeValue ||
      req.file.mimetype.toLowerCase() !== normalizedPhotoType
    ) {
      res.status(400).json({
        success: false,
        error: 'Metadata foto tidak sesuai dengan file yang dikirim. Silakan ambil foto ulang.',
      });
      return;
    }

    const proof = await verifyAttendanceProof({
      userId: user_id,
      sessionId: String(session_id || '').trim(),
      action: 'checkin',
      attendanceId: '-',
      latitude: latitudeValue,
      longitude: longitudeValue,
      accuracy: accuracyValue,
      photoSize: photoSizeValue,
      photoType: normalizedPhotoType,
      nonce: String(nonce || ''),
      signature: String(signature || ''),
    });
    if (!proof.ok) {
      res.status(proof.status).json({ success: false, error: proof.error });
      return;
    }

    if (!session_id) {
      res.status(400).json({ success: false, error: 'Data lokasi dan sesi tidak lengkap' });
      return;
    }

    const [session, lastAttendance, user, existingAttendance] = await Promise.all([
      prisma.session.findUnique({
        where: { id: session_id },
        select: sessionCheckInSelect,
      }),
      prisma.attendance.findFirst({
        where: {
          user_id,
          check_in_lat: { not: null },
          check_in_lng: { not: null },
        },
        orderBy: { check_in_time: 'desc' },
      }),
      prisma.user.findUnique({
        where: { id: user_id },
        select: { device_fingerprint: true },
      }),
      prisma.attendance.findUnique({
        where: {
          session_id_user_id: { session_id, user_id },
        },
      }),
    ]);

    if (!session) {
      res
        .status(404)
        .json({ success: false, error: 'Sesi absensi tidak ditemukan atau sudah dihapus.' });
      return;
    }

    if (session.status !== 'ACTIVE') {
      res
        .status(400)
        .json({ success: false, error: `Sesi tidak aktif (Status: ${session.status})` });
      return;
    }

    if (session.class_id || (session.session_classes ?? []).length > 0) {
      const classIds = session.class_id
        ? [session.class_id]
        : (session.session_classes ?? []).flatMap((x: any) => {
            const result = x.class_id;
            return result ? [result] : [];
          });
      const enrolled = await prisma.classEnrollment.findFirst({
        where: { student_id: user_id, class_id: { in: classIds } },
        select: { id: true },
      });
      if (!enrolled) {
        res.status(403).json({
          success: false,
          error:
            'Nama Anda belum terdaftar di kelas ini. Silakan hubungi admin atau dosen pengajar untuk menambahkan Anda.',
        });
        return;
      }
    }

    const now = new Date();
    const openTime = session.check_in_open_at;
    const closeTime = session.check_in_close_at;

    if (now < openTime) {
      res.status(400).json({ success: false, error: 'Waktu absensi belum dimulai.' });
      return;
    }
    if (now > closeTime) {
      // Differentiate message if the class is still running
      if (now < session.session_end) {
        const timeStr = session.check_in_close_at.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta',
        });
        res.status(400).json({
          success: false,
          error: `Batas waktu absensi telah ditutup pada pukul ${timeStr} WIB. Hubungi dosen Anda jika Anda mengalami kendala koneksi.`,
        });
      } else {
        res.status(400).json({ success: false, error: 'Waktu absensi sudah ditutup.' });
      }
      return;
    }

    // Layer 1: QR Validation (if not NONE)
    if (session.qr_mode !== 'NONE') {
      if (!qr_token || qr_token === 'NO_QR_REQUIRED') {
        res.status(400).json({ success: false, error: 'Token QR Code diperlukan untuk sesi ini' });
        return;
      }

      if (session.qr_mode === 'STATIC') {
        if (qr_token.trim() !== session.qr_token) {
          res.status(400).json({ success: false, error: 'Token QR statis tidak valid' });
          return;
        }
      } else if (session.qr_mode === 'DYNAMIC') {
        if (!session.qr_secret) {
          res
            .status(500)
            .json({ success: false, error: 'QR Secret is not configured for this session' });
          return;
        }

        const qrCheck = validateDynamicQrToken(session.id, session.qr_secret, qr_token, now);
        if (qrCheck.ok === false) {
          if (qrCheck.error.includes('kedaluwarsa')) {
            logCheckinStep('qr_expired', session_id, checkinStart, { statusCode: qrCheck.status });
          }
          res.status(qrCheck.status).json({ success: false, error: qrCheck.error });
          return;
        }
      }
    }

    logCheckinStep('qr_valid', session_id, checkinStart);

    const geo = validateGeofence(latitudeValue, longitudeValue, session.location);
    if (!geo.ok) {
      res.status(geo.status).json({ success: false, error: geo.error });
      return;
    }

    logCheckinStep('geo_valid', session_id, checkinStart);

    const ipCheck = validateIpRestriction(req, session.location.wifi_bssid);
    if (!ipCheck.ok) {
      res.status(ipCheck.status).json({ success: false, error: ipCheck.error });
      return;
    }

    // Layer 4: Anti-Spoofing (Teleportation Check)
    if (lastAttendance && lastAttendance.check_in_lat && lastAttendance.check_in_lng) {
      const distanceLastCheckin = getDistance(
        latitudeValue,
        longitudeValue,
        lastAttendance.check_in_lat,
        lastAttendance.check_in_lng
      );

      const timeDiffHours =
        (Date.now() - lastAttendance.check_in_time.getTime()) / (1000 * 60 * 60);

      // If time difference is valid and within last 24 hours
      if (timeDiffHours > 0.01 && timeDiffHours < 24) {
        const speedKmH = distanceLastCheckin / 1000 / timeDiffHours;
        // Speeds > 250 km/h over short distances in a city context strongly implies GPS spoofing
        if (speedKmH > 250) {
          res.status(400).json({
            success: false,
            error:
              'Sistem mendeteksi adanya ketidaksesuaian data GPS. Harap nonaktifkan aplikasi lokasi palsu di perangkat Anda dan coba segarkan halaman.',
          });
          return;
        }
      }
    }

    const lateThresholdTime = new Date(
      session.check_in_open_at.getTime() + session.late_threshold_minutes * 60000
    );
    const status = now > lateThresholdTime ? 'LATE' : 'PRESENT';

    // Device Fingerprint Binding Logic
    if (
      user &&
      !user.device_fingerprint &&
      device_fingerprint &&
      device_fingerprint !== 'unknown-device'
    ) {
      // First time check-in: Bind device
      await prisma.user.update({
        where: { id: user_id },
        data: { device_fingerprint },
      });
    } else if (user && user.device_fingerprint) {
      // Compare the base fingerprint (ignoring the [OFFLINE_SYNC] tag)
      const storedDevice = user.device_fingerprint.replace(' [OFFLINE_SYNC]', '');
      const incomingDevice = device_fingerprint
        ? device_fingerprint.replace(' [OFFLINE_SYNC]', '')
        : '';

      if (storedDevice !== incomingDevice) {
        res.status(403).json({
          success: false,
          error:
            'Sistem mendeteksi perangkat lain terhubung dengan akun Anda. Hubungi tim Admin untuk mengalihkan akun ke perangkat ini.',
        });
        return;
      }
    }

    // Check if already checked in
    if (existingAttendance) {
      if (existingAttendance.check_out_time) {
        res.status(400).json({
          success: false,
          error: 'Anda sudah menyelesaikan absensi (Check-in & Check-out) pada sesi ini',
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: session.require_checkout
          ? 'Anda sudah check-in. Gunakan halaman check-out untuk menyelesaikan absensi.'
          : 'Anda sudah melakukan check-in pada sesi ini',
      });
      return;
    }

    const attendance = await prisma.attendance.create({
      data: {
        session_id,
        user_id,
        status,
        check_in_lat: latitudeValue,
        check_in_lng: longitudeValue,
        check_in_accuracy: accuracyValue,
        check_in_ip: req.ip || req.socket.remoteAddress || null,
        check_in_device: device_fingerprint,
        photo_url: null,
      },
      include: {
        user: { select: { name: true, nim_nip: true } },
      },
    });

    logCheckinStep('db_insert', session_id, checkinStart, { attendanceId: attendance.id });

    // TODO: ganti dengan Supabase Realtime jika butuh push live feed ke dosen di masa depan.
    // QRDisplay memakai polling GET /sessions/:id/attendances setiap 5 detik.

    if (req.file && req.file.path) {
      isUploadingInBackground = true;
      await uploadPhotoInBackground(
        attendance.id,
        req.file.path,
        req.file.originalname,
        req.file.fieldname
      );
    }

    logCheckinStep('complete', session_id, checkinStart, { status: attendance.status });
    res.status(201).json({ success: true, data: attendance, message: 'Check-in berhasil' });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res
        .status(400)
        .json({ success: false, error: 'Anda sudah melakukan check-in pada sesi ini' });
      return;
    }
    res.status(500).json({
      success: false,
      error:
        'Absensi gagal diproses. Coba lagi dalam 1 menit; jika berulang, hubungi admin dengan waktu kejadian.',
    });
  } finally {
    if (req.file && req.file.path && !isUploadingInBackground) {
      fsPromises.unlink(req.file.path).catch(() => {});
    }
  }
};

export const checkOut = async (req: Request, res: Response): Promise<void> => {
  let isUploadingInBackground = false;
  try {
    const user_id = (req as any).user.id;
    const { id } = req.params;
    const {
      qr_token,
      latitude,
      longitude,
      accuracy,
      device_fingerprint,
      nonce,
      signature,
      photo_size,
      photo_type,
    } = req.body;

    const gps = validateGpsInput(latitude, longitude, accuracy);
    const photoSizeValue = parseFiniteNumber(photo_size);
    const normalizedPhotoType = String(photo_type || '')
      .trim()
      .toLowerCase();

    if (!gps.ok) {
      res.status(gps.status).json({ success: false, error: gps.error });
      return;
    }
    if (!req.file?.path || photoSizeValue === null || photoSizeValue <= 0 || !normalizedPhotoType) {
      res.status(400).json({
        success: false,
        error: 'Foto bukti dan metadata foto wajib dikirim untuk check-out.',
      });
      return;
    }
    if (
      req.file.size !== photoSizeValue ||
      req.file.mimetype.toLowerCase() !== normalizedPhotoType
    ) {
      res.status(400).json({
        success: false,
        error: 'Metadata foto tidak sesuai dengan file yang dikirim. Silakan ambil foto ulang.',
      });
      return;
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        session: { select: sessionCheckInSelect },
      },
    });

    if (!attendance || attendance.user_id !== user_id) {
      res.status(404).json({ success: false, error: 'Data absensi tidak ditemukan' });
      return;
    }

    if (attendance.check_out_time) {
      res.status(400).json({ success: false, error: 'Anda sudah melakukan check-out' });
      return;
    }

    const session = attendance.session;
    const proof = await verifyAttendanceProof({
      userId: user_id,
      sessionId: session.id,
      action: 'checkout',
      attendanceId: id,
      latitude: gps.latitude,
      longitude: gps.longitude,
      accuracy: gps.accuracy,
      photoSize: photoSizeValue,
      photoType: normalizedPhotoType,
      nonce: String(nonce || ''),
      signature: String(signature || ''),
    });
    if (!proof.ok) {
      res.status(proof.status).json({ success: false, error: proof.error });
      return;
    }

    if (session.status !== 'ACTIVE') {
      res
        .status(400)
        .json({ success: false, error: `Sesi tidak aktif (Status: ${session.status})` });
      return;
    }

    const now = new Date();
    if (now > session.session_end) {
      res.status(400).json({ success: false, error: 'Sesi sudah berakhir.' });
      return;
    }

    if (session.qr_mode !== 'NONE') {
      if (!qr_token || qr_token === 'NO_QR_REQUIRED') {
        res.status(400).json({ success: false, error: 'Token QR Code diperlukan untuk sesi ini' });
        return;
      }
      if (session.qr_mode === 'STATIC') {
        if (qr_token.trim() !== session.qr_token) {
          res.status(400).json({ success: false, error: 'Token QR statis tidak valid' });
          return;
        }
      } else if (session.qr_mode === 'DYNAMIC') {
        if (!session.qr_secret) {
          res
            .status(500)
            .json({ success: false, error: 'QR Secret is not configured for this session' });
          return;
        }
        const qrCheck = validateDynamicQrToken(session.id, session.qr_secret, qr_token, now);
        if (qrCheck.ok === false) {
          res.status(qrCheck.status).json({ success: false, error: qrCheck.error });
          return;
        }
      }
    }

    const geo = validateGeofence(gps.latitude, gps.longitude, session.location);
    if (!geo.ok) {
      res.status(geo.status).json({ success: false, error: geo.error });
      return;
    }

    const ipCheck = validateIpRestriction(req, session.location.wifi_bssid);
    if (!ipCheck.ok) {
      res.status(ipCheck.status).json({ success: false, error: ipCheck.error });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: user_id },
      select: { device_fingerprint: true },
    });
    if (user?.device_fingerprint && device_fingerprint) {
      const storedDevice = user.device_fingerprint.replace(' [OFFLINE_SYNC]', '');
      const incomingDevice = String(device_fingerprint).replace(' [OFFLINE_SYNC]', '');
      if (storedDevice !== incomingDevice) {
        res.status(403).json({
          success: false,
          error:
            'Sistem mendeteksi perangkat lain terhubung dengan akun Anda. Hubungi tim Admin untuk mengalihkan akun ke perangkat ini.',
        });
        return;
      }
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: { check_out_time: now },
    });

    if (req.file?.path) {
      isUploadingInBackground = true;
      await uploadPhotoInBackground(id, req.file.path, req.file.originalname, req.file.fieldname);
    }

    res.status(200).json({ success: true, data: updated, message: 'Check-out berhasil' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        'Absensi gagal diproses. Coba lagi dalam 1 menit; jika berulang, hubungi admin dengan waktu kejadian.',
    });
  } finally {
    if (req.file?.path && !isUploadingInBackground) {
      fsPromises.unlink(req.file.path).catch(() => {});
    }
  }
};
