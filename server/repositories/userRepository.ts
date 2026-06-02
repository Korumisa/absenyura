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

export async function findByEmail<TSelect extends Prisma.UserSelect>(params: {
  email: string;
  select: TSelect;
}): Promise<Prisma.UserGetPayload<{ select: TSelect }> | null> {
  const { email, select } = params;
  return prisma.user.findFirst({
    where: {
      OR: [{ email }, { nim_nip: email }],
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
