import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    let attendances;
    
    if (user.role === 'USER') {
      attendances = await prisma.attendance.findMany({
        where: { user_id: user.id },
        include: {
          session: { select: { title: true, session_start: true, class: { select: { name: true } } } },
          user: { select: { name: true, nim_nip: true } }
        },
        orderBy: { check_in_time: 'desc' }
      });
    } else {
      attendances = await prisma.attendance.findMany({
        where: user.role === 'ADMIN' ? { session: { created_by_id: user.id } } : {},
        include: {
          session: { select: { title: true, session_start: true, class: { select: { name: true } } } },
          user: { select: { name: true, nim_nip: true } }
        },
        orderBy: { check_in_time: 'desc' }
      });
    }

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

    res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};