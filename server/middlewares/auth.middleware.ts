import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import type { AuthRequest } from '../types/index.js';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const bypass =
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
    (process.env.DEV_BYPASS_AUTH === 'true' || process.env.DEV_BYPASS_AUTH === '1');
  if (bypass) {
    req.user = {
      id: process.env.DEV_BYPASS_USER_ID || 'dev-preview',
      role: process.env.DEV_BYPASS_ROLE || 'SUPER_ADMIN',
    };
    next();
    return;
  }

  // Read token from cookies first, fallback to Authorization header
  let token = req.cookies.accessToken;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
    return;
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const bypass =
      (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
      (process.env.DEV_BYPASS_AUTH === 'true' || process.env.DEV_BYPASS_AUTH === '1');
    if (bypass) {
      next();
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized: No user found' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};
