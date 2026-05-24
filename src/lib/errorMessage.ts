export function getChunkLoadUserMessage(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('dynamically imported module')
  ) {
    return 'Versi aplikasi di perangkat Anda sudah usang (biasanya setelah pembaruan situs). Muat ulang halaman untuk memuat file terbaru.';
  }
  return null;
}

export function getErrorMessage(err: any, fallback: string) {
  const chunkMsg = getChunkLoadUserMessage(err);
  if (chunkMsg) return chunkMsg;

  const status = err?.response?.status;
  const url = String(err?.response?.config?.url || '');
  const method = String(err?.response?.config?.method || '').toUpperCase();

  const errorCode = err?.response?.data?.error_code;
  if (typeof errorCode === 'string') {
    if (errorCode === 'MISSING_CREDENTIALS') return 'Sistem membutuhkan email/NIM dan kata sandi Anda untuk masuk. Mari lengkapi kolom yang kosong.';
    if (errorCode === 'INVALID_CREDENTIALS') return 'Data login tidak cocok dengan catatan kami. Silakan periksa kembali email/NIM dan kata sandi Anda.';
    if (errorCode === 'ACCOUNT_INACTIVE') return 'Akun Anda sedang dinonaktifkan demi keamanan. Silakan hubungi tim Admin untuk mengaktifkannya kembali.';
    if (errorCode === 'DEVICE_BOUND') return 'Sistem mendeteksi perangkat lain terhubung dengan akun Anda. Hubungi tim Admin untuk mengalihkan akun ke perangkat ini.';
    if (errorCode === 'BOLA_UNAUTHORIZED_CLASS') return 'Kode QR ini bukan untuk kelas Anda. Pastikan Anda memindai kode yang benar.';
    if (errorCode === 'NO_REFRESH_TOKEN' || errorCode === 'INVALID_REFRESH_TOKEN' || errorCode === 'INVALID_USER') {
      return 'Sesi masuk Anda telah berakhir demi kenyamanan dan keamanan. Mari masuk kembali ke akun Anda.';
    }
  }

  const code = err?.code;
  if (!err?.response && (code === 'ERR_NETWORK' || String(err?.message || '').toLowerCase().includes('network'))) {
    return 'Sistem kami sedang mengalami gangguan koneksi. Tenang, kami sedang memperbaikinya. Silakan segarkan halaman dalam beberapa saat.';
  }

  const value =
    err?.response?.data?.error ??
    err?.response?.data?.message ??
    err?.message ??
    err;

  if (typeof value === 'string') {
    const raw = value.trim();
    const lowered = raw.toLowerCase();
    
    // Login 401 fallback
    if (status === 401 && method === 'POST' && url.includes('/auth/login')) {
      return 'Data login tidak cocok dengan catatan kami. Silakan periksa kembali email/NIM dan kata sandi Anda.';
    }
    if (lowered.includes('no token provided') || lowered.includes('invalid or expired token') || lowered.includes('invalid or expired refresh token')) {
      return 'Sesi masuk Anda telah berakhir demi kenyamanan dan keamanan. Mari masuk kembali ke akun Anda.';
    }
    if (lowered.includes('too many requests') || lowered.includes('rate limit')) {
      return 'Permintaan dari perangkat Anda terlalu padat saat ini. Silakan tunggu sekitar 15 menit sebelum mencoba kembali.';
    }
    if (raw === 'Internal server error' || lowered.includes('db_unavailable') || lowered.includes('database') || lowered.includes('prisma')) {
      return 'Sistem kami sedang mengalami gangguan koneksi. Tenang, kami sedang memperbaikinya. Silakan segarkan halaman dalam beberapa saat.';
    }
    return raw;
  }
  if (value && typeof value === 'object') {
    const msg = (value as any).message;
    if (typeof msg === 'string' && msg.trim()) {
      const msgLower = msg.toLowerCase();
      if (msgLower.includes('too many requests') || msgLower.includes('rate limit')) {
        return 'Permintaan dari perangkat Anda terlalu padat saat ini. Silakan tunggu sekitar 15 menit sebelum mencoba kembali.';
      }
      if (msg === 'Internal server error' || msgLower.includes('db_unavailable') || msgLower.includes('database') || msgLower.includes('prisma')) {
        return 'Sistem kami sedang mengalami gangguan koneksi. Tenang, kami sedang memperbaikinya. Silakan segarkan halaman dalam beberapa saat.';
      }
      return msg;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  if (status === 401) return 'Sesi masuk Anda telah berakhir demi kenyamanan dan keamanan. Mari masuk kembali ke akun Anda.';
  if (status === 403) return 'Kode QR ini bukan untuk kelas Anda. Pastikan Anda memindai kode yang benar.';
  if (status === 404) return 'Data tidak ditemukan.';
  if (status === 413) return 'File terlalu besar. Maksimal 5MB.';
  if (status === 429) return 'Terlalu banyak percobaan dalam waktu singkat. Tunggu 1–2 menit lalu coba lagi.';
  if (typeof status === 'number' && status >= 500) return 'Sistem kami sedang mengalami gangguan koneksi. Tenang, kami sedang memperbaikinya. Silakan segarkan halaman dalam beberapa saat.';
  return fallback;
}
