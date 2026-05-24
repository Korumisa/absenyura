import type { Report } from '@/types/report';

export function reportClassLabel(r: Report): string {
  const fromList = (r.session_classes ?? []).filter(Boolean);
  if (fromList.length) return fromList.join(', ');
  const name = String(r.class_name ?? '').trim();
  return name || '-';
}
