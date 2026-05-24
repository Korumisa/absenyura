export type CameraDevice = { id: string; label: string };

/** Jeda setelah melepaskan kamera (mis. dari pemindai QR) sebelum membuka lagi */
export const CAMERA_RELEASE_DELAY_MS = 700;

export const pickPreferredCameraId = (
  devices: CameraDevice[],
  opts?: { preferRear?: boolean }
) => {
  if (!devices.length) return null;

  const preferRear = opts?.preferRear !== false;

  const scored = devices.map((d, idx) => {
    const label = (d.label || '').toLowerCase();
    const isBack =
      label.includes('back') ||
      label.includes('rear') ||
      label.includes('environment') ||
      label.includes('belakang');
    const score = preferRear ? (isBack ? 2 : 0) : isBack ? 0 : 2;
    return { id: d.id, idx, score };
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return scored[0]?.id ?? null;
};

export function releaseMediaStream(stream: MediaStream | null | undefined) {
  if (!stream) return;
  stream.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* ignore */
    }
  });
}

/** Lepaskan semua track video yang masih aktif (pemindaian QR sering meninggalkan lock) */
export async function releaseActiveVideoTracks() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    void devices;
  } catch {
    /* ignore */
  }
  document.querySelectorAll('video').forEach((el) => {
    const stream = el.srcObject as MediaStream | null;
    if (stream) {
      releaseMediaStream(stream);
      el.srcObject = null;
    }
  });
}

export function humanizeCameraError(err: unknown): string {
  const e = err as { name?: string; message?: string };
  const name = e?.name ?? '';
  const raw = (e?.message ?? '').toLowerCase();

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, lalu ketuk Buka Kamera lagi.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Tidak ada kamera yang terdeteksi di perangkat ini.';
  }
  if (
    name === 'NotReadableError' ||
    name === 'TrackStartError' ||
    raw.includes('could not start video source') ||
    raw.includes('failed to allocate videosource')
  ) {
    return 'Kamera sedang dipakai aplikasi lain atau baru dipakai pemindai QR. Tunggu sebentar, tutup tab lain yang memakai kamera, lalu ketuk Buka Kamera lagi.';
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'Pengaturan kamera tidak didukung perangkat ini. Coba ganti kamera depan/belakang.';
  }
  if (name === 'AbortError') {
    return 'Akses kamera dibatalkan. Silakan coba lagi.';
  }
  if (e?.message && !raw.includes('notreadable')) {
    return `Kamera tidak dapat dibuka: ${e.message}`;
  }
  return 'Kamera tidak dapat dibuka. Tutup aplikasi lain yang memakai kamera, lalu coba lagi.';
}

export type AcquireCameraOptions = {
  preferRear?: boolean;
  facingMode?: 'user' | 'environment';
  deviceId?: string | null;
};

/** Buka stream kamera dengan fallback dan constraint yang lebih longgar */
export async function acquireCameraStream(opts: AcquireCameraOptions = {}): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Browser tidak mendukung kamera (gunakan HTTPS).');
  }

  const preferRear = opts.preferRear ?? opts.facingMode === 'environment';
  let deviceId = opts.deviceId ?? null;

  if (!deviceId) {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = list
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({ id: d.deviceId, label: d.label || '' }));
      deviceId = pickPreferredCameraId(videoInputs, { preferRear });
    } catch {
      deviceId = null;
    }
  }

  const attempts: MediaStreamConstraints[] = [];

  if (deviceId) {
    attempts.push({ video: { deviceId: { ideal: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } });
  }
  if (opts.facingMode) {
    attempts.push({
      video: { facingMode: { ideal: opts.facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  }
  attempts.push({ video: { facingMode: { ideal: preferRear ? 'environment' : 'user' } } });
  attempts.push({ video: true });

  let lastErr: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('Gagal membuka kamera');
}

export async function waitForCameraRelease(ms = CAMERA_RELEASE_DELAY_MS) {
  await releaseActiveVideoTracks();
  await new Promise((r) => setTimeout(r, ms));
}
