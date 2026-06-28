import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';

export async function findById<TSelect extends Prisma.UserSelect>(params: {
  id: string;
  select: TSelect;
}): Promise<Prisma.UserGetPayload<{ select: TSelect }> | null> {
  const { id, select } = params;
  return prisma.user.findUnique({
    where: { id },
    select,
  });
}

export async function findByNim<TSelect extends Prisma.UserSelect>(params: {
  nim: string;
  select: TSelect;
}): Promise<Prisma.UserGetPayload<{ select: TSelect }> | null> {
  const { nim, select } = params;
  return prisma.user.findFirst({
    where: {
      nim_nip: nim,
    },
    select,
  });
}

export async function createUser<TSelect extends Prisma.UserSelect>(params: {
  data: Prisma.UserCreateInput;
  select: TSelect;
}): Promise<Prisma.UserGetPayload<{ select: TSelect }>> {
  const { data, select } = params;
  return prisma.user.create({
    data,
    select,
  });
}

export async function updateUser<TSelect extends Prisma.UserSelect>(params: {
  id: string;
  data: Prisma.UserUpdateInput;
  select: TSelect;
}): Promise<Prisma.UserGetPayload<{ select: TSelect }>> {
  const { id, data, select } = params;
  return prisma.user.update({
    where: { id },
    data,
    select,
  });
}

/**
 * Atomically rotates the refresh-token hash, but only if `expectedCurrentHash`
 * still matches what's in the DB at write time. This is a compare-and-swap:
 * if two requests read the same current hash concurrently (e.g. two
 * near-simultaneous 401-triggered refresh calls), only one `updateMany` can
 * succeed — the `where` clause stops matching after the first write commits.
 *
 * The caller MUST check `rotated` and handle the `false` case explicitly
 * (do not assume the rotation took effect just because no error was thrown).
 */
export async function rotateRefreshTokenHash(params: {
  id: string;
  expectedCurrentHash: string;
  newHash: string;
  previousHash: string;
  previousRotatedAt: Date;
}): Promise<{ rotated: boolean }> {
  const { id, expectedCurrentHash, newHash, previousHash, previousRotatedAt } = params;
  const result = await prisma.user.updateMany({
    where: { id, refresh_token_hash: expectedCurrentHash },
    data: {
      refresh_token_hash: newHash,
      previous_refresh_token_hash: previousHash,
      previous_refresh_rotated_at: previousRotatedAt,
    },
  });
  return { rotated: result.count === 1 };
}
