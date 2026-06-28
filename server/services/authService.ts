import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { safeCompare } from '../utils/security.js';
import * as maintenanceRepository from '../repositories/maintenanceRepository.js';
import * as userRepository from '../repositories/userRepository.js';

type ServiceFailure = { ok: false; status: number; body: unknown };
type ServiceSuccess<T> = { ok: true; data: T };
type ServiceResult<T> = ServiceFailure | ServiceSuccess<T>;

const authUserSelect = {
  id: true,
  name: true,
  email: true,
  password: true,
  role: true,
  avatar_url: true,
  department: true,
  is_active: true,
  device_fingerprint: true,
} as const;

type AuthUser = Awaited<ReturnType<typeof userRepository.findByNim<typeof authUserSelect>>>;
type AuthUserNonNull = Exclude<AuthUser, null>;

function normalizeDeviceFingerprint(raw: string): string {
  return raw.replace(' [OFFLINE_SYNC]', '');
}

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isValidSeedSecret(incoming: string, expected: string): boolean {
  if (!expected || expected.length < 32) return false;
  if (incoming.length !== expected.length) return false;
  return safeCompare(incoming, expected);
}

export async function login(params: {
  nim: unknown;
  password: unknown;
  device_fingerprint: unknown;
}): Promise<
  ServiceResult<{
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      avatar_url: string | null;
      department: string | null;
    };
    accessToken: string;
    refreshToken: string;
  }>
> {
  const nim = typeof params.nim === 'string' ? params.nim.trim() : '';
  const password = typeof params.password === 'string' ? params.password : '';
  const device_fingerprint =
    typeof params.device_fingerprint === 'string' ? params.device_fingerprint : undefined;

  if (!nim || !password) {
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        error_code: 'MISSING_CREDENTIALS',
        message: 'NIM dan kata sandi wajib diisi.',
      },
    };
  }

  const user = await userRepository.findByNim({
    nim,
    select: authUserSelect,
  });

  if (!user) {
    return {
      ok: false,
      status: 401,
      body: {
        success: false,
        error_code: 'INVALID_CREDENTIALS',
        message: 'NIM atau kata sandi salah.',
      },
    };
  }

  if (!user.is_active) {
    return {
      ok: false,
      status: 403,
      body: {
        success: false,
        error_code: 'ACCOUNT_INACTIVE',
        message: 'Akun Anda nonaktif. Hubungi admin.',
      },
    };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return {
      ok: false,
      status: 401,
      body: {
        success: false,
        error_code: 'INVALID_CREDENTIALS',
        message: 'NIM atau kata sandi salah.',
      },
    };
  }

  if (device_fingerprint && device_fingerprint !== 'unknown-device') {
    if (user.device_fingerprint) {
      const storedDevice = normalizeDeviceFingerprint(user.device_fingerprint);
      const incomingDevice = normalizeDeviceFingerprint(device_fingerprint);

      if (storedDevice !== incomingDevice) {
        if (user.role === 'USER') {
          return {
            ok: false,
            status: 403,
            body: {
              success: false,
              error_code: 'DEVICE_BOUND',
              message:
                'Login ditolak: akun ini sudah terikat dengan perangkat lain. Hubungi admin untuk reset perangkat.',
            },
          };
        }

        await userRepository.updateUser({
          id: user.id,
          data: { device_fingerprint },
          select: { id: true },
        });
      }
    } else {
      await userRepository.updateUser({
        id: user.id,
        data: { device_fingerprint },
        select: { id: true },
      });
    }
  }

  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id, user.role);
  await userRepository.updateUser({
    id: user.id,
    data: { refresh_token_hash: hashRefreshToken(refreshToken) },
    select: { id: true },
  });

  return {
    ok: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url ?? null,
        department: user.department ?? null,
      },
      accessToken,
      refreshToken,
    },
  };
}

// Grace period (in ms) to accept a recently-rotated refresh token.
// This covers the SEQUENTIAL case: a request arrives shortly after a prior
// rotation already completed and presents the now-superseded token (e.g. a
// queued request, a slightly-stale client tab). It does NOT, by itself,
// make concurrent rotation safe — see rotateRefreshTokenHash() / the CAS
// retry path below for that.
export const REFRESH_GRACE_MS = 60_000; // 60 seconds

