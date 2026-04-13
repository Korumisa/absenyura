import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const overrideAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user.id;
    const { session_id, user_id, status, notes } = req.body;

    const session = await prisma.session.findUnique({ where: { id: session_id } });
    if (!session) {
      res.status(404).json({ success: false, error: 'Sesi tidak ditemukan' });
      return;
    }

    const attendance = await prisma.attendance.upsert({
      where: { session_id_user_id: { session_id, user_id } },
      update: {
        status,
        check_in_ip: 'MANUAL_OVERRIDE',
        check_in_device: `Override by Admin ${adminId} - ${notes || 'No notes'}`,
        check_in_time: new Date(),
      },
      create: {
        session_id,
        user_id,
        status,
        check_in_time: new Date(),
        check_in_ip: 'MANUAL_OVERRIDE',
        check_in_device: `Override by Admin ${adminId} - ${notes || 'No notes'}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        actor_id: adminId,
        action: 'OVERRIDE_ATTENDANCE',
        target_table: 'Attendance',
        target_id: attendance.id,
        new_value: JSON.stringify({ status, notes }),
        ip_address: (req as any).ip,
      },
    });

    res.status(200).json({
      success: true,
      data: attendance,
      message: 'Status kehadiran berhasil diubah (Override).',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal mengubah status kehadiran secara manual' });
  }
};