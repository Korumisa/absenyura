import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Menyiapkan akun demo...');

  const passwordHash = await bcrypt.hash('password123', 12);

  // 1. Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@demo.com' },
    update: {},
    create: {
      name: 'Budi (Super Admin)',
      email: 'superadmin@demo.com',
      password: passwordHash,
      role: 'SUPER_ADMIN',
      department: 'IT Support',
      phone: '081234567890',
    },
  });
  console.log('✅ Super Admin dibuat:', superAdmin.email);

  // 2. Admin (Dosen)
  const admin = await prisma.user.upsert({
    where: { email: 'dosen@demo.com' },
    update: {},
    create: {
      name: 'Dr. Andi (Dosen)',
      email: 'dosen@demo.com',
      password: passwordHash,
      role: 'ADMIN',
      department: 'Teknik Informatika',
      nim_nip: '198001012005011001',
      phone: '082345678901',
    },
  });
  console.log('✅ Admin (Dosen) dibuat:', admin.email);

  // 3. User (Mahasiswa)
  const user = await prisma.user.upsert({
    where: { email: 'mahasiswa@demo.com' },
    update: {},
    create: {
      name: 'Siti (Mahasiswa)',
      email: 'mahasiswa@demo.com',
      password: passwordHash,
      role: 'USER',
      department: 'Teknik Informatika',
      nim_nip: '1234567890',
      phone: '083456789012',
    },
  });
  console.log('✅ User (Mahasiswa) dibuat:', user.email);

  console.log('\nSelesai! Anda dapat login menggunakan akun di atas.');
}

main()
  .catch((e) => {
    console.error('Error saat membuat akun demo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });