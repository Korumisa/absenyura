import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { sendForbidden } from '../utils/errorResponse.js';

export const getLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { created_at: 'desc' },
    });

    // Parse wifi_bssid from JSON string back to array/object for the client
    const formattedLocations = locations.map((loc) => ({
      ...loc,
      wifi_bssid: loc.wifi_bssid ? JSON.parse(loc.wifi_bssid as string) : [],
    }));

    res.status(200).json({ success: true, data: formattedLocations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address, latitude, longitude, radius, wifi_bssid } = req.body;

    // Auth middleware ensures req.user exists
    const user_id = (req as any).user.id;
    const ip_address = req.ip;

    const location = await prisma.$transaction(async (tx) => {
      const loc = await tx.location.create({
        data: {
          name,
          address,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseInt(radius, 10) || 100,
          wifi_bssid: wifi_bssid ? JSON.stringify(wifi_bssid) : '[]',
          created_by: user_id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE_LOCATION',
          target_table: 'location',
          target_id: loc.id,
          actor_id: user_id,
          ip_address,
          old_value: null,
          new_value: JSON.stringify({ name, address, latitude, longitude, radius, wifi_bssid }),
        },
      });

      return loc;
    });

    res.status(201).json({
      success: true,
      data: {
        ...location,
        wifi_bssid: JSON.parse(location.wifi_bssid as string),
      },
    });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, address, latitude, longitude, radius, wifi_bssid } = req.body;
    const user = (req as any).user;
    if (user?.role === 'ADMIN') {
      const existing = await prisma.location.findUnique({
        where: { id },
        select: { created_by: true },
      });
      if (!existing) {
        res.status(404).json({ success: false, error: 'Location not found' });
        return;
      }
      if (existing.created_by !== user.id) {
        sendForbidden(res, {
          error_code: 'LOCATION_OUT_OF_SCOPE',
          message: 'Lokasi ini di luar akses Anda.',
        });
        return;
      }
    }

    const location = await prisma.$transaction(async (tx) => {
      const oldLoc = await tx.location.findUnique({ where: { id } });
      if (!oldLoc) throw new Error('Location not found');

      const loc = await tx.location.update({
        where: { id },
        data: {
          name,
          address,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseInt(radius, 10),
          wifi_bssid: wifi_bssid ? JSON.stringify(wifi_bssid) : '[]',
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_LOCATION',
          target_table: 'location',
          target_id: loc.id,
          actor_id: user.id,
          ip_address: req.ip,
          old_value: JSON.stringify(oldLoc),
          new_value: JSON.stringify({ name, address, latitude, longitude, radius, wifi_bssid }),
        },
      });

      return loc;
    });

    res.status(200).json({
      success: true,
      data: {
        ...location,
        wifi_bssid: JSON.parse(location.wifi_bssid as string),
      },
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    if (user?.role === 'ADMIN') {
      const existing = await prisma.location.findUnique({
        where: { id },
        select: { created_by: true },
      });
      if (!existing) {
        res.status(404).json({ success: false, error: 'Location not found' });
        return;
      }
      if (existing.created_by !== user.id) {
        sendForbidden(res, {
          error_code: 'LOCATION_OUT_OF_SCOPE',
          message: 'Lokasi ini di luar akses Anda.',
        });
        return;
      }
    }

    await prisma.$transaction(async (tx) => {
      const oldLoc = await tx.location.findUnique({ where: { id } });
      if (!oldLoc) throw new Error('Location not found');

      await tx.location.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          action: 'DELETE_LOCATION',
          target_table: 'location',
          target_id: id,
          actor_id: user.id,
          ip_address: req.ip,
          old_value: JSON.stringify(oldLoc),
          new_value: null,
        },
      });
    });

    res.status(200).json({ success: true, message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
