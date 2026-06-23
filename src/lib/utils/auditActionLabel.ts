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
        // For import users, show a summary instead of raw JSON
        if (log.action === 'IMPORT_USERS') {
          const parts: string[] = [];
          if ('imported_users' in parsed) parts.push(`${parsed.imported_users} pengguna`);
          if ('created_classes' in parsed) parts.push(`${parsed.created_classes} kelas`);
          if ('created_enrollments' in parsed)
            parts.push(`${parsed.created_enrollments} pendaftaran`);
          if (parts.length > 0) return parts.join(', ');
        }

        const email = (parsed as { email?: string }).email;
        const name = (parsed as { name?: string }).name;
        if (email) return email;
        if (name) return name;

        // For other JSON objects, stringify nicely and truncate
        const formatted = JSON.stringify(parsed, null, 2);
        if (formatted.length <= 150) return formatted;
        return `${formatted.slice(0, 147)}…`;
      }
    } catch {
      /* raw string */
    }

    if (log.new_value.length <= 80) return log.new_value;
    return `${log.new_value.slice(0, 77)}…`;
  }
  return null;
}