function isWithinGrace(row: {
  previous_refresh_token_hash: string | null;
  previous_refresh_rotated_at: Date | null;
}): boolean {
  if (!row.previous_refresh_token_hash || !row.previous_refresh_rotated_at) return false;
  return Date.now() - row.previous_refresh_rotated_at.getTime() < REFRESH_GRACE_MS;
}

export async function refresh(params: {
  refreshToken: unknown;
}): Promise<ServiceResult<{ accessToken: string; refreshToken: string }>> {
  const refreshToken = typeof params.refreshToken === 'string' ? params.refreshToken : '';
  if (!refreshToken) {
    return {
      ok: false,
      status: 401,
      body: {
        success: false,
        error_code: 'NO_REFRESH_TOKEN',
        message: 'Sesi login habis. Silakan login ulang.',
      },
    };
  }

  let decoded: { id: string; role: string };
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    return {
      ok: false,
      status: 401,
      body: {
        success: false,
        error_code: 'INVALID_REFRESH_TOKEN',
        message: 'Sesi login habis. Silakan login ulang.',
      },
    };
  }

  const user = await userRepository.findById({
    id: decoded.id,
    select: {
      id: true,
      role: true,
      is_active: true,
      refresh_token_hash: true,
      previous_refresh_token_hash: true,
      previous_refresh_rotated_at: true,
    },
  });

  if (!user || !user.is_active) {
    return {
      ok: false,
      status: 401,
      body: {
        success: false,
        error_code: 'INVALID_USER',
        message: 'Sesi tidak valid. Silakan login ulang.',
      },
    };
  }

  const presentedHash = hashRefreshToken(refreshToken);
  const matchesCurrent = Boolean(
    user.refresh_token_hash && safeCompare(user.refresh_token_hash, presentedHash)
  );

  if (!matchesCurrent) {
    // Sequential grace case: not the current token, but it matches the
    // most recently rotated-out one and we're still inside the window.
    const matchesGrace =
      isWithinGrace(user) && safeCompare(user.previous_refresh_token_hash as string, presentedHash);

    if (!matchesGrace) {
      return {
        ok: false,
        status: 401,
        body: {
          success: false,
          error_code: 'INVALID_REFRESH_TOKEN',
          message: 'Sesi login habis. Silakan login ulang.',
        },
      };
    }

    // Don't rotate again — just hand back a fresh access token and the same
    // refresh token the client already has, so it keeps matching "previous"
    // until it naturally picks up the real current token via a later call.
    const currentAccessToken = generateAccessToken(user.id, user.role);
    return { ok: true, data: { accessToken: currentAccessToken, refreshToken } };
  }

  // Normal rotation path. Generate the new pair first, then attempt an
  // atomic compare-and-swap write: only succeeds if `refresh_token_hash`
  // is still exactly what we read above.
  //
  // Why this matters: if two requests both present the SAME current token
  // (e.g. two in-flight calls that both got a 401 and both raced to
  // refresh), a plain `update` would let both writes land, and whichever
  // lands second silently discards the first response's tokens — that
  // client is left holding a refreshToken the DB no longer recognizes as
  // current OR previous, which is an immediate, unrecoverable lockout
  // (not just a grace-window edge case). The CAS prevents that: only one
  // write can win.
  const newAccessToken = generateAccessToken(user.id, user.role);
  const newRefreshToken = generateRefreshToken(user.id, user.role);
  const rotatedAt = new Date();

  const { rotated } = await userRepository.rotateRefreshTokenHash({
    id: user.id,
    expectedCurrentHash: user.refresh_token_hash as string,
    newHash: hashRefreshToken(newRefreshToken),
    previousHash: presentedHash,
    previousRotatedAt: rotatedAt,
  });

  if (rotated) {
    return { ok: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } };
  }

  // Lost the CAS race: another request already rotated this exact same
  // current token first. Both requests presented identical input, so the
  // winner's write set `previous_refresh_token_hash` to this same
  // presentedHash — re-read and fall back to the grace path instead of
  // handing back newRefreshToken, which the DB never actually recorded.
  const latest = await userRepository.findById({
    id: user.id,
    select: { previous_refresh_token_hash: true, previous_refresh_rotated_at: true },
  });

  if (
    latest &&
    isWithinGrace(latest) &&
    safeCompare(latest.previous_refresh_token_hash as string, presentedHash)
  ) {
    return { ok: true, data: { accessToken: newAccessToken, refreshToken } };
  }

  // Shouldn't normally happen (would mean a third actor — e.g. a concurrent
  // logout — changed state between our read and the CAS attempt), but fail
  // closed rather than guessing.
  return {
    ok: false,
    status: 401,
    body: {
      success: false,
      error_code: 'INVALID_REFRESH_TOKEN',
      message: 'Sesi login habis. Silakan login ulang.',
    },
  };
}

