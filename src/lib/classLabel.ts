export type ClassLabelSource = {
  name?: string | null;
  semester?: number | null;
};

export function formatClassLabel(cls: ClassLabelSource | null | undefined): string {
  if (!cls) return '';
  const name = String(cls.name ?? '').trim();
  const sem = cls.semester == null ? null : Number.isFinite(Number(cls.semester)) ? Number(cls.semester) : null;

  if (name && sem != null) return `Sem ${sem} - ${name}`;
  if (name) return name;
  if (sem != null) return `Sem ${sem}`;
  return '';
}

