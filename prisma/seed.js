import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function readArg(args, key) {
  const idx = args.indexOf(key)
  if (idx === -1) return null
  const next = args[idx + 1]
  if (!next || next.startsWith('--')) return ''
  return next
}

function readNpmConfig(key) {
  const envKey = `npm_config_${key}`.replace(/-/g, '_')
  return process.env[envKey] || null
}

function usage() {
  return [
    'Seed akun role (tanpa mock konten):',
    '  npm run seed   (pakai ENV di .env)',
    '  npm run seed -- --super-email you@example.com --super-password "StrongPass123" --super-name "Super Admin"',
    '  npm run seed -- --super-email=you@example.com --super-password="StrongPass123" --super-name="Super Admin"',
    '  node prisma/seed.js --super-email you@example.com --super-password "StrongPass123" --super-name "Super Admin"',
    '  node prisma/seed.js you@example.com "StrongPass123" "Super Admin"',
    '',
    'Opsional:',
    '  --admin-email ... --admin-password ... --admin-name ...',
    '  --content-email ... --content-password ... --content-name ...',
    '',
    'Atau gunakan ENV:',
    '  SEED_SUPER_ADMIN_EMAIL, SEED_SUPER_ADMIN_PASSWORD, SEED_SUPER_ADMIN_NAME',
    '  SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME',
    '  SEED_CONTENT_ADMIN_EMAIL, SEED_CONTENT_ADMIN_PASSWORD, SEED_CONTENT_ADMIN_NAME',
  ].join('\n')
}

async function upsertUser({ email, password, name, role }) {
  if (!email || !password) return null
  const passwordHash = await bcrypt.hash(password, 12)
  return prisma.user.upsert({
    where: { email },
    update: { name: name || undefined, role: role || undefined, password: passwordHash },
    create: { email, name: name || email, role: role || 'USER', password: passwordHash },
  })
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage())
    return
  }

  const hasFlags = args.some((x) => x.startsWith('--'))
  const posEmail = !hasFlags ? (args[0] || null) : null
  const posPass = !hasFlags ? (args[1] || null) : null
  const posName = !hasFlags ? (args[2] || null) : null

  const superEmail =
    readArg(args, '--super-email') ||
    readNpmConfig('super-email') ||
    process.env.SEED_SUPER_ADMIN_EMAIL ||
    posEmail
  const superPass =
    readArg(args, '--super-password') ||
    readNpmConfig('super-password') ||
    process.env.SEED_SUPER_ADMIN_PASSWORD ||
    posPass
  const superName =
    readArg(args, '--super-name') ||
    readNpmConfig('super-name') ||
    process.env.SEED_SUPER_ADMIN_NAME ||
    posName

  const adminEmail = readArg(args, '--admin-email') || readNpmConfig('admin-email') || process.env.SEED_ADMIN_EMAIL
  const adminPass =
    readArg(args, '--admin-password') || readNpmConfig('admin-password') || process.env.SEED_ADMIN_PASSWORD
  const adminName = readArg(args, '--admin-name') || readNpmConfig('admin-name') || process.env.SEED_ADMIN_NAME

  const contentEmail =
    readArg(args, '--content-email') || readNpmConfig('content-email') || process.env.SEED_CONTENT_ADMIN_EMAIL
  const contentPass =
    readArg(args, '--content-password') || readNpmConfig('content-password') || process.env.SEED_CONTENT_ADMIN_PASSWORD
  const contentName =
    readArg(args, '--content-name') || readNpmConfig('content-name') || process.env.SEED_CONTENT_ADMIN_NAME

  if (!superEmail || !superPass) {
    console.error('Seeder butuh minimal SUPER_ADMIN (email + password).')
    console.log(usage())
    process.exitCode = 1
    return
  }

  const created = []

  const superAdmin = await upsertUser({ email: superEmail, password: superPass, name: superName, role: 'SUPER_ADMIN' })
  if (superAdmin) created.push({ role: 'SUPER_ADMIN', email: superAdmin.email })

  const admin = await upsertUser({ email: adminEmail, password: adminPass, name: adminName, role: 'ADMIN' })
  if (admin) created.push({ role: 'ADMIN', email: admin.email })

  const contentAdmin = await upsertUser({
    email: contentEmail,
    password: contentPass,
    name: contentName,
    role: 'CONTENT_ADMIN',
  })
  if (contentAdmin) created.push({ role: 'CONTENT_ADMIN', email: contentAdmin.email })

  console.log('Akun seeded:', created.map((x) => `${x.role}:${x.email}`).join(', '))
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

