import jwt from 'jsonwebtoken';

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in production');
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_fallback_refresh_secret';

export const generateAccessToken = (userId: string, role: string) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: string, role: string) => {
  return jwt.sign({ id: userId, role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as { id: string; role: string; iat: number; exp: number };
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { id: string; role: string; iat: number; exp: number };
};
