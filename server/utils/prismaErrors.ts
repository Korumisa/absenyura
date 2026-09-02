export const isMissingSemesterColumn = (err: any) =>
  Boolean(
    err && err.code === 'P2022' && String(err?.meta?.column || '').includes('Class.semester')
  );

/**
 * Wrap any Prisma query that includes `Class.semester` in its projection with a
 * backward-compatible fallback that re-runs the query without `semester` if the
 * current DB schema hasn't migrated the `Class.semester` column yet (Prisma
 * error code P2022 referencing `Class.semester`). All other errors re-throw
 * unchanged.
 *
 * Use pattern:
 *   const result = await queryWithSemesterFallback(
 *     () => prisma.X.findMany({ ... select ... { class: { name, semester } } }),
 *     () => prisma.X.findMany({ ... select ... { class: { name } } })
 *   );
 */
export async function queryWithSemesterFallback<TFull, TFallback>(
  queryFull: () => Promise<TFull>,
  queryFallback: () => Promise<TFallback>
): Promise<TFull | TFallback> {
  try {
    return await queryFull();
  } catch (err: any) {
    if (!isMissingSemesterColumn(err)) throw err;
    return await queryFallback();
  }
}
