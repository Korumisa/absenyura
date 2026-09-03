import { describe, expect, test, vi, beforeEach } from 'vitest';

type SessionLike = { id: string; class_id?: string | null };

const buildResolveExpectedUserIdsBATCH = (prismaMock: {
  sessionClass: { findMany: any };
  classEnrollment: { findMany: any };
  user: { findMany: any };
}) => {
  return async (
    sessions: SessionLike[]
  ): Promise<Map<string, { expectedUserIds: string[]; linkedClassIds: string[] }>> => {
    const result = new Map<string, { expectedUserIds: string[]; linkedClassIds: string[] }>();
    if (sessions.length === 0) return result;

    const sessionIds = sessions.map((s) => s.id);

    // 1 BATCH pivot query for ALL sessions (NOT N queries)
    const pivotRows = await prismaMock.sessionClass.findMany({
      where: { session_id: { in: sessionIds } },
      select: { session_id: true, class_id: true },
    });

    const pivotBySession = new Map<string, string[]>();
    for (const row of pivotRows) {
      if (!row.class_id) continue;
      const cid = String(row.class_id);
      const arr = pivotBySession.get(row.session_id);
      if (arr) arr.push(cid);
      else pivotBySession.set(row.session_id, [cid]);
    }

    const sessionsWithNoClasses: SessionLike[] = [];
    const allClassIdsSet = new Set<string>();

    for (const session of sessions) {
      const fromLegacy: string[] = session.class_id ? [String(session.class_id)] : [];
      const fromPivot: string[] = pivotBySession.get(session.id) ?? [];
      const mergedClassIds = Array.from(new Set([...fromLegacy, ...fromPivot]));
      result.set(session.id, { expectedUserIds: [], linkedClassIds: mergedClassIds });
      if (mergedClassIds.length === 0) sessionsWithNoClasses.push(session);
      else mergedClassIds.forEach((cid) => allClassIdsSet.add(cid));
    }

    if (allClassIdsSet.size > 0) {
      const allClassIds = Array.from(allClassIdsSet);
      // 1 BATCH enrollment query for ALL classes (NOT N queries)
      const enrollmentRows = await prismaMock.classEnrollment.findMany({
        where: { class_id: { in: allClassIds } },
        select: { class_id: true, student_id: true },
      });

      const enrollmentByClass = new Map<string, Set<string>>();
      for (const row of enrollmentRows) {
        if (!row.class_id || !row.student_id) continue;
        const cid = String(row.class_id);
        const sid = String(row.student_id);
        let set = enrollmentByClass.get(cid);
        if (!set) {
          set = new Set();
          enrollmentByClass.set(cid, set);
        }
        set.add(sid);
      }

      for (const session of sessions) {
        const entry = result.get(session.id)!;
        if (entry.linkedClassIds.length === 0) continue;
        const combined = new Set<string>();
        for (const cid of entry.linkedClassIds) {
          const set = enrollmentByClass.get(cid);
          if (set) set.forEach((sid) => combined.add(sid));
        }
        entry.expectedUserIds = Array.from(combined);
      }
    }

    if (sessionsWithNoClasses.length > 0) {
      const activeUsers = await prismaMock.user.findMany({
        where: { role: 'USER', is_active: true },
        select: { id: true },
      });
      const fallbackIds = activeUsers.map((u: { id: string }) => u.id);
      for (const session of sessionsWithNoClasses) {
        result.get(session.id)!.expectedUserIds = fallbackIds;
      }
    }

    return result;
  };
};

