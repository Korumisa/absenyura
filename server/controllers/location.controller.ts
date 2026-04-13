import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { created_at: 'desc' },
    });
    
    // Parse wifi_bssid from JSON string back to array/object for the client
    const formattedLocations = locations.map(loc => ({
      ...loc,
      wifi_bssid: loc.wifi_bssid ? JSON.parse(loc.wifi_bssid as string) : []
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

    const location = await prisma.location.create({
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

    res.status(201).json({ 
      success: true, 
      data: {
        ...location,
        wifi_bssid: JSON.parse(location.wifi_bssid as string)
      }
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

    const location = await prisma.location.update({
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

    res.status(200).json({ 
      success: true, 
      data: {
        ...location,
        wifi_bssid: JSON.parse(location.wifi_bssid as string)
      } 
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.location.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};