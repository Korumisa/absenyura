export function getErrorMessage(err: any, fallback: string) {
  const status = err?.response?.status;
  if (status === 401) return 'Sesi login habis atau Anda belum login. Silakan login ulang.';
  if (status === 403) return 'Akses ditolak. Anda tidak punya izin untuk melakukan aksi ini.';
  if (status === 404) return 'Data tidak ditemukan.';
  if (status === 413) return 'File terlalu besar. Maksimal 5MB.';
  if (status === 429) return 'Terlalu banyak permintaan. Coba lagi beberapa menit.';
  if (typeof status === 'number' && status >= 500) return 'Server sedang bermasalah. Coba lagi nanti.';

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
  return fallback;
}
