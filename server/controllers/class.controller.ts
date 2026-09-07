import { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import prisma from '../utils/prisma.js';
import { sendForbidden } from '../utils/errorResponse.js';
import { queryWithSemesterFallback } from '../utils/prismaErrors.js';

const classInclude = {
  lecturer: { select: { id: true, name: true } },
  _count: { select: { enrollments: true, sessions: true } },
} as const;

/**
 * When the current DB has no `Class.semester` column (pre-migration / P2022)
 * the fallback projections silently drop `semester`. Layer a default of `1`
 * back onto any row whose shape has `semester` declared at type-level but is
 * missing the physical column — keeps API response shape uniform for callers.
 */
function withDefaultSemester<T extends { semester?: number | null }>(
  row: T
): Omit<T, 'semester'> & { semester: number } {
  return { ...row, semester: (row.semester as number | null | undefined) ?? 1 };
}

async function findClassById(id: string) {
  // TODO(#post-audit-p3): remove fallback once all envs confirm semester column exists (2026-02 migration applied)
  const fallback = await queryWithSemesterFallback(
    () => prisma.class.findUnique({ where: { id }, include: classInclude }),
    () =>
      prisma.class.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          course_code: true,
          description: true,
          lecturer_id: true,
          lecturer: { select: { id: true, name: true } },
          _count: { select: { enrollments: true, sessions: true } },
        },
      })
  );
  if (!fallback) return null;
  return withDefaultSemester(fallback as any);
}

async function userCanAccessClass(
  user: { id: string; role: string },
  classId: string
): Promise<boolean> {
  if (user.role === 'SUPER_ADMIN') return true;
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { lecturer_id: true },
  });
  if (!cls) return false;
  if (user.role === 'ADMIN') return cls.lecturer_id === user.id;
  if (user.role === 'USER') {
    const enrollment = await prisma.classEnrollment.findFirst({
      where: { class_id: classId, student_id: user.id },
    });
    return Boolean(enrollment);
  }
  return false;
}

