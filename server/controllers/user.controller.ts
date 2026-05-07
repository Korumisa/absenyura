import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import ExcelJS from 'exceljs';

const ALLOWED_ROLES = new Set(['USER', 'ADMIN', 'SUPER_ADMIN', 'CONTENT_ADMIN']);

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
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
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, nim_nip, department, phone, semester } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, error: 'Email already in use' });
      return;
    }

    if (role && typeof role === 'string' && !ALLOWED_ROLES.has(role)) {
      res.status(400).json({ success: false, error: 'Role tidak valid' });
      return;
    }

    if (role === 'USER' && !semester) {
      res.status(400).json({ success: false, error: 'Semester wajib diisi untuk mahasiswa' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'USER',
        nim_nip,
        department,
        phone,
        semester: role === 'USER' ? semester : null,
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

    if (role === 'USER' && !semester) {
      res.status(400).json({ success: false, error: 'Semester wajib diisi untuk mahasiswa' });
      return;
    }

    const updateData: any = { 
      name, email, role, nim_nip, department, phone, is_active,
      semester: role === 'USER' ? semester : null 
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const oldUser = await prisma.user.findUnique({ where: { id }, select: { name: true, role: true, is_active: true } });

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
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'File Excel tidak ditemukan' });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    // ExcelJS requires ArrayBuffer, but multer provides Buffer. Convert to Uint8Array then to ArrayBuffer.
    const arrayBuffer = new Uint8Array(req.file.buffer).buffer;
    await workbook.xlsx.load(arrayBuffer);
    
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

    // Insert to database (using createMany, but skipping duplicates)
    const createdUsers = await prisma.user.createMany({
      data: newUsers,
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
