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

export const checkIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = (req as any).user.id;
    const { session_id, qr_token, latitude, longitude, ip_address, device_fingerprint } = req.body;

    let photoUrl = null;
    if (req.file && (req.file as any).buffer) {
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
      if (!qr_token) {
        res.status(400).json({ success: false, error: 'Token QR Code diperlukan untuk sesi ini' });
        return;
      }

      if (session.qr_mode === 'STATIC') {
        if (qr_token !== session.qr_token) {
          res.status(400).json({ success: false, error: 'Token QR statis tidak valid' });
          return;
        }
      } else if (session.qr_mode === 'DYNAMIC') {
        const parts = qr_token.split(':');
        if (parts.length !== 3) {
          res.status(400).json({ success: false, error: 'Token QR dinamis tidak valid' });
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

        const scannedTimestamp = parseInt(scannedTimestampStr, 10);
        const now = Date.now();
        if (now - scannedTimestamp > 20000) {
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
            res.status(400).json({ success: false, error: 'Jaringan IP/WiFi Anda tidak diizinkan untuk absensi ini' });
            return;
          }
        }
      } catch (e) {
        console.error(`Invalid JSON in wifi_bssid for location ${session.location.id}:`, e);
        // Fail securely - if admins set a rule but format it wrong, block access rather than bypassing security
        res.status(500).json({ success: false, error: 'Kesalahan konfigurasi jaringan pada kelas ini. Hubungi Admin.' });
        return;
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

    const attendance = await prisma.attendance.create({
      data: {
        session_id,
        user_id,
        status,
        check_in_lat: parseFloat(latitude),
        check_in_lng: parseFloat(longitude),
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