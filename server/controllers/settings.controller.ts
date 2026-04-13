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