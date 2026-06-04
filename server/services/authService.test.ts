import { beforeEach, describe, expect, test, vi } from 'vitest';
import crypto from 'crypto';

const jwtMock = vi.hoisted(() => ({
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

const userRepositoryMock = vi.hoisted(() => ({
  findById: vi.fn(),
  updateUser: vi.fn(),
  findByEmail: vi.fn(),
}));

vi.mock('../utils/jwt.js', () => jwtMock);
vi.mock('../repositories/userRepository.js', () => userRepositoryMock);

import { logout, refresh } from './authService';

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

describe('authService refresh token hash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('refresh rotates hash and rejects old refresh token afterwards', async () => {
    const oldToken = 'old-refresh-token';
    const newToken = 'new-refresh-token';

    jwtMock.verifyRefreshToken.mockReturnValue({ id: 'user-1', role: 'USER' });
    jwtMock.generateAccessToken.mockReturnValue('new-access-token');
    jwtMock.generateRefreshToken.mockReturnValue(newToken);

    userRepositoryMock.findById
      .mockResolvedValueOnce({
        id: 'user-1',
        role: 'USER',
        is_active: true,
        refresh_token_hash: sha256(oldToken),
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        role: 'USER',
        is_active: true,
        refresh_token_hash: sha256(newToken),
      });

    userRepositoryMock.updateUser.mockResolvedValue({ id: 'user-1' });

    const first = await refresh({ refreshToken: oldToken });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.data.accessToken).toBe('new-access-token');
      expect(first.data.refreshToken).toBe(newToken);
    }
    expect(userRepositoryMock.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        data: { refresh_token_hash: sha256(newToken) },
      })
    );

    const second = await refresh({ refreshToken: oldToken });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.status).toBe(401);
      expect(second.body).toEqual(
        expect.objectContaining({
          success: false,
          error_code: 'INVALID_REFRESH_TOKEN',
        })
      );
    }
  });

  test('logout clears refresh token hash', async () => {
    jwtMock.verifyRefreshToken.mockReturnValue({ id: 'user-1', role: 'USER' });
    userRepositoryMock.updateUser.mockResolvedValue({ id: 'user-1' });

    const result = await logout({ refreshToken: 'refresh-token' });
    expect(result.ok).toBe(true);
    expect(userRepositoryMock.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        data: { refresh_token_hash: null },
      })
    );
  });

  test('logout ignores invalid refresh token', async () => {
    jwtMock.verifyRefreshToken.mockImplementation(() => {
      throw new Error('invalid token');
    });

    const result = await logout({ refreshToken: 'bad-token' });
    expect(result.ok).toBe(true);
    expect(userRepositoryMock.updateUser).not.toHaveBeenCalled();
  });
});
