/** Petunjuk scroll tabel di layar kecil — temuan #18 */
export function MobileTableHint() {
  return (
    <p className="px-4 py-2 text-center text-xs text-slate-500 dark:text-zinc-400 md:hidden" role="note">
      Geser tabel ke kiri/kanan untuk melihat semua kolom.
    </p>
  );
}
