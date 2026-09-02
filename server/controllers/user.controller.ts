import { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { enrollStudentInClasses, parseClassIds } from '../utils/enrollment.js';
import ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import fs from 'fs';

const ALLOWED_ROLES = new Set(['USER', 'ADMIN', 'SUPER_ADMIN', 'CONTENT_ADMIN']);

type ParsedImportUserRow = {
  name: string;
  email: string;
  nim_nip: string | null;
  department: string | null;
  semester: number | null;
  phone: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'CONTENT_ADMIN';
  classNames: string[];
};

const normalizeImportEmail = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const parseImportClassNames = (value: unknown): string[] =>
  Array.from(
    new Set(
      String(value ?? '')
        .split(/[|\n;,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

const classIdentityKey = (lecturerId: string, semester: number, name: string): string =>
  `${lecturerId}::${semester}::${name.trim().toLowerCase()}`;

const normalizeNimNip = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const pageQuery = req.query.page;
    const limitQuery = req.query.limit;

    // Filters
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;
    const status = req.query.status as string | undefined;

    const where: Prisma.UserWhereInput = {};

    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      where.OR = [
        { name: { contains: searchLower, mode: 'insensitive' } },
        { email: { contains: searchLower, mode: 'insensitive' } },
        { nim_nip: { contains: searchLower, mode: 'insensitive' } },
      ];
    }

    if (role && role !== 'ALL') {
      where.role = role as any;
    }

    if (status && status !== 'ALL') {
      where.is_active = status === 'ACTIVE' || status === 'true';
    }

    if (pageQuery !== undefined) {
      // strict parsing and validation
      const parsedPage = parseInt(pageQuery as string, 10);
      const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

      let limit = 10;
      if (limitQuery !== undefined) {
        const parsedLimit = parseInt(limitQuery as string, 10);
        limit = Number.isInteger(parsedLimit) && parsedLimit >= 1 ? parsedLimit : 10;
      }
      // hard cap at 50
      if (limit > 50) {
        limit = 50;
      }

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            nim_nip: true,
            department: true,
            phone: true,
            is_active: true,
            semester: true,
            enrollment_date: true,
            device_fingerprint: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: users.map((user) => ({
          ...user,
          device_bound: Boolean(user.device_fingerprint),
          device_fingerprint: undefined, // Omit raw fingerprint
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } else {
      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          nim_nip: true,
          department: true,
          phone: true,
          is_active: true,
          semester: true,
          enrollment_date: true,
          device_fingerprint: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      });
      res.status(200).json({
        success: true,
        data: users.map((user) => ({
          ...user,
          device_bound: Boolean(user.device_fingerprint),
          device_fingerprint: undefined, // Omit raw fingerprint
        })),
      });
    }
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  nim_nip: true,
  department: true,
  phone: true,
  is_active: true,
  semester: true,
  enrollment_date: true,
  avatar_url: true,
  device_fingerprint: true,
  created_at: true,
  updated_at: true,
} as const;

async function adminCanViewStudent(actorId: string, studentId: string): Promise<boolean> {
  const hit = await prisma.classEnrollment.findFirst({
    where: {
      student_id: studentId,
      class: { lecturer_id: actorId },
    },
  });
  return Boolean(hit);
}

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const actor = req.user!;

    const user = await prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan' });
      return;
    }

    const transformedUser = {
      ...user,
      device_bound: Boolean(user.device_fingerprint),
      device_fingerprint: undefined, // Omit raw fingerprint
    };

    if (actor.role === 'SUPER_ADMIN') {
      res.status(200).json({ success: true, data: transformedUser });
      return;
    }

    if (actor.role === 'ADMIN') {
      if (user.role !== 'USER') {
        res.status(403).json({ success: false, error: 'Akses ditolak' });
        return;
      }
      const allowed = await adminCanViewStudent(actor.id, id);
      if (!allowed) {
        res.status(403).json({ success: false, error: 'Akses ditolak' });
        return;
      }
      res.status(200).json({ success: true, data: transformedUser });
      return;
    }

    res.status(403).json({ success: false, error: 'Akses ditolak' });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getUserEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const actor = req.user!;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan' });
      return;
    }

    if (actor.role === 'ADMIN') {
      if (user.role !== 'USER') {
        res.status(403).json({ success: false, error: 'Akses ditolak' });
        return;
      }
      const allowed = await adminCanViewStudent(actor.id, id);
      if (!allowed) {
        res.status(403).json({ success: false, error: 'Akses ditolak' });
        return;
      }
    }

    if (user.role !== 'USER') {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const enrollments = await prisma.classEnrollment.findMany({
      where: { student_id: id },
      include: {
        class: { select: { id: true, name: true, semester: true } },
      },
      orderBy: { enrolled_at: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: enrollments.map((e) => ({
        id: e.class.id,
        name: e.class.name,
        semester: e.class.semester,
      })),
    });
  } catch (error) {
    console.error('Error fetching user enrollments:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, nim_nip, department, phone, semester, class_ids } =
      req.body;

    const nameValue = typeof name === 'string' ? name.trim() : '';
    const emailValue = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const passwordValue = typeof password === 'string' ? password : '';
    const roleValue = typeof role === 'string' ? role : 'USER';
    const nimValueRaw = normalizeNimNip(nim_nip);
    const departmentValueRaw = typeof department === 'string' ? department.trim() : '';
    const phoneValueRaw = typeof phone === 'string' ? phone.trim() : '';

    if (!nameValue) {
      res.status(400).json({ success: false, error: 'Nama wajib diisi' });
      return;
    }
    if (!emailValue) {
      res.status(400).json({ success: false, error: 'Email wajib diisi' });
      return;
    }
    if (!passwordValue) {
      res.status(400).json({ success: false, error: 'Kata sandi wajib diisi' });
      return;
    }
    if (passwordValue.length < 8) {
      res
        .status(400)
        .json({ success: false, error: 'Kata sandi harus terdiri dari minimal 8 karakter' });
      return;
    }
    if (!nimValueRaw) {
      res.status(400).json({ success: false, error: 'NIM/NIP wajib diisi' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: emailValue } });
    if (existingUser) {
      res.status(400).json({ success: false, error: 'Email sudah digunakan' });
      return;
    }

    if (roleValue && typeof roleValue === 'string' && !ALLOWED_ROLES.has(roleValue)) {
      res.status(400).json({ success: false, error: 'Role tidak valid' });
      return;
    }

    const semesterRaw =
      typeof semester === 'string'
        ? parseInt(semester, 10)
        : typeof semester === 'number'
          ? semester
          : NaN;
    const semesterValue = Number.isFinite(semesterRaw) ? Math.trunc(semesterRaw) : 1;

    if (roleValue === 'USER' && (!Number.isFinite(semesterRaw) || semesterValue <= 0)) {
      res.status(400).json({ success: false, error: 'Semester wajib diisi untuk mahasiswa' });
      return;
    }

    const hashedPassword = await bcrypt.hash(passwordValue, 12);
    const classIdsToEnroll = roleValue === 'USER' ? parseClassIds(class_ids) : [];

    let enrolledCount = 0;
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: nameValue,
          email: emailValue,
          password: hashedPassword,
          role: roleValue || 'USER',
          nim_nip: nimValueRaw,
          department: departmentValueRaw ? departmentValueRaw : null,
          phone: phoneValueRaw ? phoneValueRaw : null,
          semester: roleValue === 'USER' ? semesterValue : 1,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_active: true,
        },
      });

      if (classIdsToEnroll.length > 0) {
        const existingClasses = await tx.class.findMany({
          where: { id: { in: classIdsToEnroll } },
          select: { id: true },
        });
        const validIds = existingClasses.map((c) => c.id);
        enrolledCount = validIds.length;
        if (validIds.length > 0) {
          await tx.classEnrollment.createMany({
            data: validIds.map((class_id) => ({
              class_id,
              student_id: created.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      return created;
    });

    await prisma.auditLog.create({
      data: {
        actor_id: req.user!.id,
        action: 'CREATE_USER',
        target_table: 'User',
        target_id: user.id,
        new_value: JSON.stringify({ ...user, enrolled_classes: enrolledCount }),
        ip_address: req.ip,
      },
    });

    res.status(201).json({
      success: true,
      data: { ...user, enrolled_classes: enrolledCount },
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta as any)?.target;
        const targets = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];
        if (targets.includes('email')) {
          res.status(400).json({ success: false, error: 'Email sudah digunakan' });
          return;
        }
        if (targets.includes('nim_nip')) {
          res.status(400).json({ success: false, error: 'NIM/NIP sudah digunakan' });
          return;
        }
        res.status(400).json({ success: false, error: 'Data unik sudah digunakan' });
        return;
      }
    }
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const actor = req.user!;
    let {
      name,
      email,
      role,
      nim_nip,
      department,
      phone,
      is_active,
      password,
      semester,
      class_ids,
    } = req.body;

    if (password !== undefined && password !== null) {
      const passwordValue = typeof password === 'string' ? password : '';
      if (!passwordValue) {
        res.status(400).json({ success: false, error: 'Kata sandi tidak boleh kosong' });
        return;
      }
      if (passwordValue.length < 8) {
        res
          .status(400)
          .json({ success: false, error: 'Kata sandi harus terdiri dari minimal 8 karakter' });
        return;
      }
    }

    if (actor.role === 'ADMIN') {
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (!target || target.role !== 'USER') {
        res.status(403).json({ success: false, error: 'Akses ditolak' });
        return;
      }
      const allowed = await adminCanViewStudent(actor.id, id);
      if (!allowed) {
        res.status(403).json({ success: false, error: 'Akses ditolak' });
        return;
      }
      role = undefined;
      class_ids = undefined;
    } else if (actor.role !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, error: 'Akses ditolak' });
      return;
    }

    if (role && typeof role === 'string' && !ALLOWED_ROLES.has(role)) {
      res.status(400).json({ success: false, error: 'Role tidak valid' });
      return;
    }

    const oldUser = await prisma.user.findUnique({
      where: { id },
      select: { name: true, role: true, is_active: true, semester: true },
    });
    const nextRole = (typeof role === 'string' ? role : oldUser?.role) || 'USER';
    const semesterRaw =
      typeof semester === 'string'
        ? parseInt(semester, 10)
        : typeof semester === 'number'
          ? semester
          : NaN;
    const semesterValue = Number.isFinite(semesterRaw) ? Math.trunc(semesterRaw) : undefined;
    if (nextRole === 'USER' && semester !== undefined) {
      if (!Number.isFinite(semesterRaw) || (semesterValue ?? 0) <= 0) {
        res.status(400).json({ success: false, error: 'Semester wajib diisi untuk mahasiswa' });
        return;
      }
    }

    const normalizedNimNip = normalizeNimNip(nim_nip);
    if (nim_nip !== undefined && !normalizedNimNip) {
      res.status(400).json({ success: false, error: 'NIM/NIP wajib diisi' });
      return;
    }

    const updateData: any = {
      name: typeof name === 'string' ? name.trim() : name,
      email: typeof email === 'string' ? email.trim().toLowerCase() : email,
      role,
      nim_nip: typeof nim_nip === 'string' ? normalizedNimNip : nim_nip,
      department:
        typeof department === 'string'
          ? department.trim()
            ? department.trim()
            : null
          : department,
      phone: typeof phone === 'string' ? (phone.trim() ? phone.trim() : null) : phone,
      is_active,
    };

    if (role && role !== 'USER') {
      updateData.semester = 1;
    } else if (nextRole === 'USER' && semester !== undefined) {
      updateData.semester = semesterValue;
    }

    const effectiveSemester =
      nextRole === 'USER'
        ? semester !== undefined
          ? semesterValue
          : oldUser?.semester
        : undefined;
    if (nextRole === 'USER' && typeof effectiveSemester === 'number' && effectiveSemester >= 10) {
      updateData.semester = effectiveSemester;
      updateData.is_active = false;
      updateData.refresh_token_hash = null;
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
      },
    });

    let enrolledAdded = 0;
    const classIdsToAdd = nextRole === 'USER' ? parseClassIds(class_ids) : [];
    if (classIdsToAdd.length > 0) {
      const result = await enrollStudentInClasses(id, classIdsToAdd);
      enrolledAdded = result.enrolled;
    }

    await prisma.auditLog.create({
      data: {
        actor_id: req.user!.id,
        action: 'UPDATE_USER',
        target_table: 'User',
        target_id: user.id,
        old_value: JSON.stringify(oldUser),
        new_value: JSON.stringify({ ...user, enrolled_added: enrolledAdded }),
        ip_address: req.ip,
      },
    });

    res.status(200).json({
      success: true,
      data: { ...user, enrolled_added: enrolledAdded },
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta as any)?.target;
        const targets = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];
        if (targets.includes('email')) {
          res.status(400).json({ success: false, error: 'Email sudah digunakan' });
          return;
        }
        if (targets.includes('nim_nip')) {
          res.status(400).json({ success: false, error: 'NIM/NIP sudah digunakan' });
          return;
        }
        res.status(400).json({ success: false, error: 'Data unik sudah digunakan' });
        return;
      }
    }
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  // Authorization enforced at route level — see server/routes/users.ts
  try {
    const { id } = req.params;
    const oldUser = await prisma.user.findUnique({ where: { id }, select: { email: true } });
    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actor_id: req.user!.id,
        action: 'DELETE_USER',
        target_table: 'User',
        target_id: id,
        old_value: JSON.stringify(oldUser),
        ip_address: req.ip,
      },
    });

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const importUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const filePath = req.file?.path;
  try {
    if (!req.file || !filePath) {
      res.status(400).json({ success: false, error: 'File Excel tidak ditemukan' });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0]; // Get the first sheet
    if (!worksheet) {
      res.status(400).json({ success: false, error: 'Format Excel tidak valid atau kosong' });
      return;
    }

    const actor = req.user!;
    const parsedRows: ParsedImportUserRow[] = [];
    const seenEmails = new Set<string>();
    let duplicateRowCount = 0;
    let missingNimNipRowCount = 0;
    const defaultPasswordHash = await bcrypt.hash('password123', 12);
    const requestedImportYearMode =
      typeof req.body?.importEnrollmentYearMode === 'string'
        ? req.body.importEnrollmentYearMode.trim().toUpperCase()
        : '';
    const importYear =
      requestedImportYearMode === 'PREVIOUS_YEAR'
        ? new Date().getFullYear() - 1
        : new Date().getFullYear();
    const importEnrollmentDate = new Date(importYear, 7, 1);

    let isFirstRow = true;
    worksheet.eachRow((row, _rowNumber) => {
      if (isFirstRow) {
        isFirstRow = false; // Skip header
        return;
      }

      // Expected Columns: A=Nama, B=Email, C=NIM_NIP, D=Departemen, E=Semester, F=No_HP, G=Role
      const name = row.getCell(1).value?.toString().trim();
      const email = normalizeImportEmail(row.getCell(2).value);
      const nim_nip = normalizeNimNip(row.getCell(3).value);
      const department = row.getCell(4).value?.toString().trim();
      const semester = parseInt(row.getCell(5).value?.toString().trim() || '1') || 1;
      const phone = row.getCell(6).value?.toString().trim();
      const rawRole = row.getCell(7).value?.toString().trim().toUpperCase();
      const classNames = parseImportClassNames(row.getCell(8).value);

      const role =
        rawRole === 'ADMIN' || rawRole === 'SUPER_ADMIN' || rawRole === 'CONTENT_ADMIN'
          ? rawRole
          : 'USER';

      if (name && email) {
        if (!nim_nip) {
          missingNimNipRowCount++;
          return;
        }
        if (seenEmails.has(email)) {
          duplicateRowCount++;
          return;
        }
        seenEmails.add(email);
        parsedRows.push({
          name,
          email,
          nim_nip,
          department: department || null,
          semester: role === 'USER' ? semester : null,
          phone: phone || null,
          role,
          classNames: role === 'USER' ? classNames : [],
        });
      }
    });

    if (parsedRows.length === 0) {
      res
        .status(400)
        .json({ success: false, error: 'Tidak ada data valid yang ditemukan di Excel' });
      return;
    }

    const parsedEmails = parsedRows.map((row) => row.email);
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: parsedEmails } },
      select: { email: true },
    });
    const existingEmailSet = new Set(existingUsers.map((user) => user.email.toLowerCase()));
    const rowsToCreate = parsedRows.filter((row) => !existingEmailSet.has(row.email));

    const requiredClasses = new Map<
      string,
      { name: string; semester: number; lecturer_id: string }
    >();
    for (const row of rowsToCreate) {
      if (row.role !== 'USER' || !row.semester) continue;
      for (const className of row.classNames) {
        const key = classIdentityKey(actor.id, row.semester, className);
        if (!requiredClasses.has(key)) {
          requiredClasses.set(key, {
            name: className,
            semester: row.semester,
            lecturer_id: actor.id,
          });
        }
      }
    }

    const requiredClassList = Array.from(requiredClasses.values());
    let createdClassCount = 0;
    const classMap = new Map<string, { id: string; name: string; semester: number }>();

    if (requiredClassList.length > 0) {
      const existingClasses = await prisma.class.findMany({
        where: {
          lecturer_id: actor.id,
          name: { in: Array.from(new Set(requiredClassList.map((item) => item.name))) },
          semester: { in: Array.from(new Set(requiredClassList.map((item) => item.semester))) },
        },
        select: { id: true, name: true, semester: true },
      });

      for (const existingClass of existingClasses) {
        classMap.set(
          classIdentityKey(actor.id, existingClass.semester ?? 1, existingClass.name),
          existingClass
        );
      }

      const missingClasses = requiredClassList.filter(
        (item) => !classMap.has(classIdentityKey(actor.id, item.semester, item.name))
      );

      for (const item of missingClasses) {
        const createdClass = await prisma.class.create({
          data: {
            name: item.name,
            semester: item.semester,
            lecturer_id: item.lecturer_id,
            course_code: null,
            description: null,
          },
          select: { id: true, name: true, semester: true },
        });
        classMap.set(classIdentityKey(actor.id, item.semester, item.name), createdClass);
        createdClassCount++;
      }
    }

    const usersToCreate = rowsToCreate.map((row) => ({
      name: row.name,
      email: row.email,
      nim_nip: row.nim_nip,
      department: row.department,
      semester: row.role === 'USER' ? (row.semester ?? 1) : undefined,
      phone: row.phone,
      role: row.role,
      password: defaultPasswordHash,
      enrollment_date: importEnrollmentDate,
    }));

    const createdUsers =
      usersToCreate.length > 0
        ? await prisma.user.createMany({
            data: usersToCreate,
            skipDuplicates: true,
          })
        : { count: 0 };

    const createdUserRecords =
      rowsToCreate.length > 0
        ? await prisma.user.findMany({
            where: { email: { in: rowsToCreate.map((row) => row.email) } },
            select: { id: true, email: true },
          })
        : [];
    const createdUserByEmail = new Map(
      createdUserRecords.map((user) => [user.email.toLowerCase(), user.id])
    );

    const enrollmentData: { class_id: string; student_id: string }[] = [];
    for (const row of rowsToCreate) {
      if (row.role !== 'USER' || !row.semester || row.classNames.length === 0) continue;
      const studentId = createdUserByEmail.get(row.email);
      if (!studentId) continue;

      for (const className of row.classNames) {
        const cls = classMap.get(classIdentityKey(actor.id, row.semester, className));
        if (!cls) continue;
        enrollmentData.push({
          class_id: cls.id,
          student_id: studentId,
        });
      }
    }

    const createdEnrollments =
      enrollmentData.length > 0
        ? await prisma.classEnrollment.createMany({
            data: enrollmentData,
            skipDuplicates: true,
          })
        : { count: 0 };

    await prisma.auditLog.create({
      data: {
        actor_id: actor.id,
        action: 'IMPORT_USERS',
        target_table: 'User',
        target_id: 'MULTIPLE',
        new_value: JSON.stringify({
          imported_users: createdUsers.count,
          created_classes: createdClassCount,
          created_enrollments: createdEnrollments.count,
          skipped_existing_users: parsedRows.length - rowsToCreate.length,
          skipped_duplicate_rows: duplicateRowCount,
          skipped_missing_nim_nip_rows: missingNimNipRowCount,
        }),
        ip_address: req.ip,
      },
    });

    res.status(200).json({
      success: true,
      message: `${createdUsers.count} pengguna berhasil diimpor, ${createdClassCount} kelas dibuat otomatis, dan ${createdEnrollments.count} enrollment kelas berhasil dibuat. Enrollment date disetel ke 1 Agustus ${importEnrollmentDate.getFullYear()}.`,
      data: {
        count: createdUsers.count,
        enrollment_date: importEnrollmentDate.toISOString(),
        classes_created: createdClassCount,
        class_enrollments_created: createdEnrollments.count,
        skipped_existing_users: parsedRows.length - rowsToCreate.length,
        skipped_duplicate_rows: duplicateRowCount,
        skipped_missing_nim_nip_rows: missingNimNipRowCount,
      },
    });
  } catch (error: unknown) {
    console.error('Error importing users:', error);
    res
      .status(500)
      .json({ success: false, error: 'Gagal mengimpor file Excel. Pastikan format benar.' });
  } finally {
    if (filePath) {
      await fs.promises.unlink(filePath).catch(() => {});
    }
  }
};

// Reset Device Fingerprint
export const resetDeviceFingerprint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const actor = req.user!;

    if (actor.role === 'ADMIN') {
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (!target || target.role !== 'USER') {
        res.status(403).json({ success: false, error: 'Akses ditolak' });
        return;
      }
      const allowed = await adminCanViewStudent(actor.id, id);
      if (!allowed) {
        res.status(403).json({ success: false, error: 'Akses ditolak' });
        return;
      }
    }

    await prisma.user.update({
      where: { id },
      data: { device_fingerprint: null },
    });

    res.json({ success: true, message: 'Perangkat mahasiswa berhasil di-reset' });
  } catch (error: unknown) {
    console.error('Error resetting device:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
