import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = (req as any).user.id;
    const { name, phone, current_password, new_password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: user_id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const updateData: any = { name, phone };

    if (new_password) {
      if (!current_password) {
        res.status(400).json({ success: false, error: 'Current password is required to set a new password' });
        return;
      }
      
      const isPasswordValid = await bcrypt.compare(current_password, user.password);
      if (!isPasswordValid) {
        res.status(400).json({ success: false, error: 'Current password is incorrect' });
        return;
      }

      updateData.password = await bcrypt.hash(new_password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user_id },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, role: true }
    });

    res.status(200).json({ success: true, data: updatedUser, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Manajemen Fakultas dan Prodi
export const getDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    const facultySetting = await prisma.setting.findUnique({ where: { key: 'FACULTIES_AND_DEPARTMENTS' } });
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
    
    await prisma.setting.upsert({
      where: { key: 'FACULTIES_AND_DEPARTMENTS' },
      update: { value: JSON.stringify(data), updated_by: user.id },
      create: { key: 'FACULTIES_AND_DEPARTMENTS', value: JSON.stringify(data), updated_by: user.id }
    });

    res.status(200).json({ success: true, message: 'Fakultas dan Program Studi berhasil diperbarui' });
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
    
    await prisma.setting.upsert({
      where: { key: 'SUBJECTS' },
      update: { value: JSON.stringify(data), updated_by: user.id },
      create: { key: 'SUBJECTS', value: JSON.stringify(data), updated_by: user.id }
    });

    res.status(200).json({ success: true, message: 'Mata Kuliah berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating subjects:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};