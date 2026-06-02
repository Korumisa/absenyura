import prisma from './prisma.js';

export function parseClassIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw.flatMap((x) => {
        const result = String(x ?? '').trim();
        return result ? [result] : [];
      })
    )
  );
}

export async function enrollStudentInClasses(
  studentId: string,
  classIds: string[]
): Promise<{ enrolled: number; skipped: number }> {
  if (classIds.length === 0) {
    return { enrolled: 0, skipped: 0 };
  }

  const existingClasses = await prisma.class.findMany({
    where: { id: { in: classIds } },
    select: { id: true },
  });
  const validClassIds = existingClasses.map((c) => c.id);

  if (validClassIds.length === 0) {
    return { enrolled: 0, skipped: classIds.length };
  }

  const existingEnrollments = await prisma.classEnrollment.findMany({
    where: {
      student_id: studentId,
      class_id: { in: validClassIds },
    },
    select: { class_id: true },
  });
  const enrolledSet = new Set(existingEnrollments.map((e) => e.class_id));
  const newClassIds = validClassIds.filter((id) => !enrolledSet.has(id));

  if (newClassIds.length > 0) {
    await prisma.classEnrollment.createMany({
      data: newClassIds.map((class_id) => ({
        class_id,
        student_id: studentId,
      })),
    });
  }

  return {
    enrolled: newClassIds.length,
    skipped: classIds.length - newClassIds.length,
  };
}
