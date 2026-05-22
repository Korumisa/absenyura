import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import fs from 'fs';

const ALLOWED_ROLES = new Set(['USER', 'ADMIN', 'SUPER_ADMIN', 'CONTENT_ADMIN']);

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
        data: users,
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
      res.status(200).json({ success: true, data: users });
    }
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, nim_nip, department, phone, semester } = req.body;

    const nameValue = typeof name === 'string' ? name.trim() : '';
    const emailValue = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const passwordValue = typeof password === 'string' ? password : '';
    const roleValue = typeof role === 'string' ? role : 'USER';
    const nimValueRaw = typeof nim_nip === 'string' ? nim_nip.trim() : '';
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
      typeof semester === 'string' ? parseInt(semester, 10) : typeof semester === 'number' ? semester : NaN;
    const semesterValue = Number.isFinite(semesterRaw) ? Math.trunc(semesterRaw) : 1;

    if (roleValue === 'USER' && (!Number.isFinite(semesterRaw) || semesterValue <= 0)) {
      res.status(400).json({ success: false, error: 'Semester wajib diisi untuk mahasiswa' });
      return;
    }

    const hashedPassword = await bcrypt.hash(passwordValue, 12);

    const user = await prisma.user.create({
      data: {
        name: nameValue,
        email: emailValue,
        password: hashedPassword,
        role: roleValue || 'USER',
        nim_nip: nimValueRaw ? nimValueRaw : null,
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

    await prisma.auditLog.create({
      data: {
        actor_id: (req as any).user.id,
        action: 'CREATE_USER',
        target_table: 'User',
        target_id: user.id,
        new_value: JSON.stringify(user),
        ip_address: req.ip,
      }
    });

    res.status(201).json({ success: true, data: user });
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

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role, nim_nip, department, phone, is_active, password, semester } = req.body;

    if (role && typeof role === 'string' && !ALLOWED_ROLES.has(role)) {
      res.status(400).json({ success: false, error: 'Role tidak valid' });
      return;
    }

    const oldUser = await prisma.user.findUnique({ where: { id }, select: { name: true, role: true, is_active: true, semester: true } });
    const nextRole = (typeof role === 'string' ? role : oldUser?.role) || 'USER';
    const semesterRaw =
      typeof semester === 'string' ? parseInt(semester, 10) : typeof semester === 'number' ? semester : NaN;
    const semesterValue = Number.isFinite(semesterRaw) ? Math.trunc(semesterRaw) : undefined;
    if (nextRole === 'USER' && semester !== undefined) {
      if (!Number.isFinite(semesterRaw) || (semesterValue ?? 0) <= 0) {
        res.status(400).json({ success: false, error: 'Semester wajib diisi untuk mahasiswa' });
        return;
      }
    }

    const updateData: any = {
      name: typeof name === 'string' ? name.trim() : name,
      email: typeof email === 'string' ? email.trim().toLowerCase() : email,
      role,
      nim_nip: typeof nim_nip === 'string' ? (nim_nip.trim() ? nim_nip.trim() : null) : nim_nip,
      department: typeof department === 'string' ? (department.trim() ? department.trim() : null) : department,
      phone: typeof phone === 'string' ? (phone.trim() ? phone.trim() : null) : phone,
      is_active,
    };

    if (role && role !== 'USER') {
      updateData.semester = 1;
    } else if (nextRole === 'USER' && semester !== undefined) {
      updateData.semester = semesterValue;
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

    await prisma.auditLog.create({
      data: {
        actor_id: (req as any).user.id,
        action: 'UPDATE_USER',
        target_table: 'User',
        target_id: user.id,
        old_value: JSON.stringify(oldUser),
        new_value: JSON.stringify(user),
        ip_address: req.ip,
      }
    });

    res.status(200).json({ success: true, data: user });
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

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const oldUser = await prisma.user.findUnique({ where: { id }, select: { email: true } });
    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actor_id: (req as any).user.id,
        action: 'DELETE_USER',
        target_table: 'User',
        target_id: id,
        old_value: JSON.stringify(oldUser),
        ip_address: req.ip,
      }
    });

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const importUsers = async (req: Request, res: Response): Promise<void> => {
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

    const newUsers: any[] = [];
    const defaultPasswordHash = await bcrypt.hash('password123', 12);

    let isFirstRow = true;
    worksheet.eachRow((row, _rowNumber) => {
      if (isFirstRow) {
        isFirstRow = false; // Skip header
        return;
      }

      // Expected Columns: A=Nama, B=Email, C=NIM_NIP, D=Departemen, E=Semester, F=No_HP, G=Role
      const name = row.getCell(1).value?.toString().trim();
      const email = row.getCell(2).value?.toString().trim();
      const nim_nip = row.getCell(3).value?.toString().trim();
      const department = row.getCell(4).value?.toString().trim();
      const semester = parseInt(row.getCell(5).value?.toString().trim() || '1') || 1;
      const phone = row.getCell(6).value?.toString().trim();
      const rawRole = row.getCell(7).value?.toString().trim().toUpperCase();
      
      const role = (rawRole === 'ADMIN' || rawRole === 'SUPER_ADMIN' || rawRole === 'CONTENT_ADMIN') ? rawRole : 'USER';

      if (name && email) {
        newUsers.push({
          name,
          email,
          nim_nip: nim_nip || null,
          department: department || null,
          semester: role === 'USER' ? semester : null,
          phone: phone || null,
          role,
          password: defaultPasswordHash,
        });
      }
    });

    if (newUsers.length === 0) {
      res.status(400).json({ success: false, error: 'Tidak ada data valid yang ditemukan di Excel' });
      return;
    }

    // Insert to database (using createMany, and skipping duplicates)
    const createdUsers = await prisma.user.createMany({
      data: newUsers,
      skipDuplicates: true,
    });

    await prisma.auditLog.create({
      data: {
        actor_id: (req as any).user.id,
        action: 'IMPORT_USERS',
        target_table: 'User',
        target_id: 'MULTIPLE',
        new_value: `Imported ${createdUsers.count} users`,
        ip_address: req.ip,
      }
    });

    res.status(200).json({ 
      success: true, 
      message: `${createdUsers.count} pengguna berhasil diimpor. (Email yang sudah ada diabaikan)`,
      data: { count: createdUsers.count }
    });

  } catch (error: unknown) {
    console.error('Error importing users:', error);
    res.status(500).json({ success: false, error: 'Gagal mengimpor file Excel. Pastikan format benar.' });
  } finally {
    if (filePath) {
      await fs.promises.unlink(filePath).catch(() => {});
    }
  }
};

// Reset Device Fingerprint
export const resetDeviceFingerprint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

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
