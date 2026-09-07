import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

function readArg(args, key) {
  const idx = args.indexOf(key);
  if (idx === -1) return null;
  const next = args[idx + 1];
  if (!next || next.startsWith('--')) return '';
  return next;
}

function hasFlag(args, key) {
  if (args.includes(key)) return true;
  const prefix = `${key}=`;
  const found = args.find((x) => x.startsWith(prefix));
  if (!found) return false;
  const raw = found.slice(prefix.length).trim().toLowerCase();
  if (!raw) return true;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'y' || raw === 'on';
}

function readNpmConfig(key) {
  const envKey = `npm_config_${key}`.replace(/-/g, '_');
  return process.env[envKey] || null;
}

function usage() {
  return [
    'Seed akun role (tanpa mock konten):',
    '  npm run seed   (pakai ENV di .env)',
    '  npm run seed -- --super-email you@example.com --super-password "StrongPass123" --super-name "Super Admin" --super-nim 198001012005011001',
    '  npm run seed -- --super-email=you@example.com --super-password="StrongPass123" --super-name="Super Admin" --super-nim=198001012005011001',
    '  node prisma/seed.js --super-email you@example.com --super-password "StrongPass123" --super-name "Super Admin" --super-nim 198001012005011001',
    '  node prisma/seed.js you@example.com "StrongPass123" "Super Admin" 198001012005011001',
    '',
    'Seed data Public Site (opsional, tanpa postingan demo):',
    '  SEED_PUBLIC_SITE=1 SEED_PUBLIC_ORG_NAME="..." SEED_PUBLIC_CAMPUS_NAME="..." npm run seed',
    '  npm run seed -- --seed-public-site --public-org-name "..." --public-campus-name "..."',
    '',
    'Opsional:',
    '  --admin-email ... --admin-password ... --admin-name ... --admin-nim ...',
    '  --content-email ... --content-password ... --content-name ... --content-nim ...',
    '',
    'Atau gunakan ENV:',
    '  SEED_SUPER_ADMIN_EMAIL, SEED_SUPER_ADMIN_PASSWORD, SEED_SUPER_ADMIN_NAME, SEED_SUPER_ADMIN_NIM_NIP',
    '  SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME, SEED_ADMIN_NIM_NIP',
    '  SEED_CONTENT_ADMIN_EMAIL, SEED_CONTENT_ADMIN_PASSWORD, SEED_CONTENT_ADMIN_NAME, SEED_CONTENT_ADMIN_NIM_NIP',
    '',
    'ENV Public Site:',
    '  SEED_PUBLIC_SITE=1',
    '  SEED_PUBLIC_ORG_NAME, SEED_PUBLIC_CAMPUS_NAME',
    '  (opsional) SEED_PUBLIC_KABINET_NAME, SEED_PUBLIC_KABINET_PERIOD',
    '  (opsional) SEED_PUBLIC_LOGO_LIGHT_URL, SEED_PUBLIC_LOGO_DARK_URL, SEED_PUBLIC_PRIMARY_COLOR',
    '  (opsional) SEED_PUBLIC_INSTAGRAM_URL, SEED_PUBLIC_TIKTOK_URL, SEED_PUBLIC_YOUTUBE_URL',
    '',
    'Seed DATA MOCK Landing Page DEMO (postingan, kabinet, program, galeri, oprec):',
    '  SEED_LANDING_MOCK=1 npm run seed   (atau --seed-landing-mock)',
    '  *Idempotent: aman dijalankan berkali-kali (row tidak berganda)',
    '  *ID sinkron dengan mockLandingData.ts frontend (mock-berita-1, mock-p1, dll)',
  ].join('\n');
}

async function upsertUser({ email, password, name, role, nimNip }) {
  if (!email || !password || !nimNip) return null;
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: {
      name: name || undefined,
      role: role || undefined,
      password: passwordHash,
      nim_nip: nimNip,
    },
    create: {
      email,
      name: name || email,
      role: role || 'USER',
      password: passwordHash,
      nim_nip: nimNip,
    },
  });
}

async function seedPublicSite({
  orgName,
  campusName,
  kabName,
  kabPeriod,
  logoLightUrl,
  logoDarkUrl,
  primaryColor,
  instagramUrl,
  tiktokUrl,
  youtubeUrl,
}) {
  const existingProfile = await prisma.publicSiteProfile.findFirst({
    orderBy: { created_at: 'asc' },
  });

  if (!existingProfile) {
    if (!orgName || !campusName) {
      console.error(
        'Seed public site butuh minimal SEED_PUBLIC_ORG_NAME dan SEED_PUBLIC_CAMPUS_NAME (atau flags).'
      );
      process.exitCode = 1;
      return { profile: 'skipped', categories: 0 };
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
    });
  }

  const categories = [
    { name: 'Berita', slug: 'berita' },
    { name: 'Kegiatan', slug: 'kegiatan' },
    { name: 'Informasi Lomba', slug: 'informasi-lomba' },
    { name: 'Pengumuman', slug: 'pengumuman' },
  ];

  const result = await prisma.publicCategory.createMany({
    data: categories,
    skipDuplicates: true,
  });

  return { profile: existingProfile ? 'exists' : 'created', categories: result.count || 0 };
}

const DAY_MS = 86400000;
const daysAgo = (n) => new Date(Date.now() - n * DAY_MS);
const enc = encodeURIComponent;
const imgLandscape = (p) =>
  `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${enc(p)}&image_size=landscape_16_9`;
const imgPortrait = (p) =>
  `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${enc(p)}&image_size=portrait_4_3`;
const imgSquareHD = (p) =>
  `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${enc(p)}&image_size=square_hd`;

async function createOrSkip(modelName, id, data) {
  const existing = await prisma[modelName].findUnique({ where: { id } });
  if (existing) return { status: 'exists', id };
  await prisma[modelName].create({ data });
  return { status: 'created', id };
}

