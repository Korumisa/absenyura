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
  rotateRefreshTokenHash: vi.fn(),
}));

vi.mock('../utils/jwt.js', () => jwtMock);
vi.mock('../repositories/userRepository.js', () => userRepositoryMock);
vi.mock('../utils/security.js', () => ({
  safeCompare: (a: string, b: string) => a === b,
}));

import { logout, refresh } from './authService';
import { REFRESH_GRACE_MS } from './authService'; // import constant for test consistency

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

describe('authService refresh token hash', () => {
  beforeEach(() => {
    vi.resetAllMocks(); // This completely resets all mocks!
    vi.useRealTimers();
  });

  test('refresh rotates hash and rejects old refresh token after grace period', async () => {
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
        previous_refresh_token_hash: null,
        previous_refresh_rotated_at: null,
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        role: 'USER',
        is_active: true,
        refresh_token_hash: sha256(newToken),
        previous_refresh_token_hash: sha256(oldToken),
        previous_refresh_rotated_at: new Date(Date.now()),
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        role: 'USER',
        is_active: true,
        refresh_token_hash: sha256(newToken),
        previous_refresh_token_hash: sha256(oldToken),
        previous_refresh_rotated_at: new Date(Date.now() - REFRESH_GRACE_MS - 1000),
      });

    userRepositoryMock.rotateRefreshTokenHash.mockResolvedValue({ rotated: true });

    vi.useFakeTimers();
    const originalNow = Date.now;
    Date.now = vi.fn(() => originalNow());

    // First call: rotate tokens
    const first = await refresh({ refreshToken: oldToken });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.data.accessToken).toBe('new-access-token');
      expect(first.data.refreshToken).toBe(newToken);
    }
    expect(userRepositoryMock.rotateRefreshTokenHash).toHaveBeenCalledTimes(1);

    // Advance past the 60-second grace period (REFRESH_GRACE_MS)
    vi.advanceTimersByTime(REFRESH_GRACE_MS + 5000);
    (Date.now as any).mockReturnValue(originalNow() + REFRESH_GRACE_MS + 5000);

    const third = await refresh({ refreshToken: oldToken });
    expect(third.ok).toBe(false);
    if (!third.ok) {
      expect(third.status).toBe(401);
      expect(third.body).toEqual(
        expect.objectContaining({
          success: false,
          error_code: 'INVALID_REFRESH_TOKEN',
        })
      );
    }
    Date.now = originalNow;
    vi.useRealTimers();
  });

  test('refresh accepts old refresh token during grace period and returns without rotating', async () => {
    const oldToken = 'old-refresh-token';
    const newToken = 'new-refresh-token';

    jwtMock.verifyRefreshToken.mockReturnValue({ id: 'user-1', role: 'USER' });
    jwtMock.generateAccessToken
      .mockReturnValueOnce('new-access-token')
      .mockReturnValueOnce('second-access-token');
    jwtMock.generateRefreshToken.mockReturnValue(newToken);

    const now = Date.now();
    userRepositoryMock.findById
      .mockResolvedValueOnce({
        id: 'user-1',
        role: 'USER',
        is_active: true,
        refresh_token_hash: sha256(oldToken),
        previous_refresh_token_hash: null,
        previous_refresh_rotated_at: null,
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        role: 'USER',
        is_active: true,
        refresh_token_hash: sha256(newToken),
        previous_refresh_token_hash: sha256(oldToken),
        previous_refresh_rotated_at: new Date(now),
      });

    userRepositoryMock.rotateRefreshTokenHash.mockResolvedValue({ rotated: true });

    vi.useFakeTimers();
    const originalNow = Date.now;
    Date.now = vi.fn(() => now);

    // First call: rotate
    const first = await refresh({ refreshToken: oldToken });
    expect(first.ok).toBe(true);
    expect(userRepositoryMock.rotateRefreshTokenHash).toHaveBeenCalledTimes(1);

    // Still in grace period (only 30 seconds passed)
    Date.now = vi.fn(() => now + 30_000);

    // Second call with old token
    const second = await refresh({ refreshToken: oldToken });
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.data.accessToken).toBe('second-access-token');
      expect(second.data.refreshToken).toBe(oldToken); // should not rotate, return old token
    }
    expect(userRepositoryMock.rotateRefreshTokenHash).toHaveBeenCalledTimes(1); // rotateRefreshTokenHash should not be called a second time

    Date.now = originalNow;
    vi.useRealTimers();
  });

  test('logout clears refresh token hash', async () => {
    jwtMock.verifyRefreshToken.mockReturnValue({ id: 'user-1', role: 'USER' });
    userRepositoryMock.updateUser.mockResolvedValue({ id: 'user-1' });

    const result = await logout({ refreshToken: 'refresh-token' });
    expect(result.ok).toBe(true);
    expect(userRepositoryMock.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        data: {
          refresh_token_hash: null,
          previous_refresh_token_hash: null,
          previous_refresh_rotated_at: null,
        },
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
