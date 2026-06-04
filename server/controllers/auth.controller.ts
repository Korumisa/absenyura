import { Request, Response } from 'express';
import { sendInternalServerError } from '../utils/errorResponse.js';
import crypto from 'crypto';
import * as authService from '../services/authService.js';

function setCsrfCookie(res: Response, isProduction: boolean): void {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('csrfToken', token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.login({
      email: req.body?.email,
      password: req.body?.password,
      device_fingerprint: req.body?.device_fingerprint,
    });

    if (!result.ok) {
      res.status(result.status).json(result.body);
      return;
    }

    const { accessToken, refreshToken, user } = result.data;

    const isProduction = process.env.NODE_ENV === 'production';

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
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

    setCsrfCookie(res, isProduction);

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    sendInternalServerError(res, error);
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.refresh({ refreshToken: req.cookies?.refreshToken });

    if (!result.ok) {
      res.status(result.status).json(result.body);
      return;
    }

    const newAccessToken = result.data.accessToken;
    const newRefreshToken = result.data.refreshToken;

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
    };

    res.cookie('accessToken', newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    setCsrfCookie(res, isProduction);

    res.status(200).json({
      success: true,
      data: {
        message: 'Sesi diperbarui.',
      },
    });
  } catch (error: any) {
    console.error('Refresh error:', error);
    sendInternalServerError(res, error);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  await authService.logout({ refreshToken: req.cookies?.refreshToken });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  };
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.clearCookie('csrfToken', {
    httpOnly: false,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// Seed endpoint for initial SUPER_ADMIN
export const seedAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.seedAdmin({
      nodeEnv: process.env.NODE_ENV,
      incomingSeedSecret: req.headers['x-seed-secret'],
      expectedSeedSecret: process.env.SEED_SECRET,
      seedEmail: process.env.SEED_SUPER_ADMIN_EMAIL,
      seedPassword: process.env.SEED_SUPER_ADMIN_PASSWORD,
      seedName: process.env.SEED_SUPER_ADMIN_NAME,
    });

    if (!result.ok) {
      res.status(result.status).json(result.body);
      return;
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error: any) {
    console.error('Seed error:', error);
    sendInternalServerError(res, error);
  }
};

export const flushDb = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.flushDb({
      nodeEnv: process.env.NODE_ENV,
      incomingSeedSecret: req.headers['x-seed-secret'],
      expectedSeedSecret: process.env.SEED_SECRET,
    });

    if (!result.ok) {
      res.status(result.status).json(result.body);
      return;
    }

    res.status(200).json({ success: true, message: result.data.message });
  } catch (error: any) {
    console.error('Flush DB error:', error);
    sendInternalServerError(res, error);
  }
};
