import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import crypto from 'crypto';

// Helper for distance calculation (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

export const checkIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = (req as any).user.id;
    const { session_id, qr_token, latitude, longitude, ip_address, device_fingerprint, wifi_bssid } = req.body;
    
    let photoUrl = null;
    if (req.file) {
      if (process.env.VERCEL && req.file.buffer) {
        photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      } else {
        photoUrl = `/uploads/attendance/${req.file.filename}`;
      }
    }

    if (!session_id || !latitude || !longitude) {
      res.status(400).json({ success: false, error: 'Data lokasi dan sesi tidak lengkap' });
      return;
    }

    // 1. Check Session & Validation
    const session = await prisma.session.findUnique({
      where: { id: session_id },
      include: { location: true },
    });

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    if (session.status !== 'ACTIVE') {
      res.status(400).json({ success: false, error: `Sesi tidak aktif (Status: ${session.status})` });
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

        const hmac = crypto.createHmac('sha256', session.qr_secret || 'defaultsecret');
        hmac.update(payload);
        const expectedSignature = hmac.digest('hex');

        if (signature !== expectedSignature) {
          res.status(400).json({ success: false, error: 'QR Code tidak valid / dimanipulasi' });
          return;
        }

        const scannedTimestamp = parseInt(scannedTimestampStr, 10);
        const now = Date.now();
        // Misal toleransi interval = 15 detik + 5 detik margin delay jaringan = 20000ms
        if (now - scannedTimestamp > 20000) {
          res.status(400).json({ success: false, error: 'QR Code sudah kedaluwarsa. Silakan scan ulang' });
          return;
        }
      }
    }

    // Layer 2: Geofencing Validation
    if (latitude && longitude) {
      const distance = getDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        session.location.latitude,
        session.location.longitude
      );

      if (distance > session.location.radius) {
        res.status(400).json({ success: false, error: `Anda berada di luar area absensi (${Math.round(distance)}m > ${session.location.radius}m)` });
        return;
      }
    } else {
      res.status(400).json({ success: false, error: 'Lokasi GPS tidak ditemukan' });
      return;
    }

    // Layer 3: IP/WiFi Validation
    if (session.location.wifi_bssid) {
      const allowedIPs: string[] = JSON.parse(session.location.wifi_bssid as string);
      if (allowedIPs.length > 0 && ip_address) {
        if (!allowedIPs.includes(ip_address)) {
          res.status(400).json({ success: false, error: 'Jaringan IP/WiFi Anda tidak diizinkan untuk absensi ini' });
          return;
        }
      }
    }

    // 2. Insert into Database
    // Check late threshold
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
        user: { select: { name: true, nim_nip: true } }
      }
    });

    res.status(201).json({ success: true, data: attendance, message: 'Check-in berhasil' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ success: false, error: 'Anda sudah melakukan check-in pada sesi ini' });
      return;
    }
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const checkOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = (req as any).user.id;
    const { id } = req.params; // attendance id

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: { session: true }
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
      data: { check_out_time: new Date() }
    });

    res.status(200).json({ success: true, data: updated, message: 'Check-out berhasil' });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};