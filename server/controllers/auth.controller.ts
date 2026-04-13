import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, device_fingerprint } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ success: false, error: 'Account is inactive' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    // One-device policy logic (enforce block on mismatch for non-admins)
    if (device_fingerprint && device_fingerprint !== 'unknown-device') {
      if (user.device_fingerprint && user.device_fingerprint !== device_fingerprint) {
        if (user.role === 'USER') {
          res.status(403).json({ 
            success: false, 
            error: 'Login ditolak: Akun ini sudah terikat dengan perangkat lain. Hubungi Admin jika Anda mengganti perangkat.' 
          });
          return;
        } else {
          // Admins can log in from multiple devices, just update the latest
          await prisma.user.update({
            where: { id: user.id },
            data: { device_fingerprint },
          });
        }
      } else if (!user.device_fingerprint) {
        // Bind device on first login
        await prisma.user.update({
          where: { id: user.id },
          data: { device_fingerprint },
        });
      }
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    // Send refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url,
          department: user.department,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ success: false, error: 'No refresh token provided' });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || !user.is_active) {
      res.status(401).json({ success: false, error: 'Invalid user or inactive account' });
      return;
    }

    const newAccessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id, user.role);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie('refreshToken');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// Seed endpoint for initial SUPER_ADMIN
export const seedAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const seedSecret = req.headers['x-seed-secret'];
    if (!seedSecret || seedSecret !== process.env.SEED_SECRET) {
      res.status(403).json({ success: false, error: 'Unauthorized to seed database' });
      return;
    }

    const count = await prisma.user.count();
    if (count > 0) {
      res.status(400).json({ success: false, error: 'Database already seeded' });
      return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'admin@system.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
      },
    });

    res.status(201).json({ success: true, data: admin });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};