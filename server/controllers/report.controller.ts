import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    let whereClause: any = {};
    if (user.role === 'USER') {
      whereClause = { user_id: user.id };
    } else if (user.role === 'ADMIN') {
      whereClause = { session: { created_by_id: user.id } };
    }

    if (startDate && endDate) {
      whereClause.session = {
        ...whereClause.session,
        session_start: {
          gte: new Date(startDate),
          lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
        }
      };
    }


    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where: whereClause,
        include: {
          session: { select: { title: true, session_start: true, class: { select: { name: true } } } },
          user: { select: { name: true, nim_nip: true } }
        },
        orderBy: { check_in_time: 'desc' },
        skip,
        take: limit
      }),
      prisma.attendance.count({ where: whereClause })
    ]);

    const formattedData = attendances.map(a => ({
      id: a.id,
      user_id: a.user_id,
      session_id: a.session_id,
      user_name: a.user.name,
      nim_nip: a.user.nim_nip,
      session_title: a.session.title,
      class_name: a.session.class?.name || null,
      session_date: a.session.session_start,
      check_in_time: a.check_in_time,
      status: a.status,
      ip: a.check_in_ip,
      device: a.check_in_device,
      photo_url: a.photo_url
    }));

    res.status(200).json({ 
      success: true, 
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};