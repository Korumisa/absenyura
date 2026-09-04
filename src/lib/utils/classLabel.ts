export type ClassLabelSource = {
  name?: string | null;
  semester?: number | null;
};

export type ClassDetailSource = ClassLabelSource & {
  description?: string | null;
  course_code?: string | null;
};

/** Baris bawah nama kelas: deskripsi, atau kode MK jika deskripsi kosong (tanpa strip `-`). */
export function classDetailLine(cls: ClassDetailSource | null | undefined): string | null {
  if (!cls) return null;
  const desc = String(cls.description ?? '').trim();
  if (desc) return desc;
  const code = String(cls.course_code ?? '').trim();
  if (code) return code;
  return null;
}

export function formatClassLabel(cls: ClassLabelSource | null | undefined): string {
  if (!cls) return '';
  const name = String(cls.name ?? '').trim();
  const sem =
    cls.semester == null
      ? null
      : Number.isFinite(Number(cls.semester))
        ? Number(cls.semester)
        : null;

  if (name && sem != null) return `Sem ${sem} - ${name}`;
  if (name) return name;
  if (sem != null) return `Sem ${sem}`;
  return '';
}

export type SessionClassLabelSource = {
  class?: ClassLabelSource | null;
  session_classes?: { class?: ClassLabelSource | null }[] | null;
};

/** Label kelas untuk sesi: multi-kelas, legacy class_id, atau Semua Mahasiswa */
export function sessionClassNames(session: SessionClassLabelSource | null | undefined): string {
  const names = (session?.session_classes ?? []).flatMap((x) => {
    const result = formatClassLabel(x?.class);
    return result ? [result] : [];
  });
  if (names.length) return names.join(', ');
  if (session?.class) return formatClassLabel(session.class);
  return 'Semua Mahasiswa';
}

const SESSION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif',
  UPCOMING: 'Akan datang',
  CLOSED: 'Selesai',
};

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Hadir',
  LATE: 'Terlambat',
  ABSENT: 'Alfa',
  SICK: 'Sakit',
  EXCUSED: 'Izin',
  EXCUSED_APPROVED: 'Izin disetujui',
};

const USER_ROLE_LABELS: Record<string, string> = {
  USER: 'Mahasiswa',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
  CONTENT_ADMIN: 'Admin Konten',
};

const EXCUSE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};

export function attendanceStatusLabel(status: string | null | undefined): string {
  const value = String(status ?? '').toUpperCase();
  if (!value) return '-';
  return ATTENDANCE_STATUS_LABELS[value] ?? status ?? '-';
}

export type LabelDomain = 'session-status' | 'attendance-status' | 'user-role' | 'excuse-status';

export type AttendanceBadgeVariant =
  | 'success'
  | 'warning'
  | 'destructive'
  | 'secondary'
  | 'sick'
  | 'excused';

/**
 * Sumber kebenaran tunggal label Bahasa Indonesia.
 *
 * Fallback yang konsisten: jika label tidak ada di lookup, kembalikan raw value
 * (jika tidak string kosong) — atau `-` sebagai last resort.
 */
export function formatLabel(domain: LabelDomain, rawValue: string | null | undefined): string {
  if (rawValue == null) return '-';
  const value = String(rawValue).trim();
  if (value === '') return '-';

  switch (domain) {
    case 'session-status':
      return SESSION_STATUS_LABELS[value] ?? value;
    case 'attendance-status':
      return ATTENDANCE_STATUS_LABELS[value] ?? value;
    case 'user-role':
      return USER_ROLE_LABELS[value] ?? value;
    case 'excuse-status':
      return EXCUSE_STATUS_LABELS[value] ?? value;
    default:
      return value;
  }
}

export function attendanceBadgeVariant(status: string): AttendanceBadgeVariant {
  if (status === 'PRESENT') return 'success';
  if (status === 'LATE') return 'warning';
  if (status === 'ABSENT') return 'destructive';
  if (status === 'SICK') return 'sick';
  if (status === 'EXCUSED') return 'excused';
  return 'secondary';
}

export type ExcuseBadgeVariant =
  | 'sick'
  | 'excused'
  | 'destructive'
  | 'warning'
  | 'secondary'
  | 'success';

export function excuseBadgeVariant(reason: string): ExcuseBadgeVariant {
  if (reason === 'SICK') return 'sick';
  if (reason === 'EXCUSED') return 'excused';
  return 'secondary';
}

export function excuseReasonLabel(reason: string): string {
  if (reason === 'SICK') return 'Sakit';
  if (reason === 'EXCUSED') return 'Izin';
  return reason || '-';
}

export { SESSION_STATUS_LABELS, ATTENDANCE_STATUS_LABELS, USER_ROLE_LABELS, EXCUSE_STATUS_LABELS };
