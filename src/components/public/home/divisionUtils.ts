export function getDivisionDisplayTitle(input: string) {
  const raw = String(input ?? '').trim();
  const lower = raw.toLowerCase();
  if (lower.includes('badan pengurus harian') || lower === 'bph') return 'Pengurus Inti';
  return raw || 'Divisi';
}

export function getDivisionTagline(input: string) {
  const title = getDivisionDisplayTitle(input);
  const t = title.toLowerCase();
  if (t.includes('pengurus inti') || t.includes('inti')) return 'Arah strategis, koordinasi, dan pengambilan keputusan organisasi.';
  if (t.includes('kominfo')) return 'Publikasi, dokumentasi, dan pengelolaan media organisasi.';
  if (t.includes('psdm')) return 'Pengembangan anggota, pelatihan, dan internal organisasi.';
  if (t.includes('humas')) return 'Kemitraan, komunikasi, dan relasi eksternal organisasi.';
  if (t.includes('minat') || t.includes('bakat')) return 'Wadah kegiatan, lomba, dan pengembangan prestasi anggota.';
  if (t.includes('kwu') || t.includes('kewirausahaan')) return 'Wadah pengembangan bisnis, pendanaan, dan jiwa entrepreneur anggota.';
  if (t.includes('pengmas') || t.includes('abdimas') || t.includes('pengabdian')) return 'Program pengabdian masyarakat dan pengabdian sosial berbasis kampus.';
  return 'Kolaborasi dan eksekusi program kerja divisi.';
}

export function isCoreStructureGroup(title: string) {
  const t = String(title ?? '').toLowerCase();
  return t.includes('badan pengurus harian') || t === 'bph' || t.includes('inti');
}
