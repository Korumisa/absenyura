/** Helper render kondisional konten publik — sembunyikan section kosong */
export function hasText(value?: string | null): boolean {
  return Boolean(String(value ?? '').trim());
}

export function showPublicSection(...fields: (string | null | undefined)[]): boolean {
  return fields.some((f) => hasText(f));
}
