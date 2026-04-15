import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_please_change_in_production_123';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_please_change_in_production_456';

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn('WARNING: JWT_SECRET or JWT_REFRESH_SECRET is not set in environment variables. Using fallback secrets. This is not secure for production!');
}

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