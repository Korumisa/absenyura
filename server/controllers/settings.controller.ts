import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = (req as any).user.id;
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = (req as any).user.id;
    const ip_address = req.ip;
    const { name, phone, email, current_password, new_password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: user_id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const updateData: any = { name, phone };

    if (email && email !== user.email) {
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(400).json({ success: false, error: 'Email sudah digunakan oleh pengguna lain' });
        return;
      }
      updateData.email = email;
    }

    if (new_password) {
      if (!current_password) {
        res
          .status(400)
          .json({ success: false, error: 'Current password is required to set a new password' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(current_password, user.password);
      if (!isPasswordValid) {
        res.status(400).json({ success: false, error: 'Current password is incorrect' });
        return;
      }

      updateData.password = await bcrypt.hash(new_password, 12);
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user_id },
        data: updateData,
        select: { id: true, name: true, email: true, phone: true, role: true },
      });

      const auditData = { ...updateData };
      delete auditData.password; // Don't log password

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_PROFILE',
          target_table: 'user',
          target_id: user_id,
          actor_id: user_id,
          ip_address,
          old_value: JSON.stringify({ name: user.name, phone: user.phone, email: user.email }),
          new_value: JSON.stringify(auditData),
        },
      });

      return updated;
    });

    res
      .status(200)
      .json({ success: true, data: updatedUser, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Manajemen Fakultas dan Prodi
export const getDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    const facultySetting = await prisma.setting.findUnique({
      where: { key: 'FACULTIES_AND_DEPARTMENTS' },
    });
    let data = [];
    if (facultySetting) {
      data = JSON.parse(facultySetting.value);
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (user.role !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const { data } = req.body;

    await prisma.$transaction(async (tx) => {
      const oldSetting = await tx.setting.findUnique({
        where: { key: 'FACULTIES_AND_DEPARTMENTS' },
      });

      await tx.setting.upsert({
        where: { key: 'FACULTIES_AND_DEPARTMENTS' },
        update: { value: JSON.stringify(data), updated_by: user.id },
        create: {
          key: 'FACULTIES_AND_DEPARTMENTS',
          value: JSON.stringify(data),
          updated_by: user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_SETTING',
          target_table: 'setting',
          target_id: 'FACULTIES_AND_DEPARTMENTS',
          actor_id: user.id,
          ip_address: req.ip,
          old_value: oldSetting ? oldSetting.value : null,
          new_value: JSON.stringify(data),
        },
      });
    });

    res
      .status(200)
      .json({ success: true, message: 'Fakultas dan Program Studi berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating departments:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Manajemen Mata Kuliah
export const getSubjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const subjectSetting = await prisma.setting.findUnique({ where: { key: 'SUBJECTS' } });
    let data = [];
    if (subjectSetting) {
      data = JSON.parse(subjectSetting.value);
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateSubjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (user.role !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const { data } = req.body;

    // Pastikan data tidak kosong atau undefined agar tidak merusak DB
    const validData = Array.isArray(data) ? data : [];

    await prisma.$transaction(async (tx) => {
      const oldSetting = await tx.setting.findUnique({ where: { key: 'SUBJECTS' } });

      await tx.setting.upsert({
        where: { key: 'SUBJECTS' },
        update: { value: JSON.stringify(validData), updated_by: user.id },
        create: { key: 'SUBJECTS', value: JSON.stringify(validData), updated_by: user.id },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_SETTING',
          target_table: 'setting',
          target_id: 'SUBJECTS',
          actor_id: user.id,
          ip_address: req.ip,
          old_value: oldSetting ? oldSetting.value : null,
          new_value: JSON.stringify(validData),
        },
      });
    });

    res.status(200).json({ success: true, message: 'Mata Kuliah berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating subjects:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
