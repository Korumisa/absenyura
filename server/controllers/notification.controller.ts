import { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import prisma from '../utils/prisma.js';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { user_id },
      orderBy: { created_at: 'desc' },
      take: 50, // Limit to recent 50
    });

    const unreadCount = await prisma.notification.count({
      where: { user_id, is_read: false },
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unread_count: unreadCount,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user_id = req.user!.id;

    await prisma.notification.update({
      where: { id, user_id },
      data: { is_read: true },
    });

    res.status(200).json({ success: true, message: 'Marked as read' });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Notifikasi tidak ditemukan' });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user!.id;

    await prisma.notification.updateMany({
      where: { user_id, is_read: false },
      data: { is_read: true },
    });

    res.status(200).json({ success: true, message: 'All marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
