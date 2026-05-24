/** Petunjuk scroll tabel di layar kecil — temuan #18 */
export function MobileTableHint() {
  return (
    <p className="px-4 py-2 text-center text-xs text-muted-foreground text-muted-foreground md:hidden" role="note">
      Geser tabel ke kiri/kanan untuk melihat semua kolom.
    </p>
  );
}
