import crypto from 'crypto';
import { Request } from 'express';

export type AttendanceProofAction = 'checkin' | 'checkout';

export const ATTENDANCE_PROOF_VERSION = 'v2';

export function getAttendanceProofSecret(): string | null {
  const secret = process.env.ATTENDANCE_PROOF_SECRET || null;
  return secret && secret.length >= 32 ? secret : null;
}

export function parseFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeProofNumber(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

export function buildAttendanceProofPayload(input: {
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
  expiresAt: Date;
}): string {
  return [
    ATTENDANCE_PROOF_VERSION,
    input.userId,
    input.sessionId,
    input.action,
    input.attendanceId || '-',
    normalizeProofNumber(input.latitude, 6),
    normalizeProofNumber(input.longitude, 6),
    normalizeProofNumber(input.accuracy, 2),
    String(input.photoSize),
    input.photoType,
    input.nonce,
    input.expiresAt.toISOString(),
  ].join(':');
}

export function signAttendanceProof(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function isTimingSafeMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type GpsValidationResult =
  | { ok: true; latitude: number; longitude: number; accuracy: number }
  | { ok: false; status: number; error: string };

export function validateGpsInput(
  latitude: unknown,
  longitude: unknown,
  accuracy: unknown
): GpsValidationResult {
  const latitudeValue = parseFiniteNumber(latitude);
  const longitudeValue = parseFiniteNumber(longitude);
  const accuracyValue = parseFiniteNumber(accuracy);

  if (accuracyValue === null) {
    return {
      ok: false,
      status: 400,
      error:
        'Kami tidak dapat mendeteksi tingkat akurasi GPS Anda. Harap aktifkan pengaturan lokasi presisi tinggi pada perangkat Anda dan coba lagi.',
    };
  }
  if (
    latitudeValue === null ||
    longitudeValue === null ||
    latitudeValue < -90 ||
    latitudeValue > 90 ||
    longitudeValue < -180 ||
    longitudeValue > 180
  ) {
    return { ok: false, status: 400, error: 'Data lokasi tidak valid' };
  }
  if (accuracyValue <= 0 || accuracyValue > 150) {
    return {
      ok: false,
      status: 400,
      error: `Sinyal GPS kami kurang kuat saat ini (Akurasi: ${Math.round(accuracyValue)}m). Mari coba berpindah ke tempat yang lebih terbuka lalu segarkan kembali halaman.`,
    };
  }
  return {
    ok: true,
    latitude: latitudeValue,
    longitude: longitudeValue,
    accuracy: accuracyValue,
  };
}

export function validateGeofence(
  latitude: number,
  longitude: number,
  location: { latitude: number; longitude: number; radius: number }
): { ok: true } | { ok: false; status: number; error: string } {
  const distance = getDistance(latitude, longitude, location.latitude, location.longitude);
  if (distance > location.radius) {
    return {
      ok: false,
      status: 400,
      error: `Posisi Anda terdeteksi di luar jangkauan absensi kelas (sekitar ${Math.round(distance)} meter). Mari mendekat ke area kelas dan coba lagi.`,
    };
  }
  return { ok: true };
}

export function validateIpRestriction(
  req: Request,
  wifiBssid: string | null | undefined
): { ok: true } | { ok: false; status: number; error: string } {
  const raw = typeof wifiBssid === 'string' ? wifiBssid.trim() : '';
  if (!raw) return { ok: true };

  let allowedIPs: string[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return {
        ok: false,
        status: 500,
        error: 'Konfigurasi jaringan kampus tidak valid. Hubungi admin.',
      };
    }
    allowedIPs = parsed.map((x) => String(x));
  } catch {
    return {
      ok: false,
      status: 500,
      error: 'Konfigurasi jaringan kampus tidak valid. Hubungi admin.',
    };
  }

  if (allowedIPs.length === 0) return { ok: true };

  const observedIp = req.ip || req.socket.remoteAddress || '';
  if (!observedIp) {
    return { ok: false, status: 400, error: 'Alamat IP perangkat Anda tidak terdeteksi' };
  }

  const isIpAllowed = allowedIPs.some((allowed) => {
    if (allowed.includes('-')) {
      const [start, end] = allowed.split('-').map((s) => s.trim());
      const ipToLong = (ip: string) =>
        ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
      try {
        const userIpLong = ipToLong(observedIp);
        return userIpLong >= ipToLong(start) && userIpLong <= ipToLong(end);
      } catch {
        return false;
      }
    }
    return allowed === observedIp;
  });

  if (!isIpAllowed) {
    return {
      ok: false,
      status: 400,
      error:
        'Koneksi internet Anda berada di luar jaringan kampus. Harap hubungkan perangkat Anda ke Wi-Fi resmi kampus untuk melakukan absensi.',
    };
  }
  return { ok: true };
}

export function ipRestrictionEnabledFromWifiBssid(wifiBssid: string | null | undefined): boolean {
  const raw = typeof wifiBssid === 'string' ? wifiBssid.trim() : '';
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return true;
  }
}
