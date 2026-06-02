import { Prisma } from '@prisma/client';
import prisma from './prisma.js';

export const adminSessionScopeWhere = (userId: string): Prisma.SessionWhereInput => ({
  OR: [
    { class: { lecturer_id: userId } },
    { session_classes: { some: { class: { lecturer_id: userId } } } },
  ],
});

export const adminOwnsAllClasses = async (userId: string, classIds: string[]): Promise<boolean> => {
  if (classIds.length === 0) return true;
  const ownedCount = await prisma.class.count({
    where: { id: { in: classIds }, lecturer_id: userId },
  });
  return ownedCount === classIds.length;
};

export const assertAdminSessionScope = async (
  user: { id: string; role: string },
  sessionId: string
): Promise<boolean> => {
  if (user.role !== 'ADMIN') return true;
  const scoped = await prisma.session.findFirst({
    where: { id: sessionId, ...adminSessionScopeWhere(user.id) },
    select: { id: true },
  });
  return Boolean(scoped);
};
