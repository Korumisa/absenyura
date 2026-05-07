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

    const user = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { email },
          { nim_nip: email }
        ]
      } 
    });
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
      if (user.device_fingerprint) {
        // Compare base fingerprints (ignoring the [OFFLINE_SYNC] tag)
        const storedDevice = user.device_fingerprint.replace(' [OFFLINE_SYNC]', '');
        const incomingDevice = device_fingerprint.replace(' [OFFLINE_SYNC]', '');
        
        if (storedDevice !== incomingDevice) {
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
        }
      } else {
        // Bind device on first login
        await prisma.user.update({
          where: { id: user.id },
          data: { device_fingerprint },
        });
      }
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    const isProduction = process.env.NODE_ENV === 'production';

    // Set cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Vercel is always HTTPS, so this MUST be true in production
      sameSite: 'none' as const, // Must be 'none' for cross-origin (frontend vercel to backend vercel)
    };

    // Send access token as HttpOnly cookie
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Send refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      data: {
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
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      details: error?.message || String(error)
    });
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

    const isProduction = process.env.NODE_ENV === 'production';

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
    };

    res.cookie('accessToken', newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Tokens refreshed successfully',
      },
    });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
  };
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
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

    const email = process.env.SEED_SUPER_ADMIN_EMAIL;
    const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
    if (!email || !password) {
      res.status(500).json({ success: false, error: 'Seeder env belum diatur' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({
      data: {
        name: process.env.SEED_SUPER_ADMIN_NAME || 'Super Admin',
        email,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
      },
    });

    res.status(201).json({ success: true, data: admin });
  } catch (error: any) {
    console.error('Seed error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error?.message || String(error)
    });
  }
};

export const flushDb = async (req: Request, res: Response): Promise<void> => {
  try {
    const seedSecret = req.headers['x-seed-secret'];
    if (!seedSecret || seedSecret !== process.env.SEED_SECRET) {
      res.status(403).json({ success: false, error: 'Unauthorized to flush database' });
      return;
    }

    // We must delete in correct order due to foreign key constraints
    await prisma.$transaction([
      prisma.publicGalleryItem.deleteMany(),
      prisma.publicGalleryAlbum.deleteMany(),
      prisma.publicRecruitmentCommittee.deleteMany(),
      prisma.publicRecruitment.deleteMany(),
      prisma.publicPost.deleteMany(),
      prisma.publicCategory.deleteMany(),
      prisma.publicStructureMember.deleteMany(),
      prisma.publicStructureGroup.deleteMany(),
      prisma.publicProgram.deleteMany(),
      prisma.publicSiteProfile.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.excuseRequest.deleteMany(),
      prisma.attendance.deleteMany(),
      prisma.classEnrollment.deleteMany(),
      prisma.session.deleteMany(),
      prisma.class.deleteMany(),
      prisma.location.deleteMany(),
      // We intentionally do NOT delete users and global settings
    ]);

    res.status(200).json({ success: true, message: 'Database flushed successfully. All transaction data removed except User accounts.' });
  } catch (error: any) {
    console.error('Flush DB error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during DB flush',
      details: error?.message || String(error)
    });
  }
};