async function seedLandingMock() {
  const profileId = 'mock-profile';
  const profileData = {
    id: profileId,
    org_name: 'Himpunan Mahasiswa SDP Undiksha',
    campus_name: 'Universitas Pendidikan Ganesha',
    kabinet_name: 'Kabinet Sinergi Nirmala',
    kabinet_period: '2025/2026',
    hero_subtitle:
      'Sinergi, Karya, dan Prestasi untuk Nusa — Himpunan Mahasiswa Sistem dan Teknologi Informasi, Undiksha Denpasar',
    home_image_url: imgLandscape(
      'Indonesian Balinese university modern campus building with students in front, golden hour sunset, green lush palm trees, purple violet accent sky, cinematic wide shot'
    ),
    youtube_embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    about_title: 'Tentang HM SDP Undiksha',
    about_content:
      'Himpunan Mahasiswa Sistem dan Teknologi Informasi (HM SDP) FTIK Undiksha adalah organisasi kemahasiswaan yang menaungi seluruh mahasiswa S-1 Sistem Informasi, S-1 Pendidikan Teknologi Informasi, dan S-1 Teknologi Rekayasa Perangkat Lunak di Kampus Denpasar.',
    home_card_left_title: '94% Anggota Lulus Tepat Waktu',
    home_card_left_body:
      'Dengan dukungan akademik terstruktur, mentoring senior lintas angkatan, dan program belajar bersama, tingkat kelulusan tepat waktu HM SDP secara konsisten berada di atas rata-rata FTIK Undiksha.',
    home_card_right_title: '41+ Prestasi Nasional & Internasional',
    home_card_right_body:
      'Lomba programming, hackathon bali, riset aplikasi, dan debat ilmiah — setiap tahun delegasi HM SDP membawa pulang prestasi bergengsi di tingkat regional, nasional, dan internasional.',
    vision:
      'Menjadi himpunan mahasiswa bidang sistem informasi unggul di Pulau Dewata yang menghasilkan lulusan kompeten, berkarakter Pancasila, dan siap berkontribusi di era digital.',
    mission:
      '1. Menyediakan wadah pengembangan akademik dan non-akademik bagi seluruh anggota.\n2. Menjalin sinergi dengan pihak kampus, alumni, dan industri regional Bali & Nusa Tenggara.\n3. Mendorong budaya riset, inovasi, dan kewirausahaan berbasis teknologi lokal Bali.\n4. Berperan aktif dalam pengabdian masyarakat desa adat dan sekolah di 9 kabupaten Bali.',
    visi_photo_url: imgPortrait(
      'Indonesian Balinese male university student ketua umum headshot, formal batik purple background, confident friendly, corporate portrait style'
    ),
    visi_name: 'I Komang Rizky Pratama, S.Pd.',
    visi_role: 'Ketua Umum Kabinet Sinergi Nirmala 2025/2026',
    misi_photo_url: imgPortrait(
      'Indonesian Balinese female university student wakil ketua headshot, traditional songket fabric purple accent, warm smile, corporate portrait style'
    ),
    misi_name: 'Anak Agung Ayu Anindya Maharani',
    misi_role: 'Wakil Ketua Umum Kabinet Sinergi Nirmala 2025/2026',
    footer_tagline: 'HM SDP Undiksha — Kabinet Sinergi Nirmala 2025/2026. Atma Siddhi Wiweka.',
    instagram_url: 'https://instagram.com/hmsdp.undiksha',
    tiktok_url: 'https://tiktok.com/@hmsdp.undiksha',
    youtube_url: 'https://youtube.com/@HMSDP-Undiksha',
    address: 'Jl. Udayana No. 12, Gedung FTIK Lt. 3 Kampus Bukit Jimbaran, Denpasar, Bali 80361',
    email: 'hmsdp@ftik.undiksha.ac.id',
    phone: '+62 812-3661-4477',
    logo_light_url: imgSquareHD(
      'Minimalist balinese tech university student association logo, letter HM SDP monogram with lotus flower mark, purple violet and gold palette, clean flat vector logo design'
    ),
    logo_dark_url: imgSquareHD(
      'Minimalist balinese tech university student association logo, letter HM SDP monogram with lotus mark, white and soft purple gradient on dark background, clean vector'
    ),
    primary_color: '#7c3aed',
    created_at: daysAgo(120),
    updated_at: daysAgo(14),
  };
  await createOrSkip('publicSiteProfile', profileId, profileData);

  const categories = [
    {
      id: 'cat-berita-utama',
      name: 'Berita Utama',
      slug: 'berita-utama',
      created_at: daysAgo(200),
      updated_at: daysAgo(200),
    },
    {
      id: 'cat-prestasi',
      name: 'Prestasi',
      slug: 'prestasi',
      created_at: daysAgo(200),
      updated_at: daysAgo(200),
    },
    {
      id: 'cat-kampus',
      name: 'Kampus',
      slug: 'kampus',
      created_at: daysAgo(200),
      updated_at: daysAgo(200),
    },
    {
      id: 'cat-kegiatan',
      name: 'Kegiatan Internal',
      slug: 'kegiatan-internal',
      created_at: daysAgo(200),
      updated_at: daysAgo(200),
    },
    {
      id: 'cat-pengumuman',
      name: 'Pengumuman',
      slug: 'pengumuman',
      created_at: daysAgo(200),
      updated_at: daysAgo(200),
    },
    {
      id: 'cat-lomba',
      name: 'Lomba',
      slug: 'lomba',
      created_at: daysAgo(200),
      updated_at: daysAgo(200),
    },
  ];
  const catCreated = await prisma.publicCategory.createMany({
    data: categories,
    skipDuplicates: true,
  });

  const cabinets = [
    {
      id: 'mock-cabinet-1',
      name: 'Kabinet Sinergi Nirmala',
      period: '2025/2026',
      is_active: true,
      sort_order: 1,
      created_at: daysAgo(180),
      updated_at: daysAgo(30),
    },
    {
      id: 'mock-cabinet-2',
      name: 'Kabinet Arkatama Restorasi',
      period: '2024/2025',
      is_active: false,
      sort_order: 2,
      created_at: daysAgo(520),
      updated_at: daysAgo(400),
    },
  ];
  for (const c of cabinets) await createOrSkip('publicStructureCabinet', c.id, c);

  const groups = [
    {
      id: 'mock-group-core-1',
      cabinet_id: 'mock-cabinet-1',
      title: 'Inti Kabinet',
      sort_order: 1,
      is_core: true,
      created_at: daysAgo(170),
      updated_at: daysAgo(160),
    },
    {
      id: 'mock-group-div-1-0',
      cabinet_id: 'mock-cabinet-1',
      title: 'Divisi Riset & Teknologi (Litbang)',
      sort_order: 20,
      is_core: false,
      created_at: daysAgo(160),
      updated_at: daysAgo(150),
    },
    {
      id: 'mock-group-div-1-1',
      cabinet_id: 'mock-cabinet-1',
      title: 'Divisi Komunikasi & Informasi (Kominfo)',
      sort_order: 30,
      is_core: false,
      created_at: daysAgo(160),
      updated_at: daysAgo(150),
    },
    {
      id: 'mock-group-div-1-2',
      cabinet_id: 'mock-cabinet-1',
      title: 'Divisi Pengembangan SDM (PSDM)',
      sort_order: 40,
      is_core: false,
      created_at: daysAgo(160),
      updated_at: daysAgo(150),
    },
    {
      id: 'mock-group-div-1-3',
      cabinet_id: 'mock-cabinet-1',
      title: 'Divisi Hubungan Masyarakat (Humas)',
      sort_order: 50,
      is_core: false,
      created_at: daysAgo(160),
      updated_at: daysAgo(150),
    },
    {
      id: 'mock-group-div-1-4',
      cabinet_id: 'mock-cabinet-1',
      title: 'Divisi Kewirausahaan (Kwu)',
      sort_order: 60,
      is_core: false,
      created_at: daysAgo(160),
      updated_at: daysAgo(150),
    },
    {
      id: 'mock-group-div-1-5',
      cabinet_id: 'mock-cabinet-1',
      title: 'Divisi Pengabdian Masyarakat (Pengmas)',
      sort_order: 70,
      is_core: false,
      created_at: daysAgo(160),
      updated_at: daysAgo(150),
    },
    {
      id: 'mock-group-core-2',
      cabinet_id: 'mock-cabinet-2',
      title: 'Inti Kabinet (Periode Lalu)',
      sort_order: 1,
      is_core: true,
      created_at: daysAgo(500),
      updated_at: daysAgo(400),
    },
    {
      id: 'mock-group-div-2-litbang',
      cabinet_id: 'mock-cabinet-2',
      title: 'Divisi Litbang (Arkatama)',
      sort_order: 10,
      is_core: false,
      created_at: daysAgo(490),
      updated_at: daysAgo(390),
    },
    {
      id: 'mock-group-div-2-kominfo',
      cabinet_id: 'mock-cabinet-2',
      title: 'Divisi Kominfo (Arkatama)',
      sort_order: 20,
      is_core: false,
      created_at: daysAgo(490),
      updated_at: daysAgo(390),
    },
  ];
  for (const g of groups) await createOrSkip('publicStructureGroup', g.id, g);

  const memberRow = (id, group_id, name, role, photoPrompt, isSpotlight, sortOrder, days) => ({
    id,
    group_id,
    name,
    role,
    photo_url: imgPortrait(photoPrompt),
    is_spotlight: Boolean(isSpotlight),
    sort_order: sortOrder,
    created_at: daysAgo(days),
    updated_at: daysAgo(days),
  });
  const members = [
    memberRow(
      'mock-member-core-0',
      'mock-group-core-1',
      'I Komang Rizky Pratama',
      'Ketua Umum',
      'Balinese male university ketua umum headshot, batik purple, confident, modern office',
      true,
      1,
      170
    ),
    memberRow(
      'mock-member-core-1',
      'mock-group-core-1',
      'Anak Agung Ayu Anindya Maharani',
      'Wakil Ketua Umum',
      'Balinese female wakil ketua headshot, friendly smile, songket purple accent background',
      true,
      2,
      170
    ),
    memberRow(
      'mock-member-core-2',
      'mock-group-core-1',
      'I Kadek Dimas Nugraha',
      'Sekretaris Jenderal',
      'Young Indonesian male secretary portrait, office look, light purple background',
      false,
      3,
      165
    ),
    memberRow(
      'mock-member-core-3',
      'mock-group-core-1',
      'Ni Wayan Maya Ayu Lestari',
      'Bendahara',
      'Young Indonesian female treasurer portrait, cheerful, purple frame',
      false,
      4,
      165
    ),
    memberRow(
      'mock-member-div1-0-0',
      'mock-group-div-1-0',
      'I Made Bayu Saputra',
      'Kepala Divisi',
      'Balinese male division head portrait, serious, purple office',
      false,
      1,
      160
    ),
    memberRow(
      'mock-member-div1-0-1',
      'mock-group-div-1-0',
      'Ni Kadek Clarissa Pramesti',
      'Anggota Litbang',
      'Indonesian female programmer coding laptop portrait',
      false,
      2,
      150
    ),
    memberRow(
      'mock-member-div1-0-2',
      'mock-group-div-1-0',
      'I Putu Farhan Maulana Wijaya',
      'Anggota Litbang',
      'Indonesian male researcher portrait holding tablet',
      false,
      3,
      150
    ),
    memberRow(
      'mock-member-div1-1-0',
      'mock-group-div-1-1',
      'Desak Putu Talitha Ananda',
      'Kepala Divisi',
      'Balinese female marketing head portrait holding camera',
      false,
      1,
      160
    ),
    memberRow(
      'mock-member-div1-1-1',
      'mock-group-div-1-1',
      'I Nyoman Bagas Pramartha',
      'Anggota Kominfo',
      'Male videographer holding gimbal camera portrait',
      false,
      2,
      150
    ),
    memberRow(
      'mock-member-div1-1-2',
      'mock-group-div-1-1',
      'Ni Luh Citra Dewi Santi',
      'Anggota Kominfo',
      'Female graphic designer digital art tablet portrait',
      false,
      3,
      150
    ),
    memberRow(
      'mock-member-div1-2-0',
      'mock-group-div-1-2',
      'Samuel Tanujaya',
      'Kepala Divisi',
      'Indonesian male HR head portrait, leadership, office',
      false,
      1,
      160
    ),
    memberRow(
      'mock-member-div1-2-1',
      'mock-group-div-1-2',
      'Rara Kusumawardhani',
      'Anggota PSDM',
      'Female mentor mentoring student portrait cheerful',
      false,
      2,
      150
    ),
    memberRow(
      'mock-member-div1-2-2',
      'mock-group-div-1-2',
      'Yoga Prasetya Adi',
      'Anggota PSDM',
      'Male trainer flip chart seminar room portrait',
      false,
      3,
      150
    ),
    memberRow(
      'mock-member-div1-3-0',
      'mock-group-div-1-3',
      'Jesica Halim Santoso',
      'Kepala Divisi',
      'Indonesian female PR head portrait, professional',
      false,
      1,
      160
    ),
    memberRow(
      'mock-member-div1-3-1',
      'mock-group-div-1-3',
      'Rendy Kurniawan',
      'Anggota Humas',
      'Male event organizer venue check portrait smile',
      false,
      2,
      150
    ),
    memberRow(
      'mock-member-div1-3-2',
      'mock-group-div-1-3',
      'Bunga Azzahra Putri',
      'Anggota Humas',
      'Female campus ambassador poster event portrait',
      false,
      3,
      150
    ),
    memberRow(
      'mock-member-div1-4-0',
      'mock-group-div-1-4',
      'Vincent Wijaya',
      'Kepala Divisi',
      'Indonesian young entrepreneur headshot, startup vibe',
      false,
      1,
      160
    ),
    memberRow(
      'mock-member-div1-4-1',
      'mock-group-div-1-4',
      'Olivia Gunawan Effendi',
      'Anggota Kwu',
      'Female online seller packing product portrait',
      false,
      2,
      150
    ),
    memberRow(
      'mock-member-div1-4-2',
      'mock-group-div-1-4',
      'Alfaro Hermawan',
      'Anggota Kwu',
      'Male fintech pitch deck presentation portrait',
      false,
      3,
      150
    ),
    memberRow(
      'mock-member-div1-5-0',
      'mock-group-div-1-5',
      'Ni Nyoman Nadia Permatasari',
      'Kepala Divisi',
      'Balinese female community service head portrait village background',
      false,
      1,
      160
    ),
    memberRow(
      'mock-member-div1-5-1',
      'mock-group-div-1-5',
      'I Made Fajar Ramadhan',
      'Anggota Pengmas',
      'Male volunteer teaching children village portrait',
      false,
      2,
      150
    ),
    memberRow(
      'mock-member-div1-5-2',
      'mock-group-div-1-5',
      'Desak Made Mawar Sari',
      'Anggota Pengmas',
      'Female medical volunteer health check portrait rural',
      false,
      3,
      150
    ),
    memberRow(
      'mock-member-core2-0',
      'mock-group-core-2',
      'Gusti Ngurah Aditya Prana',
      'Ketua Umum 2024/2025',
      'Balinese male alumni ketua umum headshot formal dark suit purple background',
      true,
      1,
      500
    ),
    memberRow(
      'mock-member-core2-1',
      'mock-group-core-2',
      'Ida Ayu Putu Mira Darmayanti',
      'Wakil Ketua Umum 2024/2025',
      'Balinese female alumni wakil headshot professional blazer purple',
      true,
      2,
      500
    ),
    memberRow(
      'mock-member-core2-2',
      'mock-group-core-2',
      'Agus Suteja',
      'Sekretaris Jenderal',
      'Male alumni secretary portrait glasses formal',
      false,
      3,
      495
    ),
    memberRow(
      'mock-member-core2-3',
      'mock-group-core-2',
      'Dewi Lestari',
      'Bendahara',
      'Female alumni treasurer portrait smile purple background',
      false,
      4,
      495
    ),
    memberRow(
      'mock-member-div2-litbang-0',
      'mock-group-div-2-litbang',
      'Kevin Sanjaya',
      'Kepala Divisi',
      'Young balinese male alumni division head soft smile portrait',
      false,
      1,
      490
    ),
    memberRow(
      'mock-member-div2-litbang-1',
      'mock-group-div-2-litbang',
      'Dinda Permata',
      'Anggota Litbang',
      'Balinese female alumni portrait laptop programming',
      false,
      2,
      485
    ),
    memberRow(
      'mock-member-div2-kominfo-0',
      'mock-group-div-2-kominfo',
      'Maria Theophila',
      'Kepala Divisi',
      'Young female alumni marketing head portrait camera',
      false,
      1,
      490
    ),
    memberRow(
      'mock-member-div2-kominfo-1',
      'mock-group-div-2-kominfo',
      'Reza Pahlevi',
      'Anggota Kominfo',
      'Male alumni designer portrait graphic tablet',
      false,
      2,
      485
    ),
  ];
  const memCreated = await prisma.publicStructureMember.createMany({
    data: members,
    skipDuplicates: true,
  });

  const programs = [
    {
      id: 'mock-p1',
      title: 'Bootcamp Web Developer Professional (React + Node.js)',
      date_range: '15 September – 15 November 2025',
      description:
        'Pelatihan intensive 2 bulan full-stack web development dengan mentor industri aktif, diakhiri job-connect mini-hackathon. Kuota 60 peserta mahasiswa FTIK.',
      is_published: true,
      created_at: daysAgo(61),
      updated_at: daysAgo(8),
    },
    {
      id: 'mock-p2',
      title: 'TechTalk: AI Generatif & Etika Penggunaan di Dunia Akademik',
      date_range: '18 September 2025 | 14:00 WITA',
      description:
        'Seminar nasional menghadirkan peneliti AI Udayana dan praktisi dari Grab Indonesia.',
      is_published: true,
      created_at: daysAgo(62),
      updated_at: daysAgo(9),
    },
    {
      id: 'mock-p3',
      title: 'CodeComp HM SDP Cup 2025 — Kompetisi Algoritma Tingkat Bali',
      date_range: '1 – 10 Oktober 2025',
      description:
        'Kompetisi pemrograman mahasiswa informatika se-Bali dan Nusa Tenggara. Total hadiah Rp 12.000.000.',
      is_published: true,
      created_at: daysAgo(63),
      updated_at: daysAgo(10),
    },
    {
      id: 'mock-p4',
      title: 'Kuliah Kerja Nyata Tematik: TIK untuk Desa Adat',
      date_range: 'Oktober – Desember 2025',
      description:
        'Program KKN tematik HM SDP — mengajar TIK di 4 desa adat Kabupaten Tabanan dan Badung.',
      is_published: true,
      created_at: daysAgo(64),
      updated_at: daysAgo(11),
    },
    {
      id: 'mock-p5',
      title: 'Startup Sprint 9 Hari: Pitch Your Idea',
      date_range: '27 September – 5 Oktober 2025',
      description:
        'Pre-inkubasi startup: validasi ide, bangun MVP, presentasi ke angel investor Bali.',
      is_published: true,
      created_at: daysAgo(65),
      updated_at: daysAgo(12),
    },
    {
      id: 'mock-p6',
      title: 'Study Club OSN & Competitive Programming',
      date_range: 'Setiap Sabtu Pagi (Agustus – Desember 2025)',
      description: 'Pembinaan rutin algoritma competitive programming untuk OSN, Gemastik, ICPC.',
      is_published: true,
      created_at: daysAgo(66),
      updated_at: daysAgo(13),
    },
    {
      id: 'mock-p7',
      title: 'Alumni Homecoming & Career Day FTIK 2025',
      date_range: '22 November 2025',
      description: 'Kumpul alumni lintas angkatan + career fair 30+ perusahaan partner teknologi.',
      is_published: true,
      created_at: daysAgo(67),
      updated_at: daysAgo(14),
    },
    {
      id: 'mock-p8',
      title: 'Festival Sinergi Nirmala: Pameran Karya & Pentas Seni',
      date_range: '13 – 14 Desember 2025',
      description: 'Acara puncak akhir tahun Kabinet Sinergi Nirmala.',
      is_published: true,
      created_at: daysAgo(68),
      updated_at: daysAgo(15),
    },
    {
      id: 'mock-p9',
      title: 'Program Belajar Bersama (PBB) Semester Ganjil 2025/2026',
      date_range: null,
      description: null,
      is_published: true,
      created_at: daysAgo(69),
      updated_at: daysAgo(16),
    },
  ];
  const progCreated = await prisma.publicProgram.createMany({
    data: programs,
    skipDuplicates: true,
  });

  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]));
  const postRow = (
    id,
    type,
    title,
    slug,
    date_label,
    status,
    excerpt,
    content,
    coverPrompt,
    catSlug,
    pd,
    formUrl = null
  ) => ({
    id,
    type,
    title,
    slug,
    date_label,
    status,
    form_url: formUrl,
    excerpt,
    content,
    cover_image_url: imgLandscape(coverPrompt),
    category_id: catBySlug[catSlug] ?? null,
    is_published: true,
    published_at: daysAgo(pd),
    created_at: daysAgo(pd + 1),
    updated_at: daysAgo(pd),
  });
  const posts = [
    postRow(
      'mock-berita-1',
      'BERITA',
      'HM SDP Borong 5 Medali di Gemastik XVII 2024 Yogyakarta',
      'gemastik-xvii-medali-2024',
      '12 Juli 2025',
      'PUBLIKASI',
      'Tim delegasi HM SDP Undiksha meraih 5 medali.',
      '<p>Alhamdulillah perjalanan kompetisi 5 hari di Yogyakarta membuahkan hasil manis.</p>',
      'Indonesian university students team on Gemastik competition stage receiving gold trophy medals, confetti falling, joyful purple gold celebration atmosphere',
      'prestasi',
      60
    ),
    postRow(
      'mock-berita-2',
      'BERITA',
      'Penandatangan MoU HM SDP dengan AWS Indonesia Cloud Program',
      'mou-hmsdp-aws-cloud',
      '30 Juli 2025',
      'PUBLIKASI',
      'Nota kesepahaman resmi: 200 mahasiswa FTIK mendapatkan pelatihan AWS Cloud Practitioner.',
      '<p>Kelas daring 8 pertemuan + biaya ujian sertifikasi ditanggung program kerja HM SDP.</p>',
      'MOU signing ceremony university student org and AWS Indonesia representative, exchanging documents, corporate meeting purple accent, AWS logo screen',
      'kampus',
      35
    ),
    postRow(
      'mock-berita-3',
      'BERITA',
      'Juara 1 Hackathon Fintech Bali Regional 2025',
      'juara-1-hackathon-fintech-bali',
      '21 Agustus 2025',
      'PUBLIKASI',
      'Tim KiriKiri.Uang dari HM SDP juara pertama Hackathon Fintech Denpasar.',
      '<p>Hadiah utama pendanaan pre-seed Rp 50 juta dan inkubasi 6 bulan di Bali Tech Hub.</p>',
      'Champion team winning hackathon competition Bali, giant check money prize, big smile thumbs up, purple tech stage, fintech banner backdrop',
      'prestasi',
      13
    ),
    postRow(
      'mock-berita-4',
      'BERITA',
      'Raker Awal Kabinet Sinergi Nirmala 2025/2026 di Puncak Bogor',
      'raker-awal-sinergi-nirmala-2025',
      '15 Agustus 2025',
      'PUBLIKASI',
      'Seluruh 60 pengurus Kabinet Sinergi Nirmala mengikuti rapat kerja 3 hari 2 malam.',
      '<p>Raker menghasilkan 42 inisiatif program kerja terstruktur.</p>',
      'Balinese university students group photo mountain villa, morning sun, purple uniform shirts, cheerful group hug banner raker',
      'kegiatan-internal',
      20
    ),
    postRow(
      'mock-berita-5',
      'BERITA',
      'Launching Program Bantu Biaya Skripsi untuk Anggota Berprestasi',
      'bantuan-biaya-skripsi-2025',
      '1 September 2025',
      'PUBLIKASI',
      'Subsidi biaya skripsi hingga Rp 1,5 juta per orang untuk 20 mahasiswa.',
      '<p>Pendaftaran dibuka 1–14 September 2025.</p>',
      'University scholarship announcement poster, student holding graduation cap book icon, purple elegant design, BANTUAN BIAYA SKRIPSI typography',
      'berita-utama',
      2
    ),
    postRow(
      'mock-berita-6',
      'BERITA',
      'Sosialisasi Anti Perundungan Siber Bersama Dosen Psikologi Undiksha',
      'sosialisasi-anti-cyberbullying',
      '28 Agustus 2025',
      'PUBLIKASI',
      'Kegiatan sosialisasi diikuti 240 mahasiswa dengan pemateri Ibu Dr. Luh Putu Ariasih.',
      '<p>Hotline pengaduan bullying kampus telah diaktifkan.</p>',
      'University anti cyberbullying seminar session, speaker psychologist in front purple slide, students audience listening attentively',
      'kampus',
      7
    ),
    postRow(
      'mock-kegiatan-1',
      'KEGIATAN',
      'Open Recruitment Pengurus Inti & Staff Divisi 2025',
      'oprec-pengurus-2025',
      '20 Agustus – 5 September 2025',
      'BERJALAN',
      'Perekrutan 60 pengurus baru untuk 6 divisi.',
      '<p>Seluruh mahasiswa FTIK Undiksha angkatan 2023 dan 2024 diperkenankan mendaftar.</p>',
      'Campus student organization open recruitment banner purple violet, OPREC PENGURUS 2025 text, young indonesian students group photo diverse smiling',
      'kegiatan-internal',
      15,
      'https://forms.gle/mock-oprec-2025'
    ),
    postRow(
      'mock-kegiatan-2',
      'KEGIATAN',
      'Lokakarya Desain Grafis untuk Pengurus Kominfo',
      'lokakarya-desain-grafis-2025',
      '7 September 2025 | 09:00 WITA',
      'PENDAFTARAN',
      'Workshop desain grafis menggunakan Figma dan Adobe Illustrator.',
      '<p>Biaya pendaftaran Rp 25.000 termasuk konsumsi dan stiker toolkit.</p>',
      'Graphic design workshop banner purple, digital art tablet stylus illustration, LOKAKARYA DESAIN GRAFIS text, indonesian creative workshop vibe',
      'kegiatan-internal',
      10,
      'https://forms.gle/mock-lokakarya-desain'
    ),
    postRow(
      'mock-kegiatan-3',
      'KEGIATAN',
      'Gathering Angkatan Muda HM SDP: Welcome Party 2025',
      'welcome-party-angkatan-2025',
      '24 September 2025 | 15:00 WITA',
      'PENDAFTARAN',
      'Malam keakraban untuk 300 mahasiswa baru angkatan 2025.',
      '<p>Lokasi di Hall FTIK Lantai Dasar. Dress code: Casual kreatif tema warna Ungu & Putih.</p>',
      'University welcome party banner purple confetti, young indonesian students laughing, GATHERING ANGKATAN MUDA 2025 text, cheerful campus event',
      'kegiatan-internal',
      8,
      'https://forms.gle/mock-welcome-party'
    ),
    postRow(
      'mock-kegiatan-4',
      'KEGIATAN',
      'Donor Darah Bersama PMI Denpasar',
      'donor-darah-pmi-2025',
      '14 September 2025 | 08:00 – 13:00 WITA',
      'PENDAFTARAN',
      'Kegiatan sosial donor darah bekerjasama dengan PMI Kota Denpasar.',
      '<p>Setiap donor mendapatkan voucher makan, sertifikat PMI, dan cek kesehatan gratis.</p>',
      'Blood donation drive university event poster purple red theme, medical doctor with blood bag, DONOR DARAH BERSAMA PMI text, indonesian hospital campaign',
      'kegiatan-internal',
      6,
      'https://forms.gle/mock-donor-darah'
    ),
    postRow(
      'mock-pengumuman-1',
      'PENGUMUMAN',
      'Pendaftaran Calon Asisten Dosen Praktikum Semester Ganjil',
      'pendaftaran-asdos-praktikum-2025',
      'Pendaftaran s/d 10 September 2025',
      'DIBUKA',
      'Dibuka lowongan 35 asisten dosen untuk 9 mata kuliah praktikum FTIK.',
      '<p>Formulir pendaftaran dan detail mata kuliah yang tersedia dapat diakses melalui akademik.ftik.undiksha.ac.id.</p>',
      'University teaching assistant recruitment announcement poster, students and professor lab, PENDAFTARAN ASDOS text, indonesian campus purple design',
      'pengumuman',
      4,
      'https://forms.gle/mock-asdos-2025'
    ),
    postRow(
      'mock-pengumuman-2',
      'PENGUMUMAN',
      'Pemeliharaan Server dan Aplikasi Portal HM SDP',
      'pemeliharaan-server-september-2025',
      '6 September 2025 | 22:00 – 24:00 WITA',
      'JADWAL',
      'Seluruh layanan portal HM SDP akan tidak dapat diakses selama maintenance rilis versi 2.4.0.',
      '<p>Update mencakup perbaikan bug form pendaftaran, peningkatan keamanan session, dan fitur baru dashboard anggota.</p>',
      'Server maintenance announcement banner, server rack datacenter blue purple lights, PEMELIHARAAN SERVER scheduled text, tech infographic schedule',
      'pengumuman',
      3
    ),
    postRow(
      'mock-lomba-1',
      'LOMBA',
      'UI/UX Design Challenge 2025 — Aplikasi Desa Adat',
      'lomba-uiux-2025',
      'Daftar s/d 30 September 2025',
      'Buka',
      'Lomba desain aplikasi berbasis kearifan lokal desa adat Bali.',
      '<p>Subtema: Administrasi kependudukan, Sistem adat, UMKM desa, Pariwisata desa, atau Pendidikan di desa.</p>',
      'UI UX design competition poster purple gradient, balinese traditional ornaments frame, mobile app interface wireframes, DESIGN CHALLENGE 2025 typography',
      'lomba',
      18,
      'https://forms.gle/mock-uiux-2025'
    ),
    postRow(
      'mock-lomba-2',
      'LOMBA',
      'Lomba Esai Nasional: Transformasi Digital Pendidikan Vokasi',
      'lomba-esai-transformasi',
      'Daftar s/d 15 Oktober 2025',
      'Buka',
      'Tulis gagasan terbaik meratakan kualitas pendidikan vokasi di daerah 3T NTT.',
      '<p>Minimal 3.000 kata, format PDF, font Times New Roman 12pt.</p>',
      'Essay writing contest poster purple indigo gradient, open book quill pen laptop icons, indonesian student national essay contest design',
      'lomba',
      12,
      'https://forms.gle/mock-esai'
    ),
    postRow(
      'mock-lomba-3',
      'LOMBA',
      'CTF Cyber War 2025: Capture The Flag Security',
      'lomba-ctf-2025',
      '1 – 3 November 2025',
      'Buka',
      'Jeopardy + Attack-Defense 3 hari offline camp, 80 tim.',
      '<p>Pendaftaran dibuka resmi 15 September 2025.</p>',
      'Capture the flag cybersecurity contest poster, dark purple neon hacker matrix code rain aesthetic, glowing CTF badge logo, gaming flyer',
      'lomba',
      22,
      'https://forms.gle/mock-ctf-2025'
    ),
    postRow(
      'mock-lomba-4',
      'LOMBA',
      'Business Plan: GreenTech Startup Idea Competition 2025',
      'lomba-bizplan-greentech',
      'Daftar s/d 20 Oktober 2025',
      'Buka',
      'Ide startup teknologi hijau realistis untuk Bali hijau.',
      '<p>Kategori: Pertanian presisi, Pengolahan limbah plastik, Ekowisata digital, dan Energi hijau mikro.</p>',
      'Green tech startup business plan pitch poster, green purple color scheme, plant growing circuit board leaves, eco-friendly tech infographic',
      'lomba',
      9,
      'https://forms.gle/mock-bizplan-greentech'
    ),
    postRow(
      'mock-lomba-5',
      'LOMBA',
      'Short Video HUT RI ke-80: Digitalisasi untuk Kemerdekaan',
      'lomba-video-hutri80',
      'Daftar s/d 10 September 2025',
      'Tutup',
      'Short video kreatif 60 detik vertikal.',
      '<p>Pengumuman pemenang akan diumumkan pada upacara HUT RI ke-80 HM SDP, 17 September 2025.</p>',
      'Indonesia independence day short video contest poster, red white flag bunting, purple overlay, smartphone vertical frame, cinematic poster flyer',
      'lomba',
      28,
      'https://forms.gle/mock-video-hutri'
    ),
    postRow(
      'mock-lomba-6',
      'LOMBA',
      'Poster Digital: Stop Perundungan Siber di Lingkungan Kampus',
      'lomba-poster-anti-cyberbullying',
      'Daftar s/d 5 November 2025',
      'Buka',
      '10 desain terbaik akan dicetak poster FTIK & merchandise kampus.',
      '<p>Spesifikasi karya: kanvas A3 landscape, 300 DPI, RGB, format PNG + AI/PSD.</p>',
      'Anti cyberbullying awareness poster competition design, purple soft blue theme, heart shield protecting bubble chat icons, advocacy typography',
      'lomba',
      11,
      'https://forms.gle/mock-poster-cyberbullying'
    ),
    postRow(
      'mock-lomba-7',
      'LOMBA',
      'Lomba Debat Ilmiah Tingkat Regional Bali-Nusra',
      'lomba-debat-ilmiah-2025',
      'Pendaftaran s/d 25 September 2025',
      'Tutup',
      'Debat ilmiah format British Parliamentary. Total 48 tim dari 16 kampus.',
      '<p>Jadwal babak penyisihan: 4–5 Oktober 2025.</p>',
      'University british parliamentary debate competition poster, students speaking podium microphone, purple orange professional design, DEBAT ILMIAH text',
      'lomba',
      32,
      'https://forms.gle/mock-debat-ilmiah'
    ),
    postRow(
      'mock-lomba-8',
      'LOMBA',
      'Pitching Mahasiswa Wirausaha: Demo Day Angkatan 2',
      'lomba-pitching-wirausaha-angkatan2',
      '16 September 2025',
      'Buka',
      'Demo Day angkatan ke-2 inkubator kewirausahaan HM SDP.',
      '<p>Acara terbuka untuk 150 penonton umum. Tiket masuk: gratis (registrasi terlebih dahulu untuk seat).</p>',
      'Startup pitch demo day event poster purple, startup founders on stage presenting to investors audience, PITCHING WIRAUSAHA text, innovation entrepreneur vibe',
      'lomba',
      5,
      'https://forms.gle/mock-demo-day-angkatan2'
    ),
  ];
  const postsCreated = await prisma.publicPost.createMany({ data: posts, skipDuplicates: true });

  const albumIds = [
    'mock-album-1',
    'mock-album-2',
    'mock-album-3',
    'mock-album-4',
    'mock-album-5-empty',
    'mock-album-6-draft',
  ];
  const albumsData = [
    {
      id: albumIds[0],
      title: 'Raker Awal Kabinet Sinergi Nirmala 2025 — Puncak Bogor',
      description: 'Rapat kerja 3 hari 2 malam penyusunan program kerja seluruh pengurus.',
      prompts: [
        'Balinese university students group photo mountain villa, morning sun, purple uniform shirts, cheerful group hug',
        'Students discussion circle mats brainstorming sticky notes flip chart, collaborative energy',
        'Ice breaking games outdoor field students laughing, team building rope activity',
        'Formal opening speech student president on stage with sinergi nirmala banner',
        'Night bonfire students guitar singing together under stars, warm bokeh',
      ],
      daysBack: 20,
    },
    {
      id: albumIds[1],
      title: 'Seminar Nasional TechTalk AI Generatif FTIK 2025',
      description: 'Menghadirkan pembicara Google Indonesia dan Riset AI Udayana.',
      prompts: [
        'Fully packed university auditorium audience students listening keynote AI, purple stage light',
        'Keynote speaker presenting in front LED screen neural network slides',
        'Q&A student rising hand microphone panel discussion table',
        'Sponsorship booth tech companies swag distribution stickers laptop',
        'Group photo committee speakers stage flowers bouquets',
      ],
      daysBack: 15,
    },
    {
      id: albumIds[2],
      title: 'Festival Sinergi Nirmala 2024',
      description: 'Pameran karya, pentas seni, dan bazaar kewirausahaan HM SDP tahun lalu.',
      prompts: [
        'Indonesian campus festival day exhibition booths colorful banners, students walking around',
        'Live acoustic stage band performance, fairy lights sunset golden hour',
        'VR headset demo exhibition visitors trying goggles smiling',
        'Bazaar balinese food stalls traditional snacks vendors queue',
        'Closing ceremony fireworks purple gold sky silhouette cheering students',
      ],
      daysBack: 260,
    },
    {
      id: albumIds[3],
      title: 'Kunjungan Industri ke Tokopedia HQ Jakarta',
      description:
        'Study tour 45 mahasiswa FTIK ke Tokopedia Tower — sharing session engineering manager.',
      prompts: [
        'Group photo modern startup office entrance company logo wall, visitor passes',
        'Open plan office tour rows standing desks programmers screens keyboards',
        'Round table product manager tech career roadmap whiteboard sketches',
        'Mini live coding workshop facilitator teaching students laptops',
        'Lunch together cafeteria office building buffet food students chatting',
      ],
      daysBack: 90,
    },
    {
      id: albumIds[4],
      title: 'Acara Workshop Akan Datang: Mobile Dev Flutter',
      description:
        'Album dokumentasi untuk acara workshop Flutter yang akan dilaksanakan pada bulan Oktober 2025.',
      prompts: [],
      daysBack: 1,
    },
    {
      id: albumIds[5],
      title: '[DRAFT] Open Recruitment Pengurus 2025',
      description: 'Album ini masih dalam proses upload foto oleh panitia — segera hadir!',
      prompts: [],
      daysBack: 5,
    },
  ];
  for (const a of albumsData) {
    const existingAlbum = await prisma.publicGalleryAlbum.findUnique({ where: { id: a.id } });
    if (!existingAlbum) {
      await prisma.publicGalleryAlbum.create({
        data: {
          id: a.id,
          title: a.title,
          description: a.description,
          is_published: true,
          created_at: daysAgo(a.daysBack),
          updated_at: daysAgo(Math.max(1, a.daysBack - 2)),
          items: {
            create: a.prompts.map((prompt, i) => ({
              id: `mock-photo-${a.id}-${i}`,
              image_url: imgLandscape(prompt),
              caption: `${a.title} — foto ${i + 1}`,
              sort_order: i + 1,
              created_at: daysAgo(a.daysBack),
            })),
          },
        },
      });
    }
  }

  const recs = [
    {
      id: 'mock-rec-1',
      title: 'Open Recruitment Staff Divisi Litbang HM SDP 2025',
      date_range: '20 Agustus – 5 September 2025',
      description: 'Mencari 9 staff Divisi Riset & Teknologi periode 2025/2026.',
      form_url: 'https://forms.gle/mock-litbang-2025',
      posterPrompt:
        'Campus technology recruitment poster purple violet, OPEN RECRUITMENT LITBANG 2025 text, indonesian university vibes, modern graphic',
      committee: [
        { id: 'mock-rec1-com-1', name: 'I Made Bayu Saputra', role: 'Kepala Divisi', so: 1 },
        { id: 'mock-rec1-com-2', name: 'Clarissa Pramesti', role: 'Koordinator Seleksi', so: 2 },
        { id: 'mock-rec1-com-3', name: 'Farhan Wijaya', role: 'Tim Administrasi', so: 3 },
      ],
      contacts: [
        { id: 'mock-rec1-con-1', name: 'Bayu', contact: 'WA: 0811-3661-0011', so: 1 },
        { id: 'mock-rec1-con-2', name: 'Clara', contact: 'WA: 0812-3777-2244', so: 2 },
      ],
      daysBack: 15,
    },
    {
      id: 'mock-rec-2',
      title: 'Perekrutan Panitia CodeComp HM SDP Cup 2025',
      date_range: '25 Agustus – 8 September 2025',
      description: 'Butuh 24 panitia 6 divisi (Acara, Lomba, Humas, Sponsorship, Dekorasi, DD/ED).',
      form_url: 'https://forms.gle/mock-codecomp-panitia',
      posterPrompt:
        'Competitive programming contest recruitment poster, purple neon cyber background, CODECOMP HM SDP CUP 2025, esport style flyer',
      committee: [
        { id: 'mock-rec2-com-1', name: 'Samuel Tanujaya', role: 'Ketua Pelaksana', so: 1 },
        { id: 'mock-rec2-com-2', name: 'Jesica Halim', role: 'Wakil Ketua Pelaksana', so: 2 },
        { id: 'mock-rec2-com-3', name: 'Rara Kusumawardhani', role: 'Kepala Divisi SDM', so: 3 },
      ],
      contacts: [
        { id: 'mock-rec2-con-1', name: 'Sam', contact: 'WA: 0812-8888-6666', so: 1 },
        { id: 'mock-rec2-con-2', name: 'Jesica', contact: 'WA: 0812-7777-9999', so: 2 },
      ],
      daysBack: 12,
    },
    {
      id: 'mock-rec-3',
      title: 'Asisten Mentor: Bootcamp Web Developer Pro',
      date_range: '25 Agustus – 10 September 2025',
      description:
        'Cari 12 asisten mentor & 4 tutor. Benefit: sertifikat pembimbing, jaringan industri.',
      form_url: 'https://forms.gle/mock-mentor-webdev',
      posterPrompt:
        'Coding mentor recruitment poster, modern laptop purple blue gradient, MENTOR BOOTCAMP WEB DEV text, university tech atmosphere',
      committee: [
        { id: 'mock-rec3-com-1', name: 'Talitha Ananda', role: 'Project Manager Bootcamp', so: 1 },
        { id: 'mock-rec3-com-2', name: 'Yoga Prasetya', role: 'Kepala Kurikulum', so: 2 },
      ],
      contacts: [
        { id: 'mock-rec3-con-1', name: 'Talitha', contact: 'WA: 0813-4444-0000', so: 1 },
        { id: 'mock-rec3-con-2', name: 'Yoga', contact: 'WA: 0813-5555-1111', so: 2 },
      ],
      daysBack: 10,
    },
    {
      id: 'mock-rec-4-empty',
      title: '[Segera Dibuka] Volunteer Bazaar UMKM Festival Sinergi Nirmala',
      date_range: 'Pendaftaran: 1 – 20 November 2025',
      description:
        'Butuh 60 volunteer untuk 2 hari acara festival. Panitia sedang dalam persiapan.',
      form_url: 'https://forms.gle/mock-volunteer-bazaar',
      posterPrompt:
        'Bazaar volunteer recruitment indonesian poster, colorful market stalls umkm balinese, purple gradient festive, VOLUNTEER BAZAAR 2025 text',
      committee: [],
      contacts: [],
      daysBack: 3,
    },
    {
      id: 'mock-rec-5-draft',
      title: '[Internal] Staff Pelatihan Kepemimpinan (LKMM-Pra) 2025',
      date_range: 'Pendaftaran dibuka 1 Oktober 2025',
      description: 'Program LKMM-Pra untuk pengurus baru level tingkat dasar. Kuota 50 orang.',
      form_url: 'https://forms.gle/mock-lkmm-pra',
      posterPrompt:
        'Student leadership training indonesian poster purple gold, LKMM PRA text, young leaders handshake, university training workshop design',
      committee: [],
      contacts: [],
      daysBack: 1,
    },
  ];
  for (const r of recs) {
    const existingRec = await prisma.publicRecruitment.findUnique({ where: { id: r.id } });
    if (!existingRec) {
      await prisma.publicRecruitment.create({
        data: {
          id: r.id,
          title: r.title,
          date_range: r.date_range,
          description: r.description,
          form_url: r.form_url,
          poster_image_url: imgLandscape(r.posterPrompt),
          is_published: true,
          created_at: daysAgo(r.daysBack),
          updated_at: daysAgo(Math.max(1, r.daysBack - 2)),
          committee: {
            create: r.committee.map((c) => ({
              id: c.id,
              name: c.name,
              role: c.role,
              sort_order: c.so,
            })),
          },
          contacts: {
            create: r.contacts.map((c) => ({
              id: c.id,
              name: c.name,
              contact: c.contact,
              sort_order: c.so,
              created_at: daysAgo(r.daysBack),
            })),
          },
        },
      });
    }
  }

  return {
    profile: profileId,
    categories_added: catCreated.count ?? 0,
    cabinets: cabinets.length,
    groups: groups.length,
    members_added: memCreated.count ?? 0,
    programs_added: progCreated.count ?? 0,
    posts_added: postsCreated.count ?? 0,
    albums: albumsData.length,
    recruitments: recs.length,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    return;
  }

  const hasFlags = args.some((x) => x.startsWith('--'));
  const posEmail = !hasFlags ? args[0] || null : null;
  const posPass = !hasFlags ? args[1] || null : null;
  const posName = !hasFlags ? args[2] || null : null;

  const superEmail =
    readArg(args, '--super-email') ||
    readNpmConfig('super-email') ||
    process.env.SEED_SUPER_ADMIN_EMAIL ||
    posEmail;
  const superPass =
    readArg(args, '--super-password') ||
    readNpmConfig('super-password') ||
    process.env.SEED_SUPER_ADMIN_PASSWORD ||
    posPass;
  const superName =
    readArg(args, '--super-name') ||
    readNpmConfig('super-name') ||
    process.env.SEED_SUPER_ADMIN_NAME ||
    posName;
  const superNim =
    readArg(args, '--super-nim') ||
    readNpmConfig('super-nim') ||
    process.env.SEED_SUPER_ADMIN_NIM_NIP ||
    (!hasFlags ? args[3] || null : null);

  const adminEmail =
    readArg(args, '--admin-email') || readNpmConfig('admin-email') || process.env.SEED_ADMIN_EMAIL;
  const adminPass =
    readArg(args, '--admin-password') ||
    readNpmConfig('admin-password') ||
    process.env.SEED_ADMIN_PASSWORD;
  const adminName =
    readArg(args, '--admin-name') || readNpmConfig('admin-name') || process.env.SEED_ADMIN_NAME;
  const adminNim =
    readArg(args, '--admin-nim') || readNpmConfig('admin-nim') || process.env.SEED_ADMIN_NIM_NIP;

  const contentEmail =
    readArg(args, '--content-email') ||
    readNpmConfig('content-email') ||
    process.env.SEED_CONTENT_ADMIN_EMAIL;
  const contentPass =
    readArg(args, '--content-password') ||
    readNpmConfig('content-password') ||
    process.env.SEED_CONTENT_ADMIN_PASSWORD;
  const contentName =
    readArg(args, '--content-name') ||
    readNpmConfig('content-name') ||
    process.env.SEED_CONTENT_ADMIN_NAME;
  const contentNim =
    readArg(args, '--content-nim') ||
    readNpmConfig('content-nim') ||
    process.env.SEED_CONTENT_ADMIN_NIM_NIP;

  const seedPublic =
    hasFlag(args, '--seed-public-site') ||
    hasFlag(args, '--seed-public') ||
    String(process.env.SEED_PUBLIC_SITE || '').trim() === '1' ||
    String(process.env.SEED_PUBLIC_SITE || '')
      .trim()
      .toLowerCase() === 'true';

  const publicOrgName =
    readArg(args, '--public-org-name') ||
    readNpmConfig('public-org-name') ||
    process.env.SEED_PUBLIC_ORG_NAME;
  const publicCampusName =
    readArg(args, '--public-campus-name') ||
    readNpmConfig('public-campus-name') ||
    process.env.SEED_PUBLIC_CAMPUS_NAME;
  const publicKabName =
    readArg(args, '--public-kabinet-name') ||
    readNpmConfig('public-kabinet-name') ||
    process.env.SEED_PUBLIC_KABINET_NAME;
  const publicKabPeriod =
    readArg(args, '--public-kabinet-period') ||
    readNpmConfig('public-kabinet-period') ||
    process.env.SEED_PUBLIC_KABINET_PERIOD;
  const publicLogoLight =
    readArg(args, '--public-logo-light-url') ||
    readNpmConfig('public-logo-light-url') ||
    process.env.SEED_PUBLIC_LOGO_LIGHT_URL;
  const publicLogoDark =
    readArg(args, '--public-logo-dark-url') ||
    readNpmConfig('public-logo-dark-url') ||
    process.env.SEED_PUBLIC_LOGO_DARK_URL;
  const publicPrimaryColor =
    readArg(args, '--public-primary-color') ||
    readNpmConfig('public-primary-color') ||
    process.env.SEED_PUBLIC_PRIMARY_COLOR;
  const publicInstagram =
    readArg(args, '--public-instagram-url') ||
    readNpmConfig('public-instagram-url') ||
    process.env.SEED_PUBLIC_INSTAGRAM_URL;
  const publicTiktok =
    readArg(args, '--public-tiktok-url') ||
    readNpmConfig('public-tiktok-url') ||
    process.env.SEED_PUBLIC_TIKTOK_URL;
  const publicYoutube =
    readArg(args, '--public-youtube-url') ||
    readNpmConfig('public-youtube-url') ||
    process.env.SEED_PUBLIC_YOUTUBE_URL;

  const seedLanding =
    hasFlag(args, '--seed-landing-mock') ||
    String(process.env.SEED_LANDING_MOCK || '').trim() === '1' ||
    String(process.env.SEED_LANDING_MOCK || '')
      .trim()
      .toLowerCase() === 'true';

  if (!superEmail || !superPass || !superNim) {
    console.error('Seeder butuh minimal SUPER_ADMIN (email + password + NIM/NIP).');
    console.log(usage());
    process.exitCode = 1;
    return;
  }

  const created = [];

  const superAdmin = await upsertUser({
    email: superEmail,
    password: superPass,
    name: superName,
    role: 'SUPER_ADMIN',
    nimNip: superNim,
  });
  if (superAdmin) created.push({ role: 'SUPER_ADMIN', email: superAdmin.email });

  const admin = await upsertUser({
    email: adminEmail,
    password: adminPass,
    name: adminName,
    role: 'ADMIN',
    nimNip: adminNim,
  });
  if (admin) created.push({ role: 'ADMIN', email: admin.email });

  const contentAdmin = await upsertUser({
    email: contentEmail,
    password: contentPass,
    name: contentName,
    role: 'CONTENT_ADMIN',
    nimNip: contentNim,
  });
  if (contentAdmin) created.push({ role: 'CONTENT_ADMIN', email: contentAdmin.email });

  console.log('Akun seeded:', created.map((x) => `${x.role}:${x.email}`).join(', '));

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
    });
    console.log(
      `Public site seeded: profile=${seeded.profile}, categories_added=${seeded.categories}`
    );
  }

  if (seedLanding) {
    console.log(
      '🌱 Menjalankan SEED_LANDING_MOCK (idempotent, ID sinkron dengan mockLandingData.ts)...'
    );
    const landing = await seedLandingMock();
    console.log(
      `✅ Landing mock seeded: profile=${landing.profile}, categories+${landing.categories_added}, cabinets=${landing.cabinets}, groups=${landing.groups}, members+${landing.members_added}, programs+${landing.programs_added}, posts+${landing.posts_added}, albums=${landing.albums}, recruitments=${landing.recruitments}`
    );
  }
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
