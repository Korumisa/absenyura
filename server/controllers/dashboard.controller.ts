import { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';
import { fillChartData, getWibRangeUtc, type ChartRow } from '../utils/dashboardChart.js';
import { sessionApiSelect, sessionListSelect } from '../utils/sessionQuerySelect.js';
import { adminSessionScopeWhere } from '../utils/sessionAccess.js';
import { triggerSessionCronLazy } from '../jobs/cron.js';
import { queryWithSemesterFallback } from '../utils/prismaErrors.js';
import { sendInternalServerError } from '../utils/errorResponse.js';
import { createSingleFlightCache } from '../utils/singleFlightCache.js';

const dashboardCache = createSingleFlightCache<unknown>(15_000, 32);

export const clearDashboardStatsCache = () => dashboardCache.clear();

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  triggerSessionCronLazy();
  try {
    const user = req.user!;
    const rangeDays = parseInt((req.query.range as string) || '7', 10);
    const parsedSessionLimit = parseInt((req.query.recentSessionsCount as string) || '10', 10);
    const recentSessionsCount =
      Number.isInteger(parsedSessionLimit) && parsedSessionLimit >= 1 ? parsedSessionLimit : 10;
    const cacheKey = `${user.id}:${user.role}:${rangeDays}:${recentSessionsCount}`;

    const data = await dashboardCache.get(cacheKey, () =>
      loadDashboardStats(user, rangeDays, recentSessionsCount)
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    sendInternalServerError(res, error);
  }
};

async function loadDashboardStats(
  user: NonNullable<AuthRequest['user']>,
  rangeDays: number,
  recentSessionsCount: number
) {
  if (user.role === 'USER') {
    const grouped = await prisma.attendance.groupBy({
      by: ['status'],
      where: { user_id: user.id },
      _count: { _all: true },
    });

    const countsByStatus = grouped.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    const total = Object.values(countsByStatus).reduce((a, b) => a + b, 0);
    const present = countsByStatus.PRESENT ?? 0;
    const late = countsByStatus.LATE ?? 0;
    const absent = countsByStatus.ABSENT ?? 0;
    const sick = countsByStatus.SICK ?? 0;
    const excused = countsByStatus.EXCUSED ?? 0;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    // Upcoming sessions for enrolled classes
    const userId = user.id as string;
    const upcomingWhere = {
      status: { in: ['UPCOMING', 'ACTIVE'] },
      OR: [
        { class_id: null, session_classes: { none: {} } },
        { class: { enrollments: { some: { student_id: userId } } } },
        {
          session_classes: {
            some: { class: { enrollments: { some: { student_id: userId } } } },
          },
        },
      ],
    };
    // TODO(#post-audit-p3): remove fallback once all envs confirm semester column exists (2026-02 migration applied)
    const upcomingSessions = await queryWithSemesterFallback(
      () =>
        prisma.session.findMany({
          where: upcomingWhere,
          orderBy: { session_start: 'asc' },
          take: 5,
          select: sessionListSelect({ userId, withSemester: true }),
        }),
      () =>
        prisma.session.findMany({
          where: upcomingWhere,
          orderBy: { session_start: 'asc' },
          take: 5,
          select: sessionListSelect({ userId, withSemester: false }),
        })
    );

    const { startUtc, endUtc } = getWibRangeUtc({ rangeDays: rangeDays, now: new Date() });
    const rows = await prisma.$queryRaw<ChartRow[]>(Prisma.sql`
        SELECT
          to_char(date_trunc('day', a.check_in_time AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD') AS date,
          count(*)::int AS count,
          sum(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END)::int AS present,
          sum(CASE WHEN a.status = 'LATE' THEN 1 ELSE 0 END)::int AS late,
          sum(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END)::int AS absent,
          sum(CASE WHEN a.status = 'SICK' THEN 1 ELSE 0 END)::int AS sick,
          sum(CASE WHEN a.status = 'EXCUSED' THEN 1 ELSE 0 END)::int AS excused
        FROM "Attendance" a
        WHERE a.user_id = ${user.id}
          AND a.check_in_time >= ${startUtc}
          AND a.check_in_time < ${endUtc}
        GROUP BY 1
        ORDER BY 1
      `);

    const chartData = fillChartData({ rangeDays, now: new Date(), rows });

    return {
      stats: { total, present, late, absent, sick, excused, percentage },
      recent_sessions: upcomingSessions,
      chart_data: chartData,
    };
  }

  const userId = user.id as string;
  const isAdmin = user.role === 'ADMIN';

  const { startUtc: todayStartUtc, endUtc: todayEndUtc } = getWibRangeUtc({
    rangeDays: 1,
    now: new Date(),
  });
  const { startUtc, endUtc } = getWibRangeUtc({ rangeDays, now: new Date() });

  const userCountWhere = isAdmin
    ? { role: 'USER', enrollments: { some: { class: { lecturer_id: userId } } } }
    : { role: 'USER' };

  // Sequential on purpose: Prisma connection_limit=1, so Promise.all queues
  // waiters and trips P2024 during a stampede.
  const totalUsers = await prisma.user.count({ where: userCountWhere });
  const totalSessions = await prisma.session.count(
    isAdmin ? { where: adminSessionScopeWhere(userId) } : undefined
  );
  const todayGrouped = await prisma.attendance.groupBy({
    by: ['status'],
    where: {
      check_in_time: { gte: todayStartUtc, lt: todayEndUtc },
      session: isAdmin ? adminSessionScopeWhere(userId) : undefined,
    },
    _count: { _all: true },
  });
  const recentSessions = await prisma.session.findMany({
    where: isAdmin ? adminSessionScopeWhere(userId) : undefined,
    orderBy: [{ session_start: 'desc' }],
    take: Math.min(recentSessionsCount, 100),
    select: {
      ...sessionApiSelect,
      _count: { select: { attendances: true } },
      location: { select: { name: true } },
      class: { select: { id: true, name: true } },
      session_classes: { select: { class: { select: { id: true, name: true } } } },
    },
  });
  const lecturerClassRows = isAdmin
    ? await prisma.class.findMany({ where: { lecturer_id: userId }, select: { id: true } })
    : [];
  const usersMustChangePasswordCount = await prisma.user.count({
    where:
      user.role === 'SUPER_ADMIN'
        ? { must_change_password: true }
        : isAdmin
          ? { ...userCountWhere, must_change_password: true }
          : undefined,
  });

  const lecturerClassIds = (lecturerClassRows ?? []).map((x) => x.id);

  const todayCounts = todayGrouped.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count._all;
    return acc;
  }, {});
  const present = todayCounts.PRESENT ?? 0;
  const late = todayCounts.LATE ?? 0;

  const emptyClause = Prisma.sql`FALSE`;
  const classIdInClause =
    lecturerClassIds.length === 0
      ? emptyClause
      : Prisma.sql`s.class_id IN (${Prisma.join(lecturerClassIds)})`;
  const sessionClassInClause =
    lecturerClassIds.length === 0
      ? emptyClause
      : Prisma.sql`sc.class_id IN (${Prisma.join(lecturerClassIds)})`;

  const rows = await prisma.$queryRaw<ChartRow[]>(Prisma.sql`
        SELECT
          to_char(date_trunc('day', a.check_in_time AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD') AS date,
          count(*)::int AS count,
          sum(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END)::int AS present,
          sum(CASE WHEN a.status = 'LATE' THEN 1 ELSE 0 END)::int AS late,
          sum(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END)::int AS absent,
          sum(CASE WHEN a.status = 'SICK' THEN 1 ELSE 0 END)::int AS sick,
          sum(CASE WHEN a.status = 'EXCUSED' THEN 1 ELSE 0 END)::int AS excused
        FROM "Attendance" a
        ${isAdmin ? Prisma.sql`JOIN "Session" s ON s.id = a.session_id` : Prisma.empty}
        WHERE a.check_in_time >= ${startUtc}
          AND a.check_in_time < ${endUtc}
          ${
            isAdmin
              ? Prisma.sql`AND (
                  ${classIdInClause}
                  OR s.id IN (
                    SELECT sc.session_id
                    FROM "SessionClass" sc
                    WHERE ${sessionClassInClause}
                  )
                )`
              : Prisma.empty
          }
        GROUP BY 1
        ORDER BY 1
      `);

  const chartData = fillChartData({ rangeDays, now: new Date(), rows });

  return {
    stats: {
      total_users: totalUsers,
      total_sessions: totalSessions,
      today_present: present,
      today_late: late,
      users_must_change_password: usersMustChangePasswordCount ?? 0,
    },
    recent_sessions: recentSessions,
    chart_data: chartData,
  };
}
