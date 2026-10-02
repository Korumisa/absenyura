import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const db = vi.hoisted(() => ({
  session: { findMany: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
  sessionClass: { findMany: vi.fn() },
  classEnrollment: { findMany: vi.fn() },
  user: { findMany: vi.fn() },
  attendance: { findMany: vi.fn(), createMany: vi.fn() },
  excuseRequest: { findMany: vi.fn() },
  notification: { create: vi.fn(), createMany: vi.fn() },
}));
vi.mock('../utils/prisma.js', () => ({ default: db }));

const makeSession = (id: string, classId: string | null = null) => ({
  id,
  class_id: classId,
  title: id,
  created_by_id: 'lecturer',
});

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-03T08:00:00Z'));
  db.session.findMany.mockResolvedValue([]);
  db.session.count.mockResolvedValue(0);
  db.sessionClass.findMany.mockResolvedValue([]);
  db.classEnrollment.findMany.mockResolvedValue([]);
  db.user.findMany.mockResolvedValue([]);
  db.attendance.findMany.mockResolvedValue([]);
  db.excuseRequest.findMany.mockResolvedValue([]);
});

afterEach(() => vi.useRealTimers());

describe('runCronJob production flow', () => {
  test.each([50, 100])(
    'batches class and enrollment lookup for %i activated sessions',
    async (n) => {
      const sessions = Array.from({ length: n }, (_, i) => makeSession(`S${i}`, `legacy${i}`));
      db.session.findMany.mockResolvedValueOnce(sessions).mockResolvedValueOnce([]);
      db.sessionClass.findMany.mockResolvedValue(
        sessions.map((s) => ({ session_id: s.id, class_id: `pivot${s.id}` }))
      );
      db.classEnrollment.findMany.mockResolvedValue(
        sessions.flatMap((s) => [
          { class_id: s.class_id, student_id: `student-${s.id}` },
          { class_id: `pivot${s.id}`, student_id: `student-${s.id}` },
          { class_id: `pivot${s.id}`, student_id: `other-${s.id}` },
        ])
      );
      const { runCronJob } = await import('./cron');
      await runCronJob();
      expect(db.sessionClass.findMany).toHaveBeenCalledTimes(1);
      expect(db.classEnrollment.findMany).toHaveBeenCalledTimes(1);
      expect(db.user.findMany).not.toHaveBeenCalled();
      expect(db.notification.createMany).toHaveBeenCalledTimes(n);
      expect(db.notification.createMany.mock.calls[0][0].data).toEqual([
        expect.objectContaining({ user_id: 'student-S0' }),
        expect.objectContaining({ user_id: 'other-S0' }),
      ]);
    }
  );

  test.each(['PENDING', 'APPROVED', 'SICK', 'EXCUSED'])(
    'excludes present and %s-excused users when recording absences',
    async (status) => {
      db.session.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([makeSession('S1')]);
      db.user.findMany.mockResolvedValue(['present', 'excused', 'absent'].map((id) => ({ id })));
      db.attendance.findMany.mockResolvedValue([{ user_id: 'present' }]);
      db.excuseRequest.findMany.mockResolvedValue([{ session_id: 'S1', user_id: 'excused' }]);
      const { runCronJob } = await import('./cron');
      await runCronJob();
      expect(db.excuseRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            session_id: { in: ['S1'] },
            status: { in: expect.arrayContaining([status]) },
          }),
        })
      );
      expect(db.attendance.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ session_id: 'S1', user_id: 'absent', status: 'ABSENT' })],
      });
    }
  );

  test('does not create absent records when everyone attended or is excused', async () => {
    db.session.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([makeSession('S1')]);
    db.user.findMany.mockResolvedValue([{ id: 'present' }, { id: 'excused' }]);
    db.attendance.findMany.mockResolvedValue([{ user_id: 'present' }]);
    db.excuseRequest.findMany.mockResolvedValue([{ session_id: 'S1', user_id: 'excused' }]);
    const { runCronJob } = await import('./cron');
    await runCronJob();
    expect(db.attendance.createMany).not.toHaveBeenCalled();
  });

  test('shares the active-user fallback across sessions without classes', async () => {
    db.session.findMany
      .mockResolvedValueOnce([makeSession('S1'), makeSession('S2')])
      .mockResolvedValueOnce([]);
    db.user.findMany.mockResolvedValue([{ id: 'student' }]);
    const { runCronJob } = await import('./cron');
    await runCronJob();
    expect(db.user.findMany).toHaveBeenCalledTimes(1);
    expect(db.notification.createMany).toHaveBeenCalledTimes(2);
  });

  test('throttles repeat runs and resumes after one minute', async () => {
    const { runCronJob } = await import('./cron');
    await runCronJob();
    await runCronJob();
    expect(db.session.findMany).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(60_000);
    await runCronJob();
    expect(db.session.findMany).toHaveBeenCalledTimes(4);
  });
});
