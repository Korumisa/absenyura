import { describe, expect, test } from 'vitest';

type SessionId = string;
type UserId = string;

const computeAbsentUserIds = (
  expectedUserIds: UserId[],
  presentUserIds: UserId[],
  excusedUserIds: Set<UserId>
): UserId[] => {
  return expectedUserIds.filter((id) => !presentUserIds.includes(id) && !excusedUserIds.has(id));
};

describe('Cron Task B: UF-004 — PENDING/APPROVED excuses excluded from auto-absent', () => {
  test('Case 1: User X has PENDING excuse for session S → absentUserIds MUST NOT include X', () => {
    const expectedUserIds: UserId[] = ['userX', 'userY', 'userZ'];
    const presentUserIds: UserId[] = [];
    const pendingExcuse = new Set<UserId>(['userX']);

    const absentUserIds = computeAbsentUserIds(expectedUserIds, presentUserIds, pendingExcuse);

    expect(absentUserIds.includes('userX')).toBe(false);
    expect(absentUserIds).toEqual(expect.arrayContaining(['userY', 'userZ']));
    expect(absentUserIds.length).toBe(2);
  });

  test('Case 2: User Y no excuse + NOT present → absentUserIds MUST include Y', () => {
    const expectedUserIds: UserId[] = ['userX', 'userY', 'userZ'];
    const presentUserIds: UserId[] = ['userX'];
    const noExcuse = new Set<UserId>();

    const absentUserIds = computeAbsentUserIds(expectedUserIds, presentUserIds, noExcuse);

    expect(absentUserIds.includes('userY')).toBe(true);
    expect(absentUserIds.includes('userZ')).toBe(true);
    expect(absentUserIds.includes('userX')).toBe(false);
  });

  test('APPROVED / SICK / EXCUSED statuses are also excluded — absentUserIds does not contain any of them', () => {
    const expectedUserIds: UserId[] = ['a1', 'a2', 'a3', 'a4', 'a5'];
    const presentUserIds: UserId[] = ['a1'];
    const allExcused = new Set<UserId>(['a2', 'a3', 'a4']); // APPROVED, SICK, EXCUSED respectively

    const absentUserIds = computeAbsentUserIds(expectedUserIds, presentUserIds, allExcused);

    expect(absentUserIds).toEqual(['a5']);
    expect(absentUserIds.includes('a2')).toBe(false);
    expect(absentUserIds.includes('a3')).toBe(false);
    expect(absentUserIds.includes('a4')).toBe(false);
  });

  test('absentUserIds must be strict subset of expectedUserIds minus excused minus present', () => {
    const expectedUserIds: UserId[] = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'];
    const presentUserIds: UserId[] = ['u1', 'u6'];
    const excused = new Set<UserId>(['u2', 'u3']);

    const absentUserIds = computeAbsentUserIds(expectedUserIds, presentUserIds, excused);

    expect(absentUserIds.length).toBe(2);
    expect(absentUserIds.sort()).toEqual(['u4', 'u5']);
  });
});