export async function logout(params: { refreshToken: unknown }): Promise<ServiceResult<null>> {
  const refreshToken = typeof params.refreshToken === 'string' ? params.refreshToken : '';
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      // Clear current AND grace-period state. Leaving previous_* set would
      // let a token rotated out shortly before logout remain usable via the
      // grace path for up to REFRESH_GRACE_MS after the user logged out.
      await userRepository.updateUser({
        id: decoded.id,
        data: {
          refresh_token_hash: null,
          previous_refresh_token_hash: null,
          previous_refresh_rotated_at: null,
        },
        select: { id: true },
      });
    } catch {
      // ignore invalid token on logout
    }
  }
  return { ok: true, data: null };
}

export async function seedAdmin(params: {
  nodeEnv: string | undefined;
  incomingSeedSecret: unknown;
  expectedSeedSecret: string | undefined;
  seedEmail: string | undefined;
  seedPassword: string | undefined;
  seedName: string | undefined;
  seedNimNip: string | undefined;
}): Promise<
  ServiceResult<{
    id: string;
    name: string;
    email: string;
    password: string;
    role: string;
    avatar_url: string | null;
    nim_nip: string | null;
    department: string | null;
    phone: string | null;
    is_active: boolean;
    semester: number;
    enrollment_date: Date;
    device_fingerprint: string | null;
    created_at: Date;
    updated_at: Date;
  }>
> {
  if (params.nodeEnv === 'production') {
    return { ok: false, status: 404, body: { success: false, error: 'Not found' } };
  }

  const incoming = typeof params.incomingSeedSecret === 'string' ? params.incomingSeedSecret : '';
  const expected = params.expectedSeedSecret ?? '';
  if (!isValidSeedSecret(incoming, expected)) {
    return {
      ok: false,
      status: 403,
      body: { success: false, error: 'Unauthorized to seed database' },
    };
  }

  const count = await maintenanceRepository.countUsers();
  if (count > 0) {
    return {
      ok: false,
      status: 400,
      body: { success: false, error: 'Database already seeded' },
    };
  }

  const email = params.seedEmail;
  const password = params.seedPassword;
  const seedNimNip = params.seedNimNip?.trim();
  if (!email || !password || !seedNimNip) {
    return { ok: false, status: 500, body: { success: false, error: 'Seeder env belum diatur' } };
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const admin = await userRepository.createUser({
    data: {
      name: params.seedName || 'Super Admin',
      email,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      nim_nip: seedNimNip,
    },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      role: true,
      avatar_url: true,
      nim_nip: true,
      department: true,
      phone: true,
      is_active: true,
      semester: true,
      enrollment_date: true,
      device_fingerprint: true,
      created_at: true,
      updated_at: true,
    },
  });

  return { ok: true, data: admin };
}

export async function flushDb(params: {
  nodeEnv: string | undefined;
  incomingSeedSecret: unknown;
  expectedSeedSecret: string | undefined;
}): Promise<ServiceResult<{ message: string }>> {
  if (params.nodeEnv === 'production') {
    return { ok: false, status: 404, body: { success: false, error: 'Not found' } };
  }

  const incoming = typeof params.incomingSeedSecret === 'string' ? params.incomingSeedSecret : '';
  const expected = params.expectedSeedSecret ?? '';
  if (!isValidSeedSecret(incoming, expected)) {
    return {
      ok: false,
      status: 403,
      body: { success: false, error: 'Unauthorized to flush database' },
    };
  }

  await maintenanceRepository.flushTransactionData();

  return {
    ok: true,
    data: {
      message: 'Database flushed successfully. All transaction data removed except User accounts.',
    },
  };
}