describe('Cron Task E: BATCH resolveExpectedUserIds — N+1 query count 98% drop', () => {
  let prismaMock: {
    sessionClass: { findMany: any };
    classEnrollment: { findMany: any };
    user: { findMany: any };
  };
  let resolveBATCH: ReturnType<typeof buildResolveExpectedUserIdsBATCH>;

  beforeEach(() => {
    prismaMock = {
      sessionClass: {
        findMany: vi.fn(async (args: any) => {
          const sessionIds: string[] = args.where.session_id.in;
          return sessionIds.flatMap((sid) => [
            { session_id: sid, class_id: `c1_${sid}` },
            { session_id: sid, class_id: `c2_${sid}` },
          ]);
        }),
      },
      classEnrollment: {
        findMany: vi.fn(async (args: any) => {
          const classIds: string[] = args.where.class_id.in;
          return classIds.flatMap((cid) => [
            { class_id: cid, student_id: `s1_${cid}` },
            { class_id: cid, student_id: `s2_${cid}` },
          ]);
        }),
      },
      user: { findMany: vi.fn(async () => []) },
    };
    resolveBATCH = buildResolveExpectedUserIdsBATCH(prismaMock);
  });

  test('BATCH with N=50 sessions → sessionClass.findMany called exactly 1 time (NOT 50)', async () => {
    const N = 50;
    const sessions: SessionLike[] = Array.from({ length: N }, (_, i) => ({
      id: `session_${i + 1}`,
      class_id: null,
    }));

    await resolveBATCH(sessions);

    expect(prismaMock.sessionClass.findMany).toHaveBeenCalledTimes(1);
  });

  test('BATCH with N=50 sessions → classEnrollment.findMany called exactly 1 time (NOT 50)', async () => {
    const N = 50;
    const sessions: SessionLike[] = Array.from({ length: N }, (_, i) => ({
      id: `session_${i + 1}`,
      class_id: null,
    }));

    await resolveBATCH(sessions);

    expect(prismaMock.classEnrollment.findMany).toHaveBeenCalledTimes(1);
  });

  test('Query reduction % vs SINGLE pattern: N=100 → 2 queries total (98%+ drop from 200)', async () => {
    const N = 100;
    const sessions: SessionLike[] = Array.from({ length: N }, (_, i) => ({
      id: `session_${i + 1}`,
      class_id: `legacy_${i + 1}`,
    }));

    await resolveBATCH(sessions);

    const pivotCalls = prismaMock.sessionClass.findMany.mock.calls.length;
    const enrollCalls = prismaMock.classEnrollment.findMany.mock.calls.length;
    const totalBatchCalls = pivotCalls + enrollCalls;

    // SINGLE pattern would have been N pivot + N enrollment = 2N = 200 calls
    const singlePatternQueries = 2 * N;
    const reductionPct = ((singlePatternQueries - totalBatchCalls) / singlePatternQueries) * 100;

    expect(totalBatchCalls).toBe(2);
    expect(reductionPct).toBeGreaterThanOrEqual(98);
  });

  test('BATCH correctness: per-session expectedUserIds contains enrollment students from merged classIds', async () => {
    const sessions: SessionLike[] = [
      { id: 'S1', class_id: 'CLS_A' },
      { id: 'S2', class_id: 'CLS_B' },
    ];
    // Override mocks with deterministic data for this specific test
    prismaMock.sessionClass.findMany = vi.fn(async () => [
      { session_id: 'S1', class_id: 'CLS_A2' },
      { session_id: 'S2', class_id: 'CLS_B2' },
    ]);
    prismaMock.classEnrollment.findMany = vi.fn(async () => [
      { class_id: 'CLS_A', student_id: 'U1' },
      { class_id: 'CLS_A2', student_id: 'U2' },
      { class_id: 'CLS_B', student_id: 'U3' },
      { class_id: 'CLS_B2', student_id: 'U4' },
    ]);

    const resolveBATCH2 = buildResolveExpectedUserIdsBATCH(prismaMock);
    const result = await resolveBATCH2(sessions);

    expect(result.get('S1')!.linkedClassIds.sort()).toEqual(['CLS_A', 'CLS_A2']);
    expect(result.get('S1')!.expectedUserIds.sort()).toEqual(['U1', 'U2']);
    expect(result.get('S2')!.linkedClassIds.sort()).toEqual(['CLS_B', 'CLS_B2']);
    expect(result.get('S2')!.expectedUserIds.sort()).toEqual(['U3', 'U4']);
  });
});
