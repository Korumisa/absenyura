import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary if ENV vars exist
if (process.env.CLOUDINARY_URL) {
  // It will automatically use the CLOUDINARY_URL
}

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
  try {
    const user_id = (req as any).user.id;
    const { session_id, qr_token, latitude, longitude, accuracy, ip_address, device_fingerprint, nonce, signature } = req.body;

    // --- ANTI-CHEAT LAYER 1: Server-side Accuracy Validation ---
    if (!accuracy) {
      res.status(400).json({ success: false, error: 'Data akurasi GPS tidak ditemukan. Pastikan Anda mengizinkan akses lokasi dengan presisi tinggi.' });
      return;
    }
    const accuracyValue = parseFloat(accuracy);
    if (accuracyValue > 150) {
      res.status(400).json({ success: false, error: `Sinyal GPS terlalu lemah/tidak akurat (Akurasi: ${Math.round(accuracyValue)}m). Coba di ruang terbuka.` });
      return;
    }

    // --- ANTI-CHEAT LAYER 2: Cryptographic Camera Proof ---
    if (!nonce || !signature) {
      res.status(400).json({ success: false, error: 'Security proof (nonce/signature) tidak valid. Harap update aplikasi.' });
      return;
    }

    const validNonce = await prisma.challengeNonce.findUnique({ where: { nonce } });
    if (!validNonce || validNonce.expires_at < new Date()) {
      res.status(400).json({ success: false, error: 'Sesi kamera telah kedaluwarsa. Silakan jepret foto ulang.' });
      return;
    }
    // Delete to prevent replay attacks
    await prisma.challengeNonce.delete({ where: { nonce } });

    const secret = process.env.VITE_APP_SECRET || 'absenyura-secure-2026';
    const payloadToSign = `${nonce}:${latitude}:${longitude}:${secret}`;
    const expectedSignature = crypto.createHash('sha256').update(payloadToSign).digest('hex');

    if (signature !== expectedSignature) {
      res.status(400).json({ success: false, error: 'Terdeteksi manipulasi foto atau lokasi (Signature mismatch).' });
      return;
    }

    let photoUrl = null;
    if (req.file && (req.file as any).buffer) {
      const fileBuffer = (req.file as any).buffer;
      
      // --- ANTI-CHEAT LAYER 3: EXIF / Canvas Blob Analysis ---
      // Canvas .toBlob() in browser produces very clean JFIF with APP0, and generally lacks APP1 Exif.
      // Photos taken from gallery / camera apps usually have "Exif" identifier near the start.
      // We read the first 1024 bytes looking for "Exif".
      const headerString = fileBuffer.subarray(0, Math.min(fileBuffer.length, 1024)).toString('ascii');
      if (headerString.includes('Exif')) {
        res.status(400).json({ success: false, error: 'Terdeteksi foto dari Galeri. Anda wajib mengambil foto langsung menggunakan kamera aplikasi.' });
        return;
      }
      if (process.env.CLOUDINARY_URL) {
        // Upload to Cloudinary using a stream
        const b64 = Buffer.from((req.file as any).buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        try {
          const result = await cloudinary.uploader.upload(dataURI, { folder: 'attendance' });
          photoUrl = result.secure_url;
        } catch (err) {
          console.error('Cloudinary Upload Error:', err);
          res.status(500).json({ success: false, error: 'Gagal mengunggah foto ke cloud' });
          return;
        }
      } else {
        // Save to local disk
        const uploadDir = path.join(process.cwd(), 'uploads', 'attendance');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filename = req.file.fieldname + '-' + uniqueSuffix + '-' + req.file.originalname;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, (req.file as any).buffer);
        photoUrl = `/uploads/attendance/${filename}`;
      }
    }

    if (!session_id || !latitude || !longitude) {
      res.status(400).json({ success: false, error: 'Data lokasi dan sesi tidak lengkap' });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id: session_id },
      include: { location: true },
    });

    if (!session) {
      res.status(404).json({ success: false, error: 'Sesi absensi tidak ditemukan atau sudah dihapus.' });
      return;
    }

    if (session.status !== 'ACTIVE') {
      res.status(400).json({ success: false, error: `Sesi tidak aktif (Status: ${session.status})` });
      return;
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
        res.status(400).json({ success: false, error: `Batas waktu absensi telah habis pada ${timeStr} WIB, meskipun kelas masih berjalan.` });
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
        // dynamic QR format: sessionId:timestamp:signature
        const parts = qr_token.trim().split(':');
        
        // Cek jika user secara tidak sengaja men-scan QR Static di kelas Dinamis
        if (parts.length !== 3) {
          res.status(400).json({ success: false, error: 'Format QR tidak valid. Pastikan Anda men-scan QR Dinamis yang benar.' });
          return;
        }

        const [scannedSessionId, scannedTimestampStr, signature] = parts;
        const payload = `${scannedSessionId}:${scannedTimestampStr}`;

        if (scannedSessionId !== session.id) {
          res.status(400).json({ success: false, error: 'QR bukan untuk sesi ini' });
          return;
        }

        if (!session.qr_secret) {
          res.status(500).json({ success: false, error: 'QR Secret is not configured for this session' });
          return;
        }
        const hmac = crypto.createHmac('sha256', session.qr_secret);
        hmac.update(payload);
        const expectedSignature = hmac.digest('hex');

        if (signature !== expectedSignature) {
          res.status(400).json({ success: false, error: 'QR Code tidak valid / dimanipulasi' });
          return;
        }

        // IMPORTANT: We do not check timestamp expiration strictly if we just scanned it within the grace period.
        // Dynamic QR refreshes every 15s. We allow up to 60s to account for slow internet uploading photos.
        const scannedTimestamp = parseInt(scannedTimestampStr, 10);
        const qrAgeMs = now.getTime() - scannedTimestamp;
        if (qrAgeMs > 60000) {
          res.status(400).json({ success: false, error: 'QR Code sudah kedaluwarsa. Silakan scan ulang' });
          return;
        }
      }
    }

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
        error: `Anda berada di luar area absensi (${Math.round(distance)}m > ${session.location.radius}m)`,
      });
      return;
    }

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
               res.status(400).json({ success: false, error: 'Jaringan IP/WiFi Anda tidak diizinkan untuk absensi ini' });
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
    const lastAttendance = await prisma.attendance.findFirst({
      where: {
        user_id,
        check_in_lat: { not: null },
        check_in_lng: { not: null }
      },
      orderBy: { check_in_time: 'desc' }
    });

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
            error: 'Aktivitas mencurigakan: Perpindahan lokasi terlalu cepat (Terdeteksi Fake GPS)' 
          });
          return;
        }
      }
    }

    const nowTime = new Date();
    const lateThresholdTime = new Date(session.session_start.getTime() + session.late_threshold_minutes * 60000);
    const status = nowTime > lateThresholdTime ? 'LATE' : 'PRESENT';

    // Device Fingerprint Binding Logic
    const user = await prisma.user.findUnique({ where: { id: user_id } });
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
        res.status(403).json({ success: false, error: 'Perangkat tidak dikenali. Akun Anda telah terikat pada perangkat lain. Silakan hubungi Admin.' });
        return;
      }
    }

    // Check if already checked in
    const existingAttendance = await prisma.attendance.findFirst({
      where: { session_id, user_id }
    });

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
        photo_url: photoUrl,
      },
      include: {
        user: { select: { name: true, nim_nip: true } },
      },
    });

    res.status(201).json({ success: true, data: attendance, message: 'Check-in berhasil' });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(400).json({ success: false, error: 'Anda sudah melakukan check-in pada sesi ini' });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
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
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};