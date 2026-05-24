/** Label status sesi dalam Bahasa Indonesia — D-03, S-*, dll. */
export function sessionStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Aktif',
    UPCOMING: 'Akan datang',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
  };
  return map[status] ?? status;
}

/** Label status kehadiran — H-02, E-03 */
export function attendanceStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PRESENT: 'Hadir',
    LATE: 'Terlambat',
    ABSENT: 'Alfa',
    SICK: 'Sakit',
    EXCUSED: 'Izin',
    EXCUSED_APPROVED: 'Izin disetujui',
  };
  return map[status] ?? status;
}

/** Label pengajuan izin — E-03 */
export function excuseStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Menunggu',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
  };
  return map[status] ?? status;
}
