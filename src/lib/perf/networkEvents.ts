/** Dipancarkan saat browser kembali online — halaman bisa menyambung ulang tanpa refresh manual */
export const APP_ONLINE_EVENT = 'app:network-online';

export const OFFLINE_USER_MESSAGE =
  'Anda sedang offline. Lanjutkan mengisi absensi — data akan disinkronkan otomatis saat internet kembali.';

export const ONLINE_USER_MESSAGE = 'Koneksi kembali. Melanjutkan tanpa perlu muat ulang halaman.';

export function dispatchAppOnline() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(APP_ONLINE_EVENT));
  }
}
