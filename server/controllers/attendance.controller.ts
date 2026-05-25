import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { sessionCheckInSelect } from '../utils/sessionQuerySelect.js';
import { validateDynamicQrToken } from '../utils/dynamicQr.js';
import { logCheckinStep } from '../utils/checkinLogger.js';
import { triggerSessionCronLazy } from '../jobs/cron.js';
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
        data: { photo_url: photoUrl }
      });
    }
  } catch (error) {
    console.error(`[Background Upload Error] Attendance ID: ${attendanceId}`, error);
  } finally {
    await fsPromises.unlink(filePath).catch(() => {});
  }
};

// Helper for distance calculation (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

export const getChallenge = async (req: Request, res: Response): Promise<void> => {
  try {
    const nonce = crypto.randomBytes(16).toString('hex');
    const expires_at = new Date(Date.now() + 2 * 60000); // 2 minutes expiry

    await prisma.challengeNonce.create({
      data: { nonce, expires_at }
    });

    res.status(200).json({ success: true, data: { nonce } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal membuat security challenge' });
  }
};

export const checkIn = async (req: Request, res: Response): Promise<void> => {
  triggerSessionCronLazy();
  let isUploadingInBackground = false;
  const checkinStart = Date.now();
  try {
    const user_id = (req as any).user.id;
    const { session_id, qr_token, latitude, longitude, accuracy, ip_address, device_fingerprint, nonce, signature } = req.body;

    // --- ANTI-CHEAT LAYER 1: Server-side Accuracy Validation ---
    if (!accuracy) {
      res.status(400).json({ success: false, error: 'Kami tidak dapat mendeteksi tingkat akurasi GPS Anda. Harap aktifkan pengaturan lokasi presisi tinggi pada perangkat Anda dan coba lagi.' });
      return;
    }
    const accuracyValue = parseFloat(accuracy);
    if (accuracyValue > 150) {
      res.status(400).json({ success: false, error: `Sinyal GPS kami kurang kuat saat ini (Akurasi: ${Math.round(accuracyValue)}m). Mari coba berpindah ke tempat yang lebih terbuka lalu segarkan kembali halaman.` });
      return;
    }

    // --- ANTI-CHEAT LAYER 2: Cryptographic Camera Proof ---
    if (!nonce || !signature) {
      res.status(400).json({ success: false, error: 'Security proof (nonce/signature) tidak valid. Harap update aplikasi.' });
      return;
    }

    try {
      const deletedNonce = await prisma.challengeNonce.delete({ where: { nonce } });
      if (deletedNonce.expires_at < new Date()) {
        res.status(400).json({ success: false, error: 'Waktu pengambilan foto Anda telah habis demi keamanan. Mari ambil foto ulang untuk melanjutkan.' });
        return;
      }
    } catch (error: any) {
      if (error?.code === 'P2025') {
        res.status(400).json({ success: false, error: 'Waktu pengambilan foto Anda telah habis demi keamanan. Mari ambil foto ulang untuk melanjutkan.' });
        return;
      }
      throw error;
    }

    const secret = process.env.VITE_APP_SECRET || 'absenyura-secure-2026';
    const payloadToSign = `${nonce}:${latitude}:${longitude}:${secret}`;
    const expectedSignature = crypto.createHash('sha256').update(payloadToSign).digest('hex');

    if (signature !== expectedSignature) {
      res.status(400).json({ success: false, error: 'Data foto atau koordinat lokasi tidak cocok. Silakan segarkan halaman dan ambil foto ulang di lokasi kelas.' });
      return;
    }

    if (!session_id || !latitude || !longitude) {
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
          check_in_lng: { not: null }
        },
        orderBy: { check_in_time: 'desc' }
      }),
      prisma.user.findUnique({
        where: { id: user_id },
        select: { device_fingerprint: true },
      }),
      prisma.attendance.findUnique({
        where: {
          session_id_user_id: { session_id, user_id }
        }
      })
    ]);

    if (!session) {
      res.status(404).json({ success: false, error: 'Sesi absensi tidak ditemukan atau sudah dihapus.' });
      return;
    }

    if (session.status !== 'ACTIVE') {
      res.status(400).json({ success: false, error: `Sesi tidak aktif (Status: ${session.status})` });
      return;
    }

    if (session.class_id || (session.session_classes ?? []).length > 0) {
      const classIds = session.class_id ? [session.class_id] : (session.session_classes ?? []).map((x: any) => x.class_id).filter(Boolean);
      const enrolled = await prisma.classEnrollment.findFirst({
        where: { student_id: user_id, class_id: { in: classIds } },
        select: { id: true },
      });
      if (!enrolled) {
        res.status(403).json({ success: false, error: 'Nama Anda belum terdaftar di kelas ini. Silakan hubungi admin atau dosen pengajar untuk menambahkan Anda.' });
        return;
      }
    }

    const now = new Date();
    // Add 2-minute grace period to prevent strict edge cases
    const openTime = new Date(session.check_in_open_at.getTime() - 2 * 60000);
    const closeTime = new Date(session.check_in_close_at.getTime() + 2 * 60000);

    if (now < openTime) {
      res.status(400).json({ success: false, error: 'Waktu absensi belum dimulai.' });
      return;
    }
    if (now > closeTime) {
      // Differentiate message if the class is still running
      if (now < session.session_end) {
        const timeStr = session.check_in_close_at.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
        res.status(400).json({ success: false, error: `Batas waktu absensi telah ditutup pada pukul ${timeStr} WIB. Hubungi dosen Anda jika Anda mengalami kendala koneksi.` });
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
          res.status(500).json({ success: false, error: 'QR Secret is not configured for this session' });
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

    // Layer 2: Geofencing Validation
    const distance = getDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      session.location.latitude,
      session.location.longitude
    );

    if (distance > session.location.radius) {
      res.status(400).json({
        success: false,
        error: `Posisi Anda terdeteksi di luar jangkauan absensi kelas (sekitar ${Math.round(distance)} meter). Mari mendekat ke area kelas dan coba lagi.`,
      });
      return;
    }

    logCheckinStep('geo_valid', session_id, checkinStart);

    // Layer 3: IP/WiFi Validation (this project stores allowed IPs in wifi_bssid)
    if (session.location.wifi_bssid && session.location.wifi_bssid.trim() !== '') {
      try {
        const allowedIPs: string[] = JSON.parse(session.location.wifi_bssid as string);
        if (Array.isArray(allowedIPs) && allowedIPs.length > 0) {
          if (!ip_address) {
            res.status(400).json({ success: false, error: 'Alamat IP perangkat Anda tidak terdeteksi' });
            return;
          }

          // Function to check if IP is in range (e.g., 192.168.1.1-192.168.1.100)
          const isIpAllowed = allowedIPs.some((allowed) => {
            if (allowed.includes('-')) {
              const [start, end] = allowed.split('-').map(s => s.trim());
              const ipToLong = (ip: string) => {
                return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
              };
              try {
                const userIpLong = ipToLong(ip_address);
                return userIpLong >= ipToLong(start) && userIpLong <= ipToLong(end);
              } catch (e) {
                return false; // ignore invalid formats
              }
            }
            return allowed === ip_address;
          });

          if (!isIpAllowed) {
            // For offline sync, bypass strict IP validation since user might be syncing from home/mobile data
            if (device_fingerprint && device_fingerprint.includes('[OFFLINE_SYNC]')) {
               console.log(`Bypassing IP restriction for offline sync: User ${user_id}`);
            } else {
               res.status(400).json({ success: false, error: 'Koneksi internet Anda berada di luar jaringan kampus. Harap hubungkan perangkat Anda ke Wi-Fi resmi kampus untuk melakukan absensi.' });
               return;
            }
          }
        }
      } catch (e) {
        console.error(`Invalid JSON in wifi_bssid for location ${session.location.id}:`, e);
        // Continue instead of blocking completely if JSON is just invalid, to prevent locking out legitimate users
      }
    }

    // Layer 4: Anti-Spoofing (Teleportation Check)
    if (lastAttendance && lastAttendance.check_in_lat && lastAttendance.check_in_lng) {
      const distanceLastCheckin = getDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        lastAttendance.check_in_lat,
        lastAttendance.check_in_lng
      );
      
      const timeDiffHours = (Date.now() - lastAttendance.check_in_time.getTime()) / (1000 * 60 * 60);
      
      // If time difference is valid and within last 24 hours
      if (timeDiffHours > 0.01 && timeDiffHours < 24) { 
        const speedKmH = (distanceLastCheckin / 1000) / timeDiffHours;
        // Speeds > 250 km/h over short distances in a city context strongly implies GPS spoofing
        if (speedKmH > 250) {
          res.status(400).json({ 
            success: false, 
            error: 'Sistem mendeteksi adanya ketidaksesuaian data GPS. Harap nonaktifkan aplikasi lokasi palsu di perangkat Anda dan coba segarkan halaman.' 
          });
          return;
        }
      }
    }

    const nowTime = new Date();
    const lateThresholdTime = new Date(session.session_start.getTime() + session.late_threshold_minutes * 60000);
    const status = nowTime > lateThresholdTime ? 'LATE' : 'PRESENT';

    // Device Fingerprint Binding Logic
    if (user && !user.device_fingerprint && device_fingerprint && device_fingerprint !== 'unknown-device') {
      // First time check-in: Bind device
      await prisma.user.update({
        where: { id: user_id },
        data: { device_fingerprint }
      });
    } else if (user && user.device_fingerprint) {
      // Compare the base fingerprint (ignoring the [OFFLINE_SYNC] tag)
      const storedDevice = user.device_fingerprint.replace(' [OFFLINE_SYNC]', '');
      const incomingDevice = device_fingerprint ? device_fingerprint.replace(' [OFFLINE_SYNC]', '') : '';

      if (storedDevice !== incomingDevice) {
        res.status(403).json({ success: false, error: 'Sistem mendeteksi perangkat lain terhubung dengan akun Anda. Hubungi tim Admin untuk mengalihkan akun ke perangkat ini.' });
        return;
      }
    }

    // Check if already checked in
    if (existingAttendance) {
      if (existingAttendance.check_out_time) {
         res.status(400).json({ success: false, error: 'Anda sudah menyelesaikan absensi (Check-in & Check-out) pada sesi ini' });
         return;
      }
      
      if (!session.require_checkout) {
         res.status(400).json({ success: false, error: 'Anda sudah melakukan check-in pada sesi ini (Sesi ini tidak mewajibkan check-out)' });
         return;
      }
      
      // Valid Check-out scenario
      const updated = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: { check_out_time: new Date() }
      });
      res.status(200).json({ success: true, data: updated, message: 'Check-out berhasil dicatat!' });
      return;
    }

    const attendance = await prisma.attendance.create({
      data: {
        session_id,
        user_id,
        status,
        check_in_lat: parseFloat(latitude),
        check_in_lng: parseFloat(longitude),
        check_in_accuracy: parseFloat(accuracy),
        check_in_ip: ip_address,
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
      uploadPhotoInBackground(
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
      res.status(400).json({ success: false, error: 'Anda sudah melakukan check-in pada sesi ini' });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Absensi gagal diproses. Coba lagi dalam 1 menit; jika berulang, hubungi admin dengan waktu kejadian.',
    });
  } finally {
    if (req.file && req.file.path && !isUploadingInBackground) {
      fsPromises.unlink(req.file.path).catch(() => {});
    }
  }
};

export const checkOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = (req as any).user.id;
    const { id } = req.params;

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: { session: true },
    });

    if (!attendance || attendance.user_id !== user_id) {
      res.status(404).json({ success: false, error: 'Data absensi tidak ditemukan' });
      return;
    }

    if (attendance.check_out_time) {
      res.status(400).json({ success: false, error: 'Anda sudah melakukan check-out' });
      return;
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: { check_out_time: new Date() },
    });

    res.status(200).json({ success: true, data: updated, message: 'Check-out berhasil' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Absensi gagal diproses. Coba lagi dalam 1 menit; jika berulang, hubungi admin dengan waktu kejadian.',
    });
  }
};
