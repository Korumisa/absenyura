import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Memulai seeder database...')

  // 1. Buat Setting Fakultas & Prodi
  console.log('Membuat data Fakultas dan Program Studi...')
  const facultyData = [
    {
      id: 'ftk',
      name: 'Fakultas Teknik dan Kejuruan',
      departments: [
        { id: 'pti', name: 'Pendidikan Teknik Informatika' },
        { id: 'si', name: 'Sistem Informasi' },
        { id: 'ilkom', name: 'Ilmu Komputer' },
      ],
    },
    {
      id: 'fmipa',
      name: 'Fakultas MIPA',
      departments: [
        { id: 'mat', name: 'Matematika' },
        { id: 'fis', name: 'Fisika' },
      ],
    },
  ]
  
  await prisma.setting.upsert({
    where: { key: 'FACULTIES_AND_DEPARTMENTS' },
    update: { value: JSON.stringify(facultyData) },
    create: { key: 'FACULTIES_AND_DEPARTMENTS', value: JSON.stringify(facultyData) },
  })

  // 2. Buat Super Admin
  console.log('Membuat akun Super Admin...')
  const hashedPassword = await bcrypt.hash('demo12345', 12)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@demo.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@demo.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      nim_nip: 'ADMIN-001',
      is_active: true,
    },
  })
  
  // 3. Buat Mahasiswa Dummy
  console.log('Membuat akun Mahasiswa dummy...')
  const mahasiswaPassword = await bcrypt.hash('demo12345', 12)
  const mahasiswa = await prisma.user.upsert({
    where: { email: 'mahasiswa@demo.com' },
    update: {},
    create: {
      name: 'Mahasiswa Demo',
      email: 'mahasiswa@demo.com',
      password: mahasiswaPassword,
      role: 'USER',
      nim_nip: '2115051000',
      department: 'Pendidikan Teknik Informatika',
      semester: 5,
      is_active: true,
    },
  })

  // 4. Buat Lokasi Kampus (Geofencing)
  console.log('Membuat data Lokasi Kampus (Undiksha)...')
  const lokasi = await prisma.location.upsert({
    where: { id: 'loc-undiksha' },
    update: {},
    create: {
      id: 'loc-undiksha',
      name: 'Kampus Tengah Undiksha',
      latitude: -8.1158, // Ganti dengan koordinat asli
      longitude: 115.0886,
      radius: 100,
      created_by: superAdmin.id,
    },
  })

  // 5. Buat Kelas Kuliah
  console.log('Membuat data Kelas Kuliah...')
  const kelas = await prisma.class.upsert({
    where: { id: 'class-pti-5a' },
    update: {},
    create: {
      id: 'class-pti-5a',
      name: 'PTI 5A - Rekayasa Perangkat Lunak',
      lecturer_id: superAdmin.id,
    },
  })

  // Daftarkan mahasiswa ke kelas tersebut
  const existingEnrollment = await prisma.classEnrollment.findFirst({
    where: { class_id: kelas.id, student_id: mahasiswa.id }
  })
  if (!existingEnrollment) {
    await prisma.classEnrollment.create({
      data: { class_id: kelas.id, student_id: mahasiswa.id }
    })
  }

  // 6. Buat Sesi Absensi Aktif
  console.log('Membuat Sesi Kehadiran Aktif...')
  // Hapus sesi lama agar tidak duplikat QR token
  await prisma.session.deleteMany({ where: { title: 'Pertemuan 1 - RPL' } })
  
  const now = new Date()
  const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000)

  await prisma.session.create({
    data: {
      title: 'Pertemuan 1 - RPL',
      description: 'Pengenalan Rekayasa Perangkat Lunak',
      session_start: now, // Mulai sekarang
      session_end: twoHoursLater, // Berakhir 2 jam lagi
      check_in_open_at: now,
      check_in_close_at: twoHoursLater,
      qr_mode: 'STATIC',
      qr_token: 'STATIC-QR-RPL-001',
      qr_secret: 'STATIC-SECRET',
      created_by_id: superAdmin.id,
      location_id: lokasi.id,
      class_id: kelas.id,
      status: 'ACTIVE',
    },
  })

  console.log('✅ Seeding selesai! Database siap digunakan.')
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })