import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getExcuses = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    let excuses;

    if (user.role === 'USER') {
      excuses = await prisma.excuseRequest.findMany({
        where: { user_id: user.id },
        include: {
          session: { select: { title: true, session_start: true, class: { select: { name: true } } } },
          reviewer: { select: { name: true } }
        },
        orderBy: { created_at: 'desc' }
      });
    } else if (user.role === 'ADMIN') {
      excuses = await prisma.excuseRequest.findMany({
        where: { session: { created_by_id: user.id } },
        include: {
          user: { select: { name: true, nim_nip: true } },
          session: { select: { title: true, session_start: true, class: { select: { name: true } } } },
          reviewer: { select: { name: true } }
        },
        orderBy: { created_at: 'desc' }
      });
    } else {
      // Super Admin
      excuses = await prisma.excuseRequest.findMany({
        include: {
          user: { select: { name: true, nim_nip: true } },
          session: { select: { title: true, session_start: true, class: { select: { name: true } } } },
          reviewer: { select: { name: true } }
        },
        orderBy: { created_at: 'desc' }
      });
    }

    res.status(200).json({ success: true, data: excuses });
  } catch (error) {
    console.error('Error fetching excuses:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createExcuse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { session_id, reason, description } = req.body;
    const user_id = (req as any).user.id;
    const file = req.file;

    // Check if session exists
    const session = await prisma.session.findUnique({ where: { id: session_id } });
    if (!session) {
      res.status(404).json({ success: false, error: 'Sesi tidak ditemukan' });
      return;
    }

    // Prevent duplicate pending excuses for the same session
    const existingExcuse = await prisma.excuseRequest.findFirst({
      where: { user_id, session_id }
    });

    if (existingExcuse) {
      res.status(400).json({ success: false, error: 'Anda sudah mengajukan izin untuk sesi ini' });
      return;
    }

    let proof_url = null;
    if (file) {
      if (process.env.VERCEL && file.buffer) {
        proof_url = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      } else {
        proof_url = `/uploads/${file.filename}`;
      }
    }

    const newExcuse = await prisma.excuseRequest.create({
      data: {
        user_id,
        session_id,
        reason,
        description,
        proof_url
      },
      include: {
        session: { select: { title: true, session_start: true, class: { select: { name: true } } } }
      }
    });

    res.status(201).json({ success: true, data: newExcuse });
  } catch (error) {
    console.error('Error creating excuse:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const reviewExcuse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body; // APPROVED or REJECTED
    const user_id = (req as any).user.id;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ success: false, error: 'Status tidak valid' });
      return;
    }

    const excuse = await prisma.excuseRequest.findUnique({ where: { id } });
    if (!excuse) {
      res.status(404).json({ success: false, error: 'Pengajuan izin tidak ditemukan' });
      return;
    }

    const updatedExcuse = await prisma.excuseRequest.update({
      where: { id },
      data: {
        status,
        reviewed_by: user_id,
        reviewed_at: new Date()
      }
    });

    // If approved, update or create attendance record as SICK or EXCUSED
    if (status === 'APPROVED') {
      const attendanceStatus = excuse.reason === 'SICK' ? 'SICK' : 'EXCUSED';
      
      const existingAttendance = await prisma.attendance.findUnique({
        where: { session_id_user_id: { session_id: excuse.session_id, user_id: excuse.user_id } }
      });

      if (existingAttendance) {
        await prisma.attendance.update({
          where: { id: existingAttendance.id },
          data: { status: attendanceStatus, manual_entry_note: excuse.description, manual_entry_by: user_id }
        });
      } else {
        await prisma.attendance.create({
          data: {
            session_id: excuse.session_id,
            user_id: excuse.user_id,
            status: attendanceStatus,
            check_in_time: new Date(),
            is_manual_entry: true,
            manual_entry_note: excuse.description,
            manual_entry_by: user_id
          }
        });
      }
    }

    res.status(200).json({ success: true, data: updatedExcuse });
  } catch (error) {
    console.error('Error reviewing excuse:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};