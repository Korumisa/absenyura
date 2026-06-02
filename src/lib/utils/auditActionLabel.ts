import type { AuditLog } from '@/types/audit';

const ACTION_LABELS: Record<string, string> = {
  CREATE_USER: 'Pengguna baru ditambahkan',
  UPDATE_USER: 'Data pengguna diperbarui',
  DELETE_USER: 'Pengguna dihapus',
  IMPORT_USERS: 'Impor data pengguna',
  OVERRIDE_ATTENDANCE: 'Kehadiran diubah manual',
  LOGIN: 'Masuk ke sistem',
  LOGOUT: 'Keluar dari sistem',
  LOGIN_FAILED: 'Percobaan masuk gagal',
};

const TABLE_LABELS: Record<string, string> = {
  User: 'Pengguna',
  Session: 'Sesi absensi',
  Attendance: 'Kehadiran',
  Excuse: 'Pengajuan izin',
  Location: 'Lokasi',
  Class: 'Kelas',
};

export function getAuditActionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getAuditTableLabel(table: string | null): string {
  if (!table) return '—';
  return TABLE_LABELS[table] ?? table;
}

export function getAuditActionVariant(
  action: string
): 'success' | 'warning' | 'destructive' | 'default' {
  const upper = action.toUpperCase();
  if (upper.includes('DELETE') || upper.includes('FAILED')) return 'destructive';
  if (upper.includes('CREATE') || upper.includes('IMPORT') || upper.includes('LOGIN'))
    return 'success';
  if (upper.includes('UPDATE') || upper.includes('OVERRIDE')) return 'warning';
  return 'default';
}

export function formatAuditDetail(log: AuditLog): string | null {
  if (log.new_value) {
    try {
      const parsed = JSON.parse(log.new_value);
      if (typeof parsed === 'object' && parsed !== null) {
        const email = (parsed as { email?: string }).email;
        const name = (parsed as { name?: string }).name;
        if (email) return email;
        if (name) return name;
      }
    } catch {
      /* raw string */
    }
    if (log.new_value.length <= 80) return log.new_value;
    return `${log.new_value.slice(0, 77)}…`;
  }
  return null;
}
