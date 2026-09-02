import { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';
import { fillChartData, getWibRangeUtc, type ChartRow } from '../utils/dashboardChart.js';
import { sessionApiSelect, sessionListSelect } from '../utils/sessionQuerySelect.js';
import { triggerSessionCronLazy } from '../jobs/cron.js';
import { adminSessionScopeWhere } from '../utils/sessionAccess.js';
import { queryWithSemesterFallback } from '../utils/prismaErrors.js';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  triggerSessionCronLazy();
  try {
    const user = req.user!;
    const rangeDays = parseInt((req.query.range as string) || '7', 10);

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
      // TODO: remove fallback once all envs confirm semester column exists (2026-02 migration applied)
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

      res.status(200).json({
        success: true,
        data: {
          stats: { total, present, late, absent, sick, excused, percentage },
          recent_sessions: upcomingSessions,
          chart_data: chartData,
        },
      });
    } else {
      // Admin / Super Admin stats
      const totalUsers = await prisma.user.count({
        where:
          user.role === 'ADMIN'
            ? {
                role: 'USER',
                enrollments: {
                  some: {
                    class: { lecturer_id: user.id },
                  },
                },
              }
            : { role: 'USER' },
      });
      const totalSessions = await prisma.session.count(
        user.role === 'ADMIN' ? { where: adminSessionScopeWhere(user.id) } : undefined
      );

      // Get attendance count for today
      const { startUtc: todayStartUtc, endUtc: todayEndUtc } = getWibRangeUtc({
        rangeDays: 1,
        now: new Date(),
      });
      const todayGrouped = await prisma.attendance.groupBy({
        by: ['status'],
        where: {
          check_in_time: { gte: todayStartUtc, lt: todayEndUtc },
          session: user.role === 'ADMIN' ? adminSessionScopeWhere(user.id) : undefined,
        },
        _count: { _all: true },
      });

      const todayCounts = todayGrouped.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = row._count._all;
        return acc;
      }, {});

      const present = todayCounts.PRESENT ?? 0;
      const late = todayCounts.LATE ?? 0;

      // Recent sessions
      const recentSessions = await prisma.session.findMany({
        where: user.role === 'ADMIN' ? adminSessionScopeWhere(user.id) : undefined,
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          ...sessionApiSelect,
          _count: { select: { attendances: true } },
          location: { select: { name: true } },
          class: { select: { id: true, name: true } },
          session_classes: {
            select: {
              class: { select: { id: true, name: true } },
            },
          },
        },
      });

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
        ${user.role === 'ADMIN' ? Prisma.sql`JOIN "Session" s ON s.id = a.session_id` : Prisma.empty}
        WHERE a.check_in_time >= ${startUtc}
          AND a.check_in_time < ${endUtc}
          ${
            user.role === 'ADMIN'
              ? Prisma.sql`AND (
                  EXISTS (SELECT 1 FROM "Class" c WHERE c.id = s.class_id AND c.lecturer_id = ${user.id})
                  OR EXISTS (
                    SELECT 1
                    FROM "SessionClass" sc
                    JOIN "Class" c2 ON c2.id = sc.class_id
                    WHERE sc.session_id = s.id AND c2.lecturer_id = ${user.id}
                  )
                )`
              : Prisma.empty
          }
        GROUP BY 1
        ORDER BY 1
      `);

      const chartData = fillChartData({ rangeDays, now: new Date(), rows });

      res.status(200).json({
        success: true,
        data: {
          stats: {
            total_users: totalUsers,
            total_sessions: totalSessions,
            today_present: present,
            today_late: late,
          },
          recent_sessions: recentSessions,
          chart_data: chartData,
        },
      });
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
