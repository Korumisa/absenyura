const messages = {
  QR_EXPIRED: 'QR sudah kedaluwarsa. Pindai ulang QR terbaru dari dosen.',
  QR_INVALID: 'QR tidak sesuai. Pindai QR sesi yang benar dari dosen.',
  QR_UNAVAILABLE: 'QR sesi belum tersedia. Hubungi dosen untuk menyiapkannya.',
  PHOTO_INVALID: 'Foto belum dapat digunakan. Ambil ulang foto melalui kamera aplikasi.',
  LOCATION_INVALID:
    'Lokasi belum sesuai. Aktifkan GPS presisi tinggi dan pastikan Anda berada di lokasi sesi.',
  SESSION_CLOSED:
    'Waktu absensi belum dibuka atau sudah berakhir. Periksa jadwal sesi atau hubungi dosen.',
  ALREADY_RECORDED: 'Absensi Anda sudah tercatat. Periksa dashboard untuk langkah berikutnya.',
  REQUEST_IN_PROGRESS:
    'Permintaan sebelumnya masih diproses atau belum terkonfirmasi. Periksa riwayat sebelum mengirim ulang.',
  NOT_ENROLLED: 'Anda belum terdaftar di kelas ini. Hubungi dosen atau admin.',
  DEVICE_MISMATCH: 'Gunakan perangkat yang terdaftar pada akun Anda atau hubungi admin.',
  NETWORK_RESTRICTED: 'Hubungkan perangkat ke jaringan yang ditentukan oleh dosen.',
  UNAUTHENTICATED: 'Sesi masuk telah berakhir. Silakan masuk kembali.',
  FORBIDDEN: 'Anda tidak dapat mengakses absensi ini. Hubungi dosen atau admin.',
  NOT_FOUND: 'Sesi absensi tidak ditemukan. Kembali ke daftar sesi dan pilih sesi yang tersedia.',
  RATE_LIMITED: 'Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.',
  UNAVAILABLE: 'Layanan absensi sedang mengalami gangguan. Tunggu sebentar lalu coba lagi.',
  INVALID_INPUT: 'Data absensi belum dapat diproses. Periksa QR, lokasi, dan foto, lalu coba lagi.',
  OFFLINE: 'Koneksi terputus. Sambungkan internet lalu coba lagi. Absensi belum terkirim.',
} as const;

export type AttendanceErrorCode = keyof typeof messages;

export function attendanceFeedback(status?: number, raw?: unknown) {
  const text = typeof raw === 'string' ? raw.toLowerCase() : '';
  let code: AttendanceErrorCode = 'INVALID_INPUT';
  if (!status) code = 'OFFLINE';
  else if (status >= 500) code = 'UNAVAILABLE';
  else if (status === 401) code = 'UNAUTHENTICATED';
  else if (status === 429) code = 'RATE_LIMITED';
  else if (status === 404) code = 'NOT_FOUND';
  else {
    const known = Object.entries(messages).find(([, message]) => message.toLowerCase() === text);
    if (known) code = known[0] as AttendanceErrorCode;
    else if (/permintaan.*(diproses|terkonfirmasi)/.test(text)) code = 'REQUEST_IN_PROGRESS';
    else if (/qr.*(kedaluwarsa|kadaluwarsa)/.test(text)) code = 'QR_EXPIRED';
    else if (/qr.*(belum tersedia|not configured)/.test(text)) code = 'QR_UNAVAILABLE';
    else if (/\bqr\b|qr_token/.test(text)) code = 'QR_INVALID';
    else if (/foto|photo|nonce|signature|security proof/.test(text) || status === 413)
      code = 'PHOTO_INVALID';
    else if (/gps|lokasi|koordinat|accuracy|latitude|longitude/.test(text))
      code = 'LOCATION_INVALID';
    else if (/waktu absensi|batas waktu|sesi tidak aktif/.test(text)) code = 'SESSION_CLOSED';
    else if (/sudah.*(check-in|check-out|absensi)/.test(text)) code = 'ALREADY_RECORDED';
    else if (/terdaftar di kelas/.test(text)) code = 'NOT_ENROLLED';
    else if (/perangkat|fingerprint/.test(text)) code = 'DEVICE_MISMATCH';
    else if (/jaringan|wifi/.test(text)) code = 'NETWORK_RESTRICTED';
    else if (status === 403) code = 'FORBIDDEN';
  }
  return { code, message: messages[code] };
}

export function attendanceError(error: unknown) {
  const failure = error as {
    response?: { status?: number; data?: { error?: unknown } };
    request?: unknown;
    code?: string;
    message?: unknown;
  } | null;
  if (failure?.response) {
    return attendanceFeedback(failure.response.status, failure.response.data?.error);
  }
  if (
    failure?.request ||
    ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(failure?.code ?? '')
  ) {
    return attendanceFeedback();
  }
  // Local photo/validation failures are not evidence of an offline connection.
  return attendanceFeedback(400, failure?.message);
}
