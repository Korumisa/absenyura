import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

const prisma = new PrismaClient()

function readArg(args, key) {
  const idx = args.indexOf(key)
  if (idx === -1) return null
  const next = args[idx + 1]
  if (!next || next.startsWith('--')) return ''
  return next
}

function hasFlag(args, key) {
  if (args.includes(key)) return true
  const prefix = `${key}=`
  const found = args.find((x) => x.startsWith(prefix))
  if (!found) return false
  const raw = found.slice(prefix.length).trim().toLowerCase()
  if (!raw) return true
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'y' || raw === 'on'
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
    'Seed data Public Site (opsional, tanpa postingan demo):',
    '  SEED_PUBLIC_SITE=1 SEED_PUBLIC_ORG_NAME="..." SEED_PUBLIC_CAMPUS_NAME="..." npm run seed',
    '  npm run seed -- --seed-public-site --public-org-name "..." --public-campus-name "..."',
    '',
    'Opsional:',
    '  --admin-email ... --admin-password ... --admin-name ...',
    '  --content-email ... --content-password ... --content-name ...',
    '',
    'Atau gunakan ENV:',
    '  SEED_SUPER_ADMIN_EMAIL, SEED_SUPER_ADMIN_PASSWORD, SEED_SUPER_ADMIN_NAME',
    '  SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME',
    '  SEED_CONTENT_ADMIN_EMAIL, SEED_CONTENT_ADMIN_PASSWORD, SEED_CONTENT_ADMIN_NAME',
    '',
    'ENV Public Site:',
    '  SEED_PUBLIC_SITE=1',
    '  SEED_PUBLIC_ORG_NAME, SEED_PUBLIC_CAMPUS_NAME',
    '  (opsional) SEED_PUBLIC_KABINET_NAME, SEED_PUBLIC_KABINET_PERIOD',
    '  (opsional) SEED_PUBLIC_LOGO_LIGHT_URL, SEED_PUBLIC_LOGO_DARK_URL, SEED_PUBLIC_PRIMARY_COLOR',
    '  (opsional) SEED_PUBLIC_INSTAGRAM_URL, SEED_PUBLIC_TIKTOK_URL, SEED_PUBLIC_YOUTUBE_URL',
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

async function seedPublicSite({ orgName, campusName, kabName, kabPeriod, logoLightUrl, logoDarkUrl, primaryColor, instagramUrl, tiktokUrl, youtubeUrl }) {
  const existingProfile = await prisma.publicSiteProfile.findFirst({ orderBy: { created_at: 'asc' } })

  if (!existingProfile) {
    if (!orgName || !campusName) {
      console.error('Seed public site butuh minimal SEED_PUBLIC_ORG_NAME dan SEED_PUBLIC_CAMPUS_NAME (atau flags).')
      process.exitCode = 1
      return { profile: 'skipped', categories: 0 }
    }
    await prisma.publicSiteProfile.create({
      data: {
        org_name: orgName,
        campus_name: campusName,
        kabinet_name: kabName || null,
        kabinet_period: kabPeriod || null,
        logo_light_url: logoLightUrl || null,
        logo_dark_url: logoDarkUrl || null,
        primary_color: primaryColor || null,
        instagram_url: instagramUrl || null,
        tiktok_url: tiktokUrl || null,
        youtube_url: youtubeUrl || null,
      },
    })
  }

  const categories = [
    { name: 'Berita', slug: 'berita' },
    { name: 'Kegiatan', slug: 'kegiatan' },
    { name: 'Informasi Lomba', slug: 'informasi-lomba' },
    { name: 'Pengumuman', slug: 'pengumuman' },
  ]

  const result = await prisma.publicCategory.createMany({
    data: categories,
    skipDuplicates: true,
  })

  return { profile: existingProfile ? 'exists' : 'created', categories: result.count || 0 }
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

  const seedPublic =
    hasFlag(args, '--seed-public-site') ||
    hasFlag(args, '--seed-public') ||
    (String(process.env.SEED_PUBLIC_SITE || '').trim() === '1' || String(process.env.SEED_PUBLIC_SITE || '').trim().toLowerCase() === 'true')

  const publicOrgName = readArg(args, '--public-org-name') || readNpmConfig('public-org-name') || process.env.SEED_PUBLIC_ORG_NAME
  const publicCampusName =
    readArg(args, '--public-campus-name') || readNpmConfig('public-campus-name') || process.env.SEED_PUBLIC_CAMPUS_NAME
  const publicKabName = readArg(args, '--public-kabinet-name') || readNpmConfig('public-kabinet-name') || process.env.SEED_PUBLIC_KABINET_NAME
  const publicKabPeriod =
    readArg(args, '--public-kabinet-period') || readNpmConfig('public-kabinet-period') || process.env.SEED_PUBLIC_KABINET_PERIOD
  const publicLogoLight =
    readArg(args, '--public-logo-light-url') || readNpmConfig('public-logo-light-url') || process.env.SEED_PUBLIC_LOGO_LIGHT_URL
  const publicLogoDark =
    readArg(args, '--public-logo-dark-url') || readNpmConfig('public-logo-dark-url') || process.env.SEED_PUBLIC_LOGO_DARK_URL
  const publicPrimaryColor =
    readArg(args, '--public-primary-color') || readNpmConfig('public-primary-color') || process.env.SEED_PUBLIC_PRIMARY_COLOR
  const publicInstagram =
    readArg(args, '--public-instagram-url') || readNpmConfig('public-instagram-url') || process.env.SEED_PUBLIC_INSTAGRAM_URL
  const publicTiktok =
    readArg(args, '--public-tiktok-url') || readNpmConfig('public-tiktok-url') || process.env.SEED_PUBLIC_TIKTOK_URL
  const publicYoutube =
    readArg(args, '--public-youtube-url') || readNpmConfig('public-youtube-url') || process.env.SEED_PUBLIC_YOUTUBE_URL

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

  if (seedPublic) {
    const seeded = await seedPublicSite({
      orgName: publicOrgName ? String(publicOrgName).trim() : null,
      campusName: publicCampusName ? String(publicCampusName).trim() : null,
      kabName: publicKabName ? String(publicKabName).trim() : null,
      kabPeriod: publicKabPeriod ? String(publicKabPeriod).trim() : null,
      logoLightUrl: publicLogoLight ? String(publicLogoLight).trim() : null,
      logoDarkUrl: publicLogoDark ? String(publicLogoDark).trim() : null,
      primaryColor: publicPrimaryColor ? String(publicPrimaryColor).trim() : null,
      instagramUrl: publicInstagram ? String(publicInstagram).trim() : null,
      tiktokUrl: publicTiktok ? String(publicTiktok).trim() : null,
      youtubeUrl: publicYoutube ? String(publicYoutube).trim() : null,
    })
    console.log(`Public site seeded: profile=${seeded.profile}, categories_added=${seeded.categories}`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

