import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary if ENV vars exist
if (process.env.CLOUDINARY_URL) {
  // Automatically uses CLOUDINARY_URL
}

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
    if (file && file.buffer) {
      if (process.env.CLOUDINARY_URL) {
        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${b64}`;
        try {
          const result = await cloudinary.uploader.upload(dataURI, { folder: 'excuses' });
          proof_url = result.secure_url;
        } catch (err) {
          console.error('Cloudinary Upload Error:', err);
          res.status(500).json({ success: false, error: 'Gagal mengunggah dokumen bukti' });
          return;
        }
      } else {
        const uploadDir = path.join(process.cwd(), 'uploads', 'excuses');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filename = file.fieldname + '-' + uniqueSuffix + '-' + file.originalname;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, file.buffer);
        proof_url = `/uploads/excuses/${filename}`;
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
        session: { select: { title: true, session_start: true, class: { select: { name: true } }, created_by_id: true } }
      }
    });

    // Notify creator
    const userDetails = await prisma.user.findUnique({ where: { id: user_id }, select: { name: true } });
    if (newExcuse.session.created_by_id) {
      await prisma.notification.create({
        data: {
          user_id: newExcuse.session.created_by_id,
          title: 'Pengajuan Izin Baru',
          message: `Mahasiswa ${userDetails?.name || ''} mengajukan izin untuk sesi "${newExcuse.session.title}".`,
          type: 'INFO'
        }
      });
    }

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

    // Send notification to student
    const sessionDetails = await prisma.session.findUnique({ where: { id: excuse.session_id }, select: { title: true } });
    await prisma.notification.create({
      data: {
        user_id: excuse.user_id,
        title: `Pengajuan Izin ${status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}`,
        message: `Pengajuan izin Anda untuk sesi "${sessionDetails?.title || 'Tidak diketahui'}" telah ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}.`,
        type: status === 'APPROVED' ? 'SUCCESS' : 'WARNING'
      }
    });

    res.status(200).json({ success: true, data: updatedExcuse });
  } catch (error) {
    console.error('Error reviewing excuse:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};