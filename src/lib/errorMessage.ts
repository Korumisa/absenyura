export function getErrorMessage(err: any, fallback: string) {
  const status = err?.response?.status;
  const url = String(err?.response?.config?.url || '');
  const method = String(err?.response?.config?.method || '').toUpperCase();

  const errorCode = err?.response?.data?.error_code;
  if (typeof errorCode === 'string') {
    if (errorCode === 'MISSING_CREDENTIALS') return 'Email/NIM dan kata sandi wajib diisi.';
    if (errorCode === 'INVALID_CREDENTIALS') return 'Email/NIM atau kata sandi salah.';
    if (errorCode === 'ACCOUNT_INACTIVE') return 'Akun Anda nonaktif. Hubungi admin.';
    if (errorCode === 'DEVICE_BOUND') return 'Login ditolak: akun ini sudah terikat dengan perangkat lain. Hubungi admin untuk reset perangkat.';
    if (errorCode === 'NO_REFRESH_TOKEN' || errorCode === 'INVALID_REFRESH_TOKEN' || errorCode === 'INVALID_USER') {
      return 'Sesi login habis. Silakan login ulang.';
    }
  }

  const code = err?.code;
  if (!err?.response && (code === 'ERR_NETWORK' || String(err?.message || '').toLowerCase().includes('network'))) {
    return 'Tidak bisa terhubung ke server. Periksa koneksi internet lalu coba lagi.';
  }

  const value =
    err?.response?.data?.error ??
    err?.response?.data?.message ??
    err?.message ??
    err;

  if (typeof value === 'string') {
    const raw = value.trim();
    const lowered = raw.toLowerCase();
    if (status === 401 && method === 'POST' && url.includes('/auth/login')) {
      return raw || 'Email/NIM atau kata sandi salah.';
    }
    if (lowered.includes('no token provided') || lowered.includes('invalid or expired token') || lowered.includes('invalid or expired refresh token')) {
      return 'Sesi login habis atau Anda belum login. Silakan login ulang.';
    }
    if (lowered.includes('too many requests')) return 'Terlalu banyak permintaan. Coba lagi beberapa menit.';
    if (raw === 'Internal server error') return 'Server sedang bermasalah. Coba lagi nanti.';
    return raw;
  }
  if (value && typeof value === 'object') {
    const msg = (value as any).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  if (status === 401) return 'Sesi login habis atau Anda belum login. Silakan login ulang.';
  if (status === 403) return 'Akses ditolak. Anda tidak punya izin untuk melakukan aksi ini.';
  if (status === 404) return 'Data tidak ditemukan.';
  if (status === 413) return 'File terlalu besar. Maksimal 5MB.';
  if (status === 429) return 'Terlalu banyak permintaan. Coba lagi beberapa menit.';
  if (typeof status === 'number' && status >= 500) return 'Server sedang bermasalah. Coba lagi nanti.';
  return fallback;
}