export const getClasses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let classes;
    const commonInclude = {
      lecturer: { select: { name: true } },
      _count: { select: { enrollments: true, sessions: true } },
    } as const;
    const commonFallbackSelect = {
      id: true,
      name: true,
      course_code: true,
      description: true,
      lecturer_id: true,
      lecturer: { select: { name: true } },
      _count: { select: { enrollments: true, sessions: true } },
    } as const;
    const commonOrder = { created_at: 'desc' } as const;

    if (user.role === 'USER') {
      // TODO(#post-audit-p3): remove fallback once all envs confirm semester column exists (2026-02 migration applied)
      const rows = await queryWithSemesterFallback(
        () =>
          prisma.class.findMany({
            where: { enrollments: { some: { student_id: user.id } } },
            include: commonInclude,
            orderBy: commonOrder,
          }),
        () =>
          prisma.class.findMany({
            where: { enrollments: { some: { student_id: user.id } } },
            select: commonFallbackSelect,
            orderBy: commonOrder,
          })
      );
      classes = rows.map((r: any) => withDefaultSemester(r));
    } else if (user.role === 'ADMIN') {
      // TODO(#post-audit-p3): remove fallback once all envs confirm semester column exists (2026-02 migration applied)
      const rows = await queryWithSemesterFallback(
        () =>
          prisma.class.findMany({
            where: { lecturer_id: user.id },
            include: commonInclude,
            orderBy: commonOrder,
          }),
        () =>
          prisma.class.findMany({
            where: { lecturer_id: user.id },
            select: commonFallbackSelect,
            orderBy: commonOrder,
          })
      );
      classes = rows.map((r: any) => withDefaultSemester(r));
    } else {
      // TODO(#post-audit-p3): remove fallback once all envs confirm semester column exists (2026-02 migration applied)
      const rows = await queryWithSemesterFallback(
        () => prisma.class.findMany({ include: commonInclude, orderBy: commonOrder }),
        () => prisma.class.findMany({ select: commonFallbackSelect, orderBy: commonOrder })
      );
      classes = rows.map((r: any) => withDefaultSemester(r));
    }

    res.status(200).json({ success: true, data: classes });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createClass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { name, course_code, description, lecturer_id, semester } = req.body;
    const sem = Math.max(1, Math.min(14, Number.parseInt(String(semester ?? '1'), 10) || 1));
    const resolvedLecturerId = user?.role === 'ADMIN' ? user.id : lecturer_id;

    // TODO(#post-audit-p3): remove fallback once all envs confirm semester column exists (2026-02 migration applied)
    const created = await queryWithSemesterFallback(
      () =>
        prisma.class.create({
          data: {
            name,
            semester: sem,
            course_code,
            description,
            lecturer_id: resolvedLecturerId,
          },
          include: {
            lecturer: { select: { name: true } },
            _count: { select: { enrollments: true, sessions: true } },
          },
        }),
      () =>
        prisma.class.create({
          data: { name, course_code, description, lecturer_id: resolvedLecturerId },
          include: {
            lecturer: { select: { name: true } },
            _count: { select: { enrollments: true, sessions: true } },
          },
        })
    );
    const newClass = withDefaultSemester(created as any);

    res.status(201).json({ success: true, data: newClass });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateClass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const allowed = await userCanAccessClass(user, id);
    if (!allowed || user.role === 'USER') {
      sendForbidden(res, {
        error_code: 'CLASS_OUT_OF_SCOPE',
        message: 'Kelas ini di luar akses Anda.',
      });
      return;
    }
    const { name, course_code, description, lecturer_id, semester } = req.body;
    const sem = Math.max(1, Math.min(14, Number.parseInt(String(semester ?? '1'), 10) || 1));
    if (user.role === 'ADMIN' && lecturer_id && lecturer_id !== user.id) {
      sendForbidden(res, {
        error_code: 'ADMIN_CANNOT_CHANGE_LECTURER',
        message: 'Admin tidak dapat memindahkan kelas ke dosen lain.',
      });
      return;
    }
    const resolvedLecturerId = user.role === 'ADMIN' ? user.id : lecturer_id;

    // TODO(#post-audit-p3): remove fallback once all envs confirm semester column exists (2026-02 migration applied)
    const updated = await queryWithSemesterFallback(
      () =>
        prisma.class.update({
          where: { id },
          data: { name, semester: sem, course_code, description, lecturer_id: resolvedLecturerId },
          include: {
            lecturer: { select: { name: true } },
            _count: { select: { enrollments: true, sessions: true } },
          },
        }),
      () =>
        prisma.class.update({
          where: { id },
          data: { name, course_code, description, lecturer_id: resolvedLecturerId },
          include: {
            lecturer: { select: { name: true } },
            _count: { select: { enrollments: true, sessions: true } },
          },
        })
    );
    const updatedClass = withDefaultSemester(updated as any);

    res.status(200).json({ success: true, data: updatedClass });
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteClass = async (req: Request, res: Response): Promise<void> => {
  // Authorization enforced at route level — see server/routes/classes.ts
  try {
    const { id } = req.params;
    await prisma.class.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Class deleted' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getClassById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const cls = await findClassById(id);
    if (!cls) {
      res.status(404).json({ success: false, error: 'Kelas tidak ditemukan' });
      return;
    }
    const allowed = await userCanAccessClass(user, id);
    if (!allowed) {
      res.status(403).json({ success: false, error: 'Akses ditolak' });
      return;
    }
    res.status(200).json({ success: true, data: cls });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/** Daftar mahasiswa aktif untuk form enrollment (ADMIN & SUPER_ADMIN) */
export const getEnrollmentOptions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const students = await prisma.user.findMany({
      where: { role: 'USER', is_active: true },
      select: {
        id: true,
        name: true,
        nim_nip: true,
        email: true,
        is_active: true,
        department: true,
      },
      orderBy: { name: 'asc' },
    });

    let lecturers: { id: string; name: string }[] = [];
    if (user.role === 'SUPER_ADMIN') {
      lecturers = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, is_active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
    }

    res.status(200).json({ success: true, data: { students, lecturers } });
  } catch (error) {
    console.error('Error fetching enrollment options:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const allowed = await userCanAccessClass(user, id);
    if (!allowed) {
      res.status(403).json({ success: false, error: 'Akses ditolak' });
      return;
    }
    const enrollments = await prisma.classEnrollment.findMany({
      where: { class_id: id },
      include: {
        student: {
          select: { id: true, name: true, email: true, nim_nip: true, is_active: true },
        },
      },
    });
    const students = enrollments.map((e) => e.student);
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const enrollStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const allowed = await userCanAccessClass(user, id);
    if (!allowed || user.role === 'USER') {
      res.status(403).json({ success: false, error: 'Akses ditolak' });
      return;
    }
    const { student_ids } = req.body; // Array of student IDs

    if (!Array.isArray(student_ids)) {
      res.status(400).json({ success: false, error: 'student_ids must be an array' });
      return;
    }

    // Fetch existing enrollments to filter duplicates
    const existingEnrollments = await prisma.classEnrollment.findMany({
      where: {
        class_id: id,
        student_id: { in: student_ids },
      },
    });

    const existingStudentIds = new Set(existingEnrollments.map((e) => e.student_id));
    const newStudentIds = student_ids.filter((sid) => !existingStudentIds.has(sid));

    if (newStudentIds.length === 0) {
      res
        .status(200)
        .json({ success: true, message: 'All selected students are already enrolled.' });
      return;
    }

    const data = newStudentIds.map((sid) => ({
      class_id: id,
      student_id: sid,
    }));

    await prisma.classEnrollment.createMany({
      data,
    });

    res
      .status(200)
      .json({ success: true, message: `${newStudentIds.length} Students enrolled successfully` });
  } catch (error) {
    console.error('Error enrolling students:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const removeStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, student_id } = req.params;
    const user = req.user!;
    const allowed = await userCanAccessClass(user, id);
    if (!allowed || user.role === 'USER') {
      res.status(403).json({ success: false, error: 'Akses ditolak' });
      return;
    }
    await prisma.classEnrollment.delete({
      where: { class_id_student_id: { class_id: id, student_id } },
    });
    res.status(200).json({ success: true, message: 'Student removed' });
  } catch (error) {
    console.error('Error removing student:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
