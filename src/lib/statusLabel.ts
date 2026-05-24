/** [SYSTEMIC] M-04, M-05, ST-01 — sumber kebenaran label status Bahasa Indonesia */

export function sessionStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Aktif',
    UPCOMING: 'Akan datang',
    CLOSED: 'Selesai',
  };
  return map[status] ?? status;
}

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

export function userRoleLabel(role: string): string {
  const map: Record<string, string> = {
    USER: 'Mahasiswa',
    ADMIN: 'Admin',
    SUPER_ADMIN: 'Super Admin',
    CONTENT_ADMIN: 'Admin Konten',
  };
  return map[role] ?? role;
}

export function excuseStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Menunggu',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
  };
  return map[status] ?? status;
}

export function attendanceBadgeVariant(
  status: string
): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (status === 'PRESENT') return 'success';
  if (status === 'LATE') return 'warning';
  if (status === 'ABSENT') return 'destructive';
  return 'secondary';
}
