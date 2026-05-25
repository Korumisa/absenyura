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
  const sem = cls.semester == null ? null : Number.isFinite(Number(cls.semester)) ? Number(cls.semester) : null;

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
  const names = (session?.session_classes ?? [])
    .map((x) => formatClassLabel(x?.class))
    .filter(Boolean);
  if (names.length) return names.join(', ');
  if (session?.class) return formatClassLabel(session.class);
  return 'Semua Mahasiswa';
}

