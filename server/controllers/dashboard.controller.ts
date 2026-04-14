import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    if (user.role === 'USER') {
      // User specific stats
      const myAttendances = await prisma.attendance.findMany({
        where: { user_id: user.id },
      });

      const total = myAttendances.length;
      const present = myAttendances.filter(a => a.status === 'PRESENT').length;
      const late = myAttendances.filter(a => a.status === 'LATE').length;
      const absent = myAttendances.filter(a => a.status === 'ABSENT').length;
      
      const sick = myAttendances.filter(a => a.status === 'SICK').length;
      const excused = myAttendances.filter(a => a.status === 'EXCUSED').length;
      
      const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      // Upcoming sessions for enrolled classes
      const upcomingSessions = await prisma.session.findMany({
        where: {
          status: { in: ['UPCOMING', 'ACTIVE'] },
          OR: [
            { class_id: null },
            { class: { enrollments: { some: { student_id: user.id } } } }
          ]
        },
        orderBy: { session_start: 'asc' },
        take: 5,
        include: { 
          location: { select: { name: true } }, 
          class: { select: { name: true } },
          attendances: { where: { user_id: user.id } }
        }
      });

      const range = parseInt((req.query.range as string) || '7', 10);
      const chartData = [];
      for (let i = range - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
        
        const dailyAttendances = await prisma.attendance.findMany({
          where: {
            check_in_time: { gte: dayStart, lte: dayEnd },
            user_id: user.id
          },
          select: { status: true }
        });
        
        const count = dailyAttendances.length;
        const present = dailyAttendances.filter(a => a.status === 'PRESENT').length;
        const late = dailyAttendances.filter(a => a.status === 'LATE').length;
        const absent = dailyAttendances.filter(a => a.status === 'ABSENT').length;
        const sick = dailyAttendances.filter(a => a.status === 'SICK').length;
        const excused = dailyAttendances.filter(a => a.status === 'EXCUSED').length;

        chartData.push({ date: dateStr, count, present, late, absent, sick, excused });
      }

      res.status(200).json({
        success: true,
        data: {
          stats: { total, present, late, absent, sick, excused, percentage },
          recent_sessions: upcomingSessions,
          chart_data: chartData
        }
      });
    } else {
      // Admin / Super Admin stats
      const totalUsers = await prisma.user.count({ where: { role: 'USER' } });
      const totalSessions = await prisma.session.count(
        user.role === 'ADMIN' ? { where: { created_by_id: user.id } } : undefined
      );

      // Get attendance count for today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayAttendances = await prisma.attendance.findMany({
        where: {
          check_in_time: { gte: startOfDay, lte: endOfDay },
          session: user.role === 'ADMIN' ? { created_by_id: user.id } : undefined
        },
      });

      const present = todayAttendances.filter(a => a.status === 'PRESENT').length;
      const late = todayAttendances.filter(a => a.status === 'LATE').length;

      // Recent sessions
      const recentSessions = await prisma.session.findMany({
        where: user.role === 'ADMIN' ? { created_by_id: user.id } : undefined,
        orderBy: { created_at: 'desc' },
        take: 5,
        include: {
          _count: { select: { attendances: true } },
          location: { select: { name: true } }
        }
      });

      // Chart data based on requested range (default 7 days)
      const range = parseInt((req.query.range as string) || '7', 10);
      const chartData = [];
      for (let i = range - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // Count for that day
        const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
        
        const dailyAttendances = await prisma.attendance.findMany({
          where: {
            check_in_time: { gte: dayStart, lte: dayEnd },
            session: user.role === 'ADMIN' ? { created_by_id: user.id } : undefined
          },
          select: { status: true }
        });
        
        const count = dailyAttendances.length;
        const present = dailyAttendances.filter(a => a.status === 'PRESENT').length;
        const late = dailyAttendances.filter(a => a.status === 'LATE').length;
        const absent = dailyAttendances.filter(a => a.status === 'ABSENT').length;
        const sick = dailyAttendances.filter(a => a.status === 'SICK').length;
        const excused = dailyAttendances.filter(a => a.status === 'EXCUSED').length;

        chartData.push({ date: dateStr, count, present, late, absent, sick, excused });
      }

      res.status(200).json({
        success: true,
        data: {
          stats: {
            total_users: totalUsers,
            total_sessions: totalSessions,
            today_present: present,
            today_late: late
          },
          recent_sessions: recentSessions,
          chart_data: chartData
        }
      });
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};