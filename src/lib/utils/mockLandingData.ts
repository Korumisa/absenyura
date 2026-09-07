import type {
  PublicGalleryAlbum,
  PublicPost,
  PublicPostType,
  PublicProfile,
  PublicProgram,
  PublicRecruitment,
  PublicStructureGroup,
} from '@/types/publicSite';
import type { PublicPostItemsResponse } from '@/types/api';

const enc = encodeURIComponent;
const imgLandscape = (p: string) =>
  `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${enc(p)}&image_size=landscape_16_9`;
const imgPortrait = (p: string) =>
  `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${enc(p)}&image_size=portrait_4_3`;
const imgSquareHD = (p: string) =>
  `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${enc(p)}&image_size=square_hd`;

const NOW = '2025-09-03T04:00:00.000Z';
const DAY = 86400000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

export const USE_MOCK_LANDING =
  typeof import.meta !== 'undefined' &&
  (import.meta.env.VITE_USE_MOCK_LANDING === 'true' ||
    import.meta.env.VITE_USE_MOCK_LANDING === '1');

const categories = {
  BERITA_UTAMA: {
    id: 'cat-berita-utama',
    name: 'Berita Utama',
    slug: 'berita-utama',
    created_at: NOW,
    updated_at: NOW,
  },
  PRESTASI: {
    id: 'cat-prestasi',
    name: 'Prestasi',
    slug: 'prestasi',
    created_at: NOW,
    updated_at: NOW,
  },
  KAMPUS: { id: 'cat-kampus', name: 'Kampus', slug: 'kampus', created_at: NOW, updated_at: NOW },
  KEGIATAN_INTERNAL: {
    id: 'cat-kegiatan',
    name: 'Kegiatan Internal',
    slug: 'kegiatan-internal',
    created_at: NOW,
    updated_at: NOW,
  },
  PENGUMUMAN_UMUM: {
    id: 'cat-pengumuman',
    name: 'Pengumuman',
    slug: 'pengumuman',
    created_at: NOW,
    updated_at: NOW,
  },
  LOMBA_INTERNAL: {
    id: 'cat-lomba',
    name: 'Lomba',
    slug: 'lomba',
    created_at: NOW,
    updated_at: NOW,
  },
};

export const mockProfile: PublicProfile = {
  id: 'mock-profile',
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
    'Himpunan Mahasiswa Sistem dan Teknologi Informasi (HM SDP) FTIK Undiksha adalah organisasi kemahasiswaan yang menaungi seluruh mahasiswa S-1 Sistem Informasi, S-1 Pendidikan Teknologi Informasi, dan S-1 Teknologi Rekayasa Perangkat Lunak di Kampus Denpasar. Kami berkomitmen mengembangkan potensi akademik, kepemimpinan, dan kreativitas anggota melalui program kerja unggulan sepanjang tahun.',
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
};

const publicStructureCabinet: {
  id: string;
  name: string;
  period: string;
  is_active: boolean;
  groups: PublicStructureGroup[];
} = {
  id: 'mock-cabinet-1',
  name: 'Kabinet Sinergi Nirmala',
  period: '2025/2026',
  is_active: true,
  groups: [],
};

const publicStructureCabinet2: typeof publicStructureCabinet = {
  id: 'mock-cabinet-2',
  name: 'Kabinet Arkatama Restorasi',
  period: '2024/2025',
  is_active: false,
  groups: [],
};

export const mockAllCabinets = [publicStructureCabinet, publicStructureCabinet2];
export const mockStructureCabinet = publicStructureCabinet;

type MemberInput = { name: string; role: string; photoPrompt: string; isSpotlight?: boolean };
const buildMembers = (list: MemberInput[], prefix: string) =>
  list.map((m, i) => ({
    id: `mock-member-${prefix}-${i}`,
    name: m.name,
    role: m.role,
    photo_url: imgPortrait(m.photoPrompt),
    is_spotlight: Boolean(m.isSpotlight),
    sort_order: i + 1,
  }));

const coreGroup = buildMembers(
  [
    {
      name: 'I Komang Rizky Pratama',
      role: 'Ketua Umum',
      photoPrompt:
        'Balinese male university ketua umum headshot, batik purple, confident, modern office',
      isSpotlight: true,
    },
    {
      name: 'Anak Agung Ayu Anindya Maharani',
      role: 'Wakil Ketua Umum',
      photoPrompt:
        'Balinese female wakil ketua headshot, friendly smile, songket purple accent background',
      isSpotlight: true,
    },
    {
      name: 'I Kadek Dimas Nugraha',
      role: 'Sekretaris Jenderal',
      photoPrompt: 'Young Indonesian male secretary portrait, office look, light purple background',
    },
    {
      name: 'Ni Wayan Maya Ayu Lestari',
      role: 'Bendahara',
      photoPrompt: 'Young Indonesian female treasurer portrait, cheerful, purple frame',
    },
  ],
  'core'
);

const divisiData = [
  {
    title: 'Divisi Riset & Teknologi (Litbang)',
    is_core: false,
    members: [
      {
        name: 'I Made Bayu Saputra',
        role: 'Kepala Divisi',
        photoPrompt: 'Balinese male division head portrait, serious, purple office',
      },
      {
        name: 'Ni Kadek Clarissa Pramesti',
        role: 'Anggota Litbang',
        photoPrompt: 'Indonesian female programmer coding laptop portrait',
      },
      {
        name: 'I Putu Farhan Maulana Wijaya',
        role: 'Anggota Litbang',
        photoPrompt: 'Indonesian male researcher portrait holding tablet',
      },
    ],
  },
  {
    title: 'Divisi Komunikasi & Informasi (Kominfo)',
    is_core: false,
    members: [
      {
        name: 'Desak Putu Talitha Ananda',
        role: 'Kepala Divisi',
        photoPrompt: 'Balinese female marketing head portrait holding camera',
      },
      {
        name: 'I Nyoman Bagas Pramartha',
        role: 'Anggota Kominfo',
        photoPrompt: 'Male videographer holding gimbal camera portrait',
      },
      {
        name: 'Ni Luh Citra Dewi Santi',
        role: 'Anggota Kominfo',
        photoPrompt: 'Female graphic designer digital art tablet portrait',
      },
    ],
  },
  {
    title: 'Divisi Pengembangan SDM (PSDM)',
    is_core: false,
    members: [
      {
        name: 'Samuel Tanujaya',
        role: 'Kepala Divisi',
        photoPrompt: 'Indonesian male HR head portrait, leadership, office',
      },
      {
        name: 'Rara Kusumawardhani',
        role: 'Anggota PSDM',
        photoPrompt: 'Female mentor mentoring student portrait cheerful',
      },
      {
        name: 'Yoga Prasetya Adi',
        role: 'Anggota PSDM',
        photoPrompt: 'Male trainer flip chart seminar room portrait',
      },
    ],
  },
  {
    title: 'Divisi Hubungan Masyarakat (Humas)',
    is_core: false,
    members: [
      {
        name: 'Jesica Halim Santoso',
        role: 'Kepala Divisi',
        photoPrompt: 'Indonesian female PR head portrait, professional',
      },
      {
        name: 'Rendy Kurniawan',
        role: 'Anggota Humas',
        photoPrompt: 'Male event organizer venue check portrait smile',
      },
      {
        name: 'Bunga Azzahra Putri',
        role: 'Anggota Humas',
        photoPrompt: 'Female campus ambassador poster event portrait',
      },
    ],
  },
  {
    title: 'Divisi Kewirausahaan (Kwu)',
    is_core: false,
    members: [
      {
        name: 'Vincent Wijaya',
        role: 'Kepala Divisi',
        photoPrompt: 'Indonesian young entrepreneur headshot, startup vibe',
      },
      {
        name: 'Olivia Gunawan Effendi',
        role: 'Anggota Kwu',
        photoPrompt: 'Female online seller packing product portrait',
      },
      {
        name: 'Alfaro Hermawan',
        role: 'Anggota Kwu',
        photoPrompt: 'Male fintech pitch deck presentation portrait',
      },
    ],
  },
  {
    title: 'Divisi Pengabdian Masyarakat (Pengmas)',
    is_core: false,
    members: [
      {
        name: 'Ni Nyoman Nadia Permatasari',
        role: 'Kepala Divisi',
        photoPrompt: 'Balinese female community service head portrait village background',
      },
      {
        name: 'I Made Fajar Ramadhan',
        role: 'Anggota Pengmas',
        photoPrompt: 'Male volunteer teaching children village portrait',
      },
      {
        name: 'Desak Made Mawar Sari',
        role: 'Anggota Pengmas',
        photoPrompt: 'Female medical volunteer health check portrait rural',
      },
    ],
  },
];

const cabinet1Groups: PublicStructureGroup[] = [
  {
    id: 'mock-group-core-1',
    title: 'Inti Kabinet',
    sort_order: 1,
    is_core: true,
    members: coreGroup,
  },
  ...divisiData.map((div, divIdx) => ({
    id: `mock-group-div-1-${divIdx}`,
    title: div.title,
    sort_order: (divIdx + 2) * 10,
    is_core: false as const,
    members: buildMembers(div.members, `div1-${divIdx}`),
  })),
];

const cabinet2Groups: PublicStructureGroup[] = [
  {
    id: 'mock-group-core-2',
    title: 'Inti Kabinet (Periode Lalu)',
    sort_order: 1,
    is_core: true,
    members: buildMembers(
      [
        {
          name: 'Gusti Ngurah Aditya Prana',
          role: 'Ketua Umum 2024/2025',
          photoPrompt:
            'Balinese male alumni ketua umum headshot formal dark suit purple background',
          isSpotlight: true,
        },
        {
          name: 'Ida Ayu Putu Mira Darmayanti',
          role: 'Wakil Ketua Umum 2024/2025',
          photoPrompt: 'Balinese female alumni wakil headshot professional blazer purple',
          isSpotlight: true,
        },
        {
          name: 'Agus Suteja',
          role: 'Sekretaris Jenderal',
          photoPrompt: 'Male alumni secretary portrait glasses formal',
        },
        {
          name: 'Dewi Lestari',
          role: 'Bendahara',
          photoPrompt: 'Female alumni treasurer portrait smile purple background',
        },
      ],
      'core2'
    ),
  },
  {
    id: 'mock-group-div-2-litbang',
    title: 'Divisi Litbang (Arkatama)',
    sort_order: 10,
    is_core: false,
    members: buildMembers(
      [
        {
          name: 'Kevin Sanjaya',
          role: 'Kepala Divisi',
          photoPrompt: 'Young balinese male alumni division head soft smile portrait',
        },
        {
          name: 'Dinda Permata',
          role: 'Anggota Litbang',
          photoPrompt: 'Balinese female alumni portrait laptop programming',
        },
      ],
      'div2-litbang'
    ),
  },
  {
    id: 'mock-group-div-2-kominfo',
    title: 'Divisi Kominfo (Arkatama)',
    sort_order: 20,
    is_core: false,
    members: buildMembers(
      [
        {
          name: 'Maria Theophila',
          role: 'Kepala Divisi',
          photoPrompt: 'Young female alumni marketing head portrait camera',
        },
        {
          name: 'Reza Pahlevi',
          role: 'Anggota Kominfo',
          photoPrompt: 'Male alumni designer portrait graphic tablet',
        },
      ],
      'div2-kominfo'
    ),
  },
];

publicStructureCabinet.groups = cabinet1Groups;
publicStructureCabinet2.groups = cabinet2Groups;

export const mockStructure: {
  data: PublicStructureGroup[];
  cabinet: any;
  allCabinets: any[];
} = {
  cabinet: publicStructureCabinet,
  allCabinets: [publicStructureCabinet, publicStructureCabinet2],
  data: cabinet1Groups,
};

export const mockStructureCabinet2: {
  data: PublicStructureGroup[];
  cabinet: any;
  allCabinets: any[];
} = {
  cabinet: publicStructureCabinet2,
  allCabinets: [publicStructureCabinet, publicStructureCabinet2],
  data: cabinet2Groups,
};

const programsBase: Omit<PublicProgram, 'created_at' | 'updated_at'>[] = [
  {
    id: 'mock-p1',
    title: 'Bootcamp Web Developer Professional (React + Node.js)',
    date_range: '15 September – 15 November 2025',
    description:
      'Pelatihan intensive 2 bulan full-stack web development dengan mentor industri aktif, diakhiri job-connect mini-hackathon. Kuota 60 peserta mahasiswa FTIK.',
    is_published: true,
    division: 'Divisi Litbang',
    funding_source: 'SPJ Kabinet + Sponsor Bootcamp',
    location: 'Gedung FTIK Lt. 3 Lab Komputer & Zoom Hybrid',
    target: '60 mahasiswa FTIK aktif semester 2–6',
    rationale:
      'Kebutuhan industri akan full-stack developer React+Node meningkat 47% per tahun di Bali (survey BAPPEDA Bali 2024).',
  },
  {
    id: 'mock-p2',
    title: 'TechTalk: AI Generatif & Etika Penggunaan di Dunia Akademik',
    date_range: '18 September 2025 | 14:00 WITA',
    description:
      'Seminar nasional menghadirkan peneliti AI Udayana dan praktisi dari Grab Indonesia. Topik: best practice pemanfaatan LLM di perkuliahan, riset, dan skripsi.',
    is_published: true,
    division: 'Divisi Litbang',
    funding_source: 'SPJ Kabinet',
    location: 'Aula Gedung Student Center Undiksha Lt. 2 + YouTube Live',
    target: '400 peserta (offline 200 + online 200)',
    rationale:
      'Mahasiswa butuh panduan resmi etika penggunaan AI generatif di tugas akademik guna menghindari plagiarism dan menjaga integritas ilmiah.',
  },
  {
    id: 'mock-p3',
    title: 'CodeComp HM SDP Cup 2025 — Kompetisi Algoritma Tingkat Bali',
    date_range: '1 – 10 Oktober 2025',
    description:
      'Kompetisi pemrograman mahasiswa informatika se-Bali dan Nusa Tenggara. Total hadiah Rp 12.000.000 + akses beasiswa bootcamp.',
    is_published: true,
    division: 'Divisi Litbang',
    funding_source: 'Sponsor 4 perusahaan IT Bali + SPJ Kabinet',
    location: 'Online Codeforces platform + Offline awarding FTIK',
    target: '120 tim perwakilan 20 PTN/PTS se-Bali-NTT',
    rationale:
      'Membudayakan competitive programming untuk OSN dan Gemastik, serta mempertemukan talenta TI regional Bali.',
  },
  {
    id: 'mock-p4',
    title: 'Kuliah Kerja Nyata Tematik: TIK untuk Desa Adat',
    date_range: 'Oktober – Desember 2025',
    description:
      'Program KKN tematik HM SDP — mengajar TIK, administrasi digital desa, dan literasi digital di 4 desa adat Kabupaten Tabanan dan Badung.',
    is_published: true,
    division: 'Divisi Pengmas',
    funding_source: 'Dana CSR Mitra Desa + BEM FT Undiksha',
    location: '4 desa adat di Tabanan & Badung, Bali',
    target: '1.200 warga desa (peserta pelatihan)',
    rationale:
      'Hak akses digital masih rendah di 42% desa adat di Bali menurut survei Diskominfo Bali 2024 — butuh pendampingan langsung.',
  },
  {
    id: 'mock-p5',
    title: 'Startup Sprint 9 Hari: Pitch Your Idea',
    date_range: '27 September – 5 Oktober 2025',
    description:
      'Pre-inkubasi startup: validasi ide, bangun MVP, presentasi ke angel investor Bali. 3 tim terbaik lolos inkubator FTIK gratis.',
    is_published: true,
    division: 'Divisi Kewirausahaan',
    funding_source: 'Bali Tech Hub + Inkubator FTIK',
    location: 'Co-working Space Bili Hub Denpasar + Zoom',
    target: '30 tim (maks 4 orang per tim)',
    rationale:
      'Rasio startup per mahasiswa Undiksha baru 0,6% — perlu dorongan pre-inkubasi agar bibit wirausaha digital tumbuh.',
  },
  {
    id: 'mock-p6',
    title: 'Study Club OSN & Competitive Programming',
    date_range: 'Setiap Sabtu Pagi (Agustus – Desember 2025)',
    description:
      'Pembinaan rutin algoritma competitive programming untuk OSN, Gemastik, ICPC. Dipandu mentor medali emas Olimpiade Komputer.',
    is_published: true,
    division: 'Divisi Litbang',
    funding_source: 'SPJ Kabinet',
    location: 'Lab Komputer FTIK Lt. 3',
    target: '28 mahasiswa aktif pembinaan',
    rationale: 'Target 3 medali di Gemastik 2026 dan 1 tim lolos ICPC Regional Jakarta.',
  },
  {
    id: 'mock-p7',
    title: 'Alumni Homecoming & Career Day FTIK 2025',
    date_range: '22 November 2025',
    description:
      'Kumpul alumni lintas angkatan + career fair 30+ perusahaan partner teknologi Bali & Jakarta. Buka lowongan magang & fresh-graduate.',
    is_published: true,
    division: 'Divisi Humas',
    funding_source: 'Sponsor perusahaan partner + Iuran Alumni',
    location: 'Hall FTIK Lt. 1 dan Lapangan Parkir Selatan',
    target: '800 pengunjung (alumni 200 + mahasiswa 600)',
    rationale:
      'Link-and-match antara lulusan dan industri dibutuhkan untuk menekan angka pengangguran terdidik lulusan TI di Bali (12,4% BPS 2024).',
  },
  {
    id: 'mock-p8',
    title: 'Festival Sinergi Nirmala: Pameran Karya & Pentas Seni',
    date_range: '13 – 14 Desember 2025',
    description:
      'Acara puncak akhir tahun Kabinet Sinergi Nirmala — pameran proyek, demo startup mahasiswa, pentas seni tradisional & modern, serta bazaar UMKM lokal Bali.',
    is_published: true,
    division: 'Seluruh Divisi',
    funding_source: 'SPJ Kabinet + 8 Sponsor UMKM + Sponsor Media',
    location: 'Halaman Gedung FTIK Undiksha Denpasar',
    target: '1.500 pengunjung selama 2 hari',
    rationale:
      'Momentum silaturahmi anggota dan memperkenalkan kinerja himpunan ke warga kampus serta masyarakat umum.',
  },
  {
    id: 'mock-p9',
    title: 'Program Belajar Bersama (PBB) Semester Ganjil 2025/2026',
    date_range: 'Sep 2025 – Des 2025',
    description:
      'Program belajar kelompok peer-assisted untuk mata kuliah inti semester 1–3. Setiap pekan 2x pertemuan dengan mentor dari tingkat atas. Output: ringkasan materi dan latihan soal untuk setiap sesi.',
    is_published: true,
    division: 'Divisi PSDM',
    funding_source: 'SPJ Kabinet',
    location: 'Ruang Kelas FTIK Lt. 2 & Zoom Hybrid',
    target: '180 mahasiswa aktif semester 1–3',
    rationale:
      'Meningkatkan tingkat kelulusan tepat waktu dan mengurangi angka dropout di mata kuliah inti.',
  },
  {
    id: 'mock-p10',
    title: 'Raker Awal Kabinet Sinergi Nirmala 2025/2026',
    date_range: 'Agu 2025',
    description:
      'Rapat kerja kabinet tahunan untuk menyusun program kerja, SOP internal, dan IKU tiap divisi. Dihadiri seluruh pengurus inti dan kepala divisi selama 2 hari fullboard.',
    is_published: true,
    division: 'Seluruh Divisi',
    funding_source: 'SPJ Kabinet Sinergi Nirmala',
    location: 'Villa Puncak Bogor & Aula FTIK Hybrid',
    target: '60 pengurus inti + kepala divisi',
    rationale: 'Roadmap program kerja dan SOP internal menjadi acuan eksekusi sepanjang periode.',
  },
  {
    id: 'mock-p11',
    title: 'Open Recruitment Pengurus Inti & Staff Divisi Periode 2025/2026',
    date_range: 'Agu – Sep 2025',
    description:
      'Perekrutan pengurus baru untuk periode ini. Seleksi administrasi → tes tulis → wawancara → FGD. Pengumuman hasil seleksi diumumkan melalui website dan grup resmi.',
    is_published: true,
    division: 'Divisi PSDM + Divisi Humas',
    funding_source: 'SPJ Kabinet + Donatur Alumni',
    location: 'Offline Gedung FTIK + Online Zoom',
    target: '60 pengurus baru dari mahasiswa angkatan 2023–2024',
    rationale: 'Regenerasi pengurus organisasi untuk menjaga keberlanjutan kinerja kabinet.',
  },
];

export const mockPrograms: PublicProgram[] = programsBase.map((p) => ({
  ...p,
  created_at: daysAgo(60 + Number(p.id.replace('mock-p', ''))),
  updated_at: daysAgo(7 + Number(p.id.replace('mock-p', ''))),
}));

type PostInput = {
  id: string;
  type: PublicPostType;
  title: string;
  slug: string;
  date_label: string;
  status: string;
  excerpt: string;
  content: string;
  coverImagePrompt: string;
  category: (typeof categories)[keyof typeof categories];
  publishedDaysAgo: number;
  form_url?: string;
};

const buildPost = (input: PostInput): PublicPost => ({
  id: input.id,
  type: input.type,
  title: input.title,
  slug: input.slug,
  date_label: input.date_label,
  status: input.status,
  form_url: input.form_url ?? null,
  excerpt: input.excerpt,
  content: input.content,
  cover_image_url: imgLandscape(input.coverImagePrompt),
  category: input.category,
  category_id: input.category.id,
  is_published: true,
  published_at: daysAgo(input.publishedDaysAgo),
  created_at: daysAgo(input.publishedDaysAgo + 1),
  updated_at: daysAgo(input.publishedDaysAgo),
});

const berita: PublicPost[] = [
  buildPost({
    id: 'mock-berita-1',
    type: 'BERITA',
    title: 'HM SDP Borong 5 Medali di Gemastik XVII 2024 Yogyakarta',
    slug: 'gemastik-xvii-medali-2024',
    date_label: '12 Juli 2025',
    status: 'PUBLIKASI',
    excerpt:
      'Tim delegasi HM SDP Undiksha meraih 5 medali — emas kategori Pengembangan Aplikasi Web, 2 perak, dan 2 perunggu — melawan 320 tim seluruh Indonesia.',
    content:
      '<p>Alhamdulillah perjalanan kompetisi 5 hari di Yogyakarta membuahkan hasil manis. Rektor Undiksha memberikan bonus insentif prestasi serta beasiswa pendidikan untuk seluruh anggota tim.</p><p>Medali emas diraih oleh Tim "Sagara Tech" di cabang Pengembangan Aplikasi Web dengan karya aplikasi "Desa Digital Cerdas" yang terintegrasi dengan sistem administrasi kependudukan desa adat di Bali.</p>',
    coverImagePrompt:
      'Indonesian university students team on Gemastik competition stage receiving gold trophy medals, confetti falling, joyful purple gold celebration atmosphere',
    category: categories.PRESTASI,
    publishedDaysAgo: 60,
  }),
  buildPost({
    id: 'mock-berita-2',
    type: 'BERITA',
    title: 'Penandatangan MoU HM SDP dengan AWS Indonesia Cloud Program',
    slug: 'mou-hmsdp-aws-cloud',
    date_label: '30 Juli 2025',
    status: 'PUBLIKASI',
    excerpt:
      'Nota kesepahaman resmi: 200 mahasiswa FTIK mendapatkan pelatihan AWS Cloud Practitioner bersertifikasi INTERNASIONAL secara GRATIS.',
    content:
      '<p>Kelas daring 8 pertemuan + biaya ujian sertifikasi ditanggung program kerja HM SDP. Lulus peserta masuk talent pool rekomendasi magang AWS partner se-Indonesia.</p><p>Pendaftaran batch pertama dibuka pertengahan September 2025 melalui portal hmsdp.undiksha.ac.id dengan kuota prioritas untuk mahasiswa semester 3 ke atas.</p>',
    coverImagePrompt:
      'MOU signing ceremony university student org and AWS Indonesia representative, exchanging documents, corporate meeting purple accent, AWS logo screen',
    category: categories.KAMPUS,
    publishedDaysAgo: 35,
  }),
  buildPost({
    id: 'mock-berita-3',
    type: 'BERITA',
    title: 'Juara 1 Hackathon Fintech Bali Regional 2025',
    slug: 'juara-1-hackathon-fintech-bali',
    date_label: '21 Agustus 2025',
    status: 'PUBLIKASI',
    excerpt:
      'Tim KiriKiri.Uang dari HM SDP juara pertama Hackathon Fintech Denpasar dengan aplikasi UMKM micro-investment berbasis integrasi WhatsApp Business API.',
    content:
      '<p>Hadiah utama pendanaan pre-seed Rp 50 juta dan inkubasi 6 bulan di Bali Tech Hub. Produk akan direalisasikan dalam program Startup Sprint nanti.</p>',
    coverImagePrompt:
      'Champion team winning hackathon competition Bali, giant check money prize, big smile thumbs up, purple tech stage, fintech banner backdrop',
    category: categories.PRESTASI,
    publishedDaysAgo: 13,
  }),
  buildPost({
    id: 'mock-berita-4',
    type: 'BERITA',
    title: 'Raker Awal Kabinet Sinergi Nirmala 2025/2026 di Puncak Bogor',
    slug: 'raker-awal-sinergi-nirmala-2025',
    date_label: '15 Agustus 2025',
    status: 'PUBLIKASI',
    excerpt:
      'Seluruh 60 pengurus Kabinet Sinergi Nirmala mengikuti rapat kerja 3 hari 2 malam untuk menyusun roadmap program kerja 2025/2026 yang mengusung tema "Atma Siddhi Wiweka".',
    content:
      '<p>Raker menghasilkan 42 inisiatif program kerja terstruktur, 9 standar operasional prosedur (SOP) baru, dan target indikator kinerja utama (IKU) setiap divisi. Ketua Umum menekankan budaya kerja transparan dan kolaboratif.</p>',
    coverImagePrompt:
      'Balinese university students group photo mountain villa, morning sun, purple uniform shirts, cheerful group hug banner raker',
    category: categories.KEGIATAN_INTERNAL,
    publishedDaysAgo: 20,
  }),
  buildPost({
    id: 'mock-berita-5',
    type: 'BERITA',
    title: 'Launching Program Bantu Biaya Skripsi untuk Anggota Berprestasi',
    slug: 'bantuan-biaya-skripsi-2025',
    date_label: '1 September 2025',
    status: 'PUBLIKASI',
    excerpt:
      'Program unggulan baru Kabinet Sinergi Nirmala: subsidi biaya skripsi hingga Rp 1,5 juta per orang untuk 20 mahasiswa FTIK anggota aktif HM SDP.',
    content:
      '<p>Pendaftaran dibuka 1–14 September 2025. Seleksi berdasarkan IPK minimal 3,20, keaktifan organisasi, dan tahap skripsi (sudah seminar proposal).</p>',
    coverImagePrompt:
      'University scholarship announcement poster, student holding graduation cap book icon, purple elegant design, BANTUAN BIAYA SKRIPSI typography',
    category: categories.BERITA_UTAMA,
    publishedDaysAgo: 2,
  }),
  buildPost({
    id: 'mock-berita-6',
    type: 'BERITA',
    title: 'Sosialisasi Anti Perundungan Siber Bersama Dosen Psikologi Undiksha',
    slug: 'sosialisasi-anti-cyberbullying',
    date_label: '28 Agustus 2025',
    status: 'PUBLIKASI',
    excerpt:
      'Kegiatan sosialisasi diikuti 240 mahasiswa dengan pemateri Ibu Dr. Luh Putu Ariasih, M.Psi., Psikolog. Peserta diajak mengenali dan melaporkan tindakan perundungan di dunia maya.',
    content:
      '<p>Hotline pengaduan bullying kampus telah diaktifkan melalui nomor WA 0812-3661-9999 dan email aman@ftik.undiksha.ac.id dengan jaminan kerahasiaan identitas pelapor.</p>',
    coverImagePrompt:
      'University anti cyberbullying seminar session, speaker psychologist in front purple slide, students audience listening attentively',
    category: categories.KAMPUS,
    publishedDaysAgo: 7,
  }),
];

const kegiatan: PublicPost[] = [
  buildPost({
    id: 'mock-kegiatan-1',
    type: 'KEGIATAN',
    title: 'Open Recruitment Pengurus Inti & Staff Divisi 2025',
    slug: 'oprec-pengurus-2025',
    date_label: '20 Agustus – 5 September 2025',
    status: 'BERJALAN',
    excerpt:
      'Perekrutan 60 pengurus baru untuk 6 divisi. Seleksi administrasi → tes tulis → wawancara → FGD. Pengumuman 10 September 2025.',
    content:
      '<p>Seluruh mahasiswa FTIK Undiksha angkatan 2023 dan 2024 diperkenankan mendaftar. Formulir pendaftaran tersedia di website HM SDP.</p>',
    coverImagePrompt:
      'Campus student organization open recruitment banner purple violet, OPREC PENGURUS 2025 text, young indonesian students group photo diverse smiling',
    category: categories.KEGIATAN_INTERNAL,
    publishedDaysAgo: 15,
    form_url: 'https://forms.gle/mock-oprec-2025',
  }),
  buildPost({
    id: 'mock-kegiatan-2',
    type: 'KEGIATAN',
    title: 'Lokakarya Desain Grafis untuk Pengurus Kominfo',
    slug: 'lokakarya-desain-grafis-2025',
    date_label: '7 September 2025 | 09:00 WITA',
    status: 'PENDAFTARAN',
    excerpt:
      'Workshop desain grafis menggunakan Figma dan Adobe Illustrator. Dipandu oleh creative director agensi periklanan Denpasar. Sertifikat + toolkit desain untuk 30 peserta.',
    content:
      '<p>Biaya pendaftaran Rp 25.000 termasuk konsumsi dan stiker toolkit. Minimum Kuota: 20 peserta.</p>',
    coverImagePrompt:
      'Graphic design workshop banner purple, digital art tablet stylus illustration, LOKAKARYA DESAIN GRAFIS text, indonesian creative workshop vibe',
    category: categories.KEGIATAN_INTERNAL,
    publishedDaysAgo: 10,
    form_url: 'https://forms.gle/mock-lokakarya-desain',
  }),
  buildPost({
    id: 'mock-kegiatan-3',
    type: 'KEGIATAN',
    title: 'Gathering Angkatan Muda HM SDP: Welcome Party 2025',
    slug: 'welcome-party-angkatan-2025',
    date_label: '24 September 2025 | 15:00 WITA',
    status: 'PENDAFTARAN',
    excerpt:
      'Malam keakraban untuk 300 mahasiswa baru angkatan 2025. Games seru, penampilan band mahasiswa, dan doorprize 2 unit smartphone.',
    content:
      '<p>Lokasi di Hall FTIK Lantai Dasar. Dress code: Casual kreatif tema warna Ungu & Putih.</p>',
    coverImagePrompt:
      'University welcome party banner purple confetti, young indonesian students laughing, GATHERING ANGKATAN MUDA 2025 text, cheerful campus event',
    category: categories.KEGIATAN_INTERNAL,
    publishedDaysAgo: 8,
    form_url: 'https://forms.gle/mock-welcome-party',
  }),
  buildPost({
    id: 'mock-kegiatan-4',
    type: 'KEGIATAN',
    title: 'Donor Darah Bersama PMI Denpasar',
    slug: 'donor-darah-pmi-2025',
    date_label: '14 September 2025 | 08:00 – 13:00 WITA',
    status: 'PENDAFTARAN',
    excerpt:
      'Kegiatan sosial donor darah bekerjasama dengan PMI Kota Denpasar. Target 120 kantong darah untuk stok PMI dan pasien di RSUP Sanglah.',
    content:
      '<p>Setiap donor mendapatkan voucher makan, sertifikat PMI, dan cek kesehatan gratis (tensi, HB, golongan darah).</p>',
    coverImagePrompt:
      'Blood donation drive university event poster purple red theme, medical doctor with blood bag, DONOR DARAH BERSAMA PMI text, indonesian hospital campaign',
    category: categories.KEGIATAN_INTERNAL,
    publishedDaysAgo: 6,
    form_url: 'https://forms.gle/mock-donor-darah',
  }),
];

const pengumuman: PublicPost[] = [
  buildPost({
    id: 'mock-pengumuman-1',
    type: 'PENGUMUMAN',
    title: 'Pendaftaran Calon Asisten Dosen Praktikum Semester Ganjil',
    slug: 'pendaftaran-asdos-praktikum-2025',
    date_label: 'Pendaftaran s/d 10 September 2025',
    status: 'DIBUKA',
    excerpt:
      'Dibuka lowongan 35 asisten dosen untuk 9 mata kuliah praktikum FTIK. Syarat: IPK ≥ 3,25, nilai mata kuliah ≥ A, dan bersedia mengikuti training 3 pertemuan.',
    content:
      '<p>Formulir pendaftaran dan detail mata kuliah yang tersedia dapat diakses melalui akademik.ftik.undiksha.ac.id.</p>',
    coverImagePrompt:
      'University teaching assistant recruitment announcement poster, students and professor lab, PENDAFTARAN ASDOS text, indonesian campus purple design',
    category: categories.PENGUMUMAN_UMUM,
    publishedDaysAgo: 4,
    form_url: 'https://forms.gle/mock-asdos-2025',
  }),
  buildPost({
    id: 'mock-pengumuman-2',
    type: 'PENGUMUMAN',
    title: 'Pemeliharaan Server dan Aplikasi Portal HM SDP',
    slug: 'pemeliharaan-server-september-2025',
    date_label: '6 September 2025 | 22:00 – 24:00 WITA',
    status: 'JADWAL',
    excerpt:
      'Mohon maaf atas ketidaknyamanannya — seluruh layanan portal HM SDP (pendaftaran kegiatan, blog, dan e-voting) akan tidak dapat diakses selama maintenance rilis versi 2.4.0.',
    content:
      '<p>Update mencakup perbaikan bug form pendaftaran, peningkatan keamanan session, dan fitur baru dashboard anggota.</p>',
    coverImagePrompt:
      'Server maintenance announcement banner, server rack datacenter blue purple lights, PEMELIHARAAN SERVER scheduled text, tech infographic schedule',
    category: categories.PENGUMUMAN_UMUM,
    publishedDaysAgo: 3,
  }),
];

const lomba: PublicPost[] = [
  buildPost({
    id: 'mock-lomba-1',
    type: 'LOMBA',
    title: 'UI/UX Design Challenge 2025 — Aplikasi Desa Adat',
    slug: 'lomba-uiux-2025',
    date_label: 'Daftar s/d 30 September 2025',
    status: 'Buka',
    form_url: 'https://forms.gle/mock-uiux-2025',
    excerpt:
      'Lomba desain aplikasi berbasis kearifan lokal desa adat Bali. Total hadiah Rp 10 juta. Tema besar: Digitalisasi Administrasi Desa.',
    content:
      '<p>Subtema: Administrasi kependudukan, Sistem adat, UMKM desa, Pariwisata desa, atau Pendidikan di desa. Final 10 desain terbaik akan dipresentasikan di hadapan juri dari industri GoTo dan Tokopedia UX team.</p>',
    coverImagePrompt:
      'UI UX design competition poster purple gradient, balinese traditional ornaments frame, mobile app interface wireframes, DESIGN CHALLENGE 2025 typography',
    category: categories.LOMBA_INTERNAL,
    publishedDaysAgo: 18,
  }),
  buildPost({
    id: 'mock-lomba-2',
    type: 'LOMBA',
    title: 'Lomba Esai Nasional: Transformasi Digital Pendidikan Vokasi',
    slug: 'lomba-esai-transformasi',
    date_label: 'Daftar s/d 15 Oktober 2025',
    status: 'Buka',
    form_url: 'https://forms.gle/mock-esai',
    excerpt:
      'Tulis gagasan terbaik meratakan kualitas pendidikan vokasi di daerah 3T NTT. Juara 1: Rp 3 juta + voucher buku Gramedia.',
    content:
      '<p>Minimal 3.000 kata, format PDF, font Times New Roman 12pt. Batas pengiriman: 15 Oktober 2025 pukul 23:59 WITA.</p>',
    coverImagePrompt:
      'Essay writing contest poster purple indigo gradient, open book quill pen laptop icons, indonesian student national essay contest design',
    category: categories.LOMBA_INTERNAL,
    publishedDaysAgo: 12,
  }),
  buildPost({
    id: 'mock-lomba-3',
    type: 'LOMBA',
    title: 'CTF Cyber War 2025: Capture The Flag Security',
    slug: 'lomba-ctf-2025',
    date_label: '1 – 3 November 2025',
    status: 'Buka',
    form_url: 'https://forms.gle/mock-ctf-2025',
    excerpt:
      'Jeopardy + Attack-Defense 3 hari offline camp, 80 tim. Juara 1: Rp 7 juta + sertifikat kompetensi BNSP Junior Security Engineer.',
    content:
      '<p>Pendaftaran dibuka resmi 15 September 2025. Kuota 80 tim pertama — pelajari roadmaps CTF di server Discord HM SDP.</p>',
    coverImagePrompt:
      'Capture the flag cybersecurity contest poster, dark purple neon hacker matrix code rain aesthetic, glowing CTF badge logo, gaming flyer',
    category: categories.LOMBA_INTERNAL,
    publishedDaysAgo: 22,
  }),
  buildPost({
    id: 'mock-lomba-4',
    type: 'LOMBA',
    title: 'Business Plan: GreenTech Startup Idea Competition 2025',
    slug: 'lomba-bizplan-greentech',
    date_label: 'Daftar s/d 20 Oktober 2025',
    status: 'Buka',
    form_url: 'https://forms.gle/mock-bizplan-greentech',
    excerpt:
      'Ide startup teknologi hijau realistis untuk Bali hijau. 10 finalis mendapatkan mentoring langsung founder eFishery & Waste4Change.',
    content:
      '<p>Kategori: Pertanian presisi, Pengolahan limbah plastik, Ekowisata digital, dan Energi hijau mikro. Final pitch day di Bali Creative Hub, 3 November 2025.</p>',
    coverImagePrompt:
      'Green tech startup business plan pitch poster, green purple color scheme, plant growing circuit board leaves, eco-friendly tech infographic',
    category: categories.LOMBA_INTERNAL,
    publishedDaysAgo: 9,
  }),
  buildPost({
    id: 'mock-lomba-5',
    type: 'LOMBA',
    title: 'Short Video HUT RI ke-80: Digitalisasi untuk Kemerdekaan',
    slug: 'lomba-video-hutri80',
    date_label: 'Daftar s/d 10 September 2025',
    status: 'Tutup',
    form_url: 'https://forms.gle/mock-video-hutri',
    excerpt:
      'Short video kreatif 60 detik vertikal. Juara 1: kamera mirrorless + fitur di TikTok HM SDP (100K+ penonton).',
    content:
      '<p>Pengumuman pemenang akan diumumkan pada upacara HUT RI ke-80 HM SDP, 17 September 2025. Terima kasih untuk 187 peserta yang telah berpartisipasi!</p>',
    coverImagePrompt:
      'Indonesia independence day short video contest poster, red white flag bunting, purple overlay, smartphone vertical frame, cinematic poster flyer',
    category: categories.LOMBA_INTERNAL,
    publishedDaysAgo: 28,
  }),
  buildPost({
    id: 'mock-lomba-6',
    type: 'LOMBA',
    title: 'Poster Digital: Stop Perundungan Siber di Lingkungan Kampus',
    slug: 'lomba-poster-anti-cyberbullying',
    date_label: 'Daftar s/d 5 November 2025',
    status: 'Buka',
    form_url: 'https://forms.gle/mock-poster-cyberbullying',
    excerpt:
      '10 desain terbaik akan dicetak poster FTIK & merchandise kampus. Hadiah: headphone, keyboard mechanical, dan puluhan voucher.',
    content:
      '<p>Spesifikasi karya: kanvas A3 landscape, 300 DPI, RGB, format PNG + AI/PSD. Batas pengumpulan: 5 November 2025.</p>',
    coverImagePrompt:
      'Anti cyberbullying awareness poster competition design, purple soft blue theme, heart shield protecting bubble chat icons, advocacy typography',
    category: categories.LOMBA_INTERNAL,
    publishedDaysAgo: 11,
  }),
  buildPost({
    id: 'mock-lomba-7',
    type: 'LOMBA',
    title: 'Lomba Debat Ilmiah Tingkat Regional Bali-Nusra',
    slug: 'lomba-debat-ilmiah-2025',
    date_label: 'Pendaftaran s/d 25 September 2025',
    status: 'Tutup',
    form_url: 'https://forms.gle/mock-debat-ilmiah',
    excerpt:
      'Debat ilmiah format British Parliamentary. Total 48 tim dari 16 kampus. Kuota pendaftaran sudah terpenuhi; terima kasih atas antusiasme kalian.',
    content:
      '<p>Jadwal babak penyisihan: 4–5 Oktober 2025. Silakan cek email resmi panitia untuk technical meeting selengkapnya.</p>',
    coverImagePrompt:
      'University british parliamentary debate competition poster, students speaking podium microphone, purple orange professional design, DEBAT ILMIAH text',
    category: categories.LOMBA_INTERNAL,
    publishedDaysAgo: 32,
  }),
  buildPost({
    id: 'mock-lomba-8',
    type: 'LOMBA',
    title: 'Pitching Mahasiswa Wirausaha: Demo Day Angkatan 2',
    slug: 'lomba-pitching-wirausaha-angkatan2',
    date_label: '16 September 2025',
    status: 'Buka',
    form_url: 'https://forms.gle/mock-demo-day-angkatan2',
    excerpt:
      'Demo Day angkatan ke-2 inkubator kewirausahaan HM SDP: 12 startup mahasiswa mempresentasikan ide kepada 10 investor dan inkubator Bali.',
    content:
      '<p>Acara terbuka untuk 150 penonton umum. Tiket masuk: gratis (registrasi terlebih dahulu untuk seat). Coffee break disediakan sponsor Kopi Nirmala.</p>',
    coverImagePrompt:
      'Startup pitch demo day event poster purple, startup founders on stage presenting to investors audience, PITCHING WIRAUSAHA text, innovation entrepreneur vibe',
    category: categories.LOMBA_INTERNAL,
    publishedDaysAgo: 5,
  }),
];

const allPosts = [...berita, ...kegiatan, ...pengumuman, ...lomba];

export const mockPostsBeritaLatestPage1: PublicPostItemsResponse = {
  items: berita.slice(0, 3),
  page: 1,
  pageSize: 3,
  total: berita.length,
  totalPages: Math.max(1, Math.ceil(berita.length / 3)),
};

export const mockPostsLombaPage1: PublicPostItemsResponse = {
  items: lomba.slice(0, 6),
  page: 1,
  pageSize: 6,
  total: lomba.length,
  totalPages: Math.max(1, Math.ceil(lomba.length / 6)),
};

export const mockBerita = berita;
export const mockKegiatan = kegiatan;
export const mockPengumuman = pengumuman;
export const mockLomba = lomba;
export const mockAllPosts = allPosts;

const albumCoverPrompts: [string, string, string[]][] = [
  [
    'Raker Awal Kabinet Sinergi Nirmala 2025 — Puncak Bogor',
    'Rapat kerja 3 hari 2 malam penyusunan program kerja seluruh pengurus.',
    [
      'Balinese university students group photo mountain villa, morning sun, purple uniform shirts, cheerful group hug',
      'Students discussion circle mats brainstorming sticky notes flip chart, collaborative energy',
      'Ice breaking games outdoor field students laughing, team building rope activity',
      'Formal opening speech student president on stage with sinergi nirmala banner',
      'Night bonfire students guitar singing together under stars, warm bokeh',
    ],
  ],
  [
    'Seminar Nasional TechTalk AI Generatif FTIK 2025',
    'Menghadirkan pembicara Google Indonesia dan Riset AI Udayana.',
    [
      'Fully packed university auditorium audience students listening keynote AI, purple stage light',
      'Keynote speaker presenting in front LED screen neural network slides',
      'Q&A student rising hand microphone panel discussion table',
      'Sponsorship booth tech companies swag distribution stickers laptop',
      'Group photo committee speakers stage flowers bouquets',
    ],
  ],
  [
    'Festival Sinergi Nirmala 2024',
    'Pameran karya, pentas seni, dan bazaar kewirausahaan HM SDP tahun lalu.',
    [
      'Indonesian campus festival day exhibition booths colorful banners, students walking around',
      'Live acoustic stage band performance, fairy lights sunset golden hour',
      'VR headset demo exhibition visitors trying goggles smiling',
      'Bazaar balinese food stalls traditional snacks vendors queue',
      'Closing ceremony fireworks purple gold sky silhouette cheering students',
    ],
  ],
  [
    'Kunjungan Industri ke Tokopedia HQ Jakarta',
    'Study tour 45 mahasiswa FTIK ke Tokopedia Tower — sharing session engineering manager.',
    [
      'Group photo modern startup office entrance company logo wall, visitor passes',
      'Open plan office tour rows standing desks programmers screens keyboards',
      'Round table product manager tech career roadmap whiteboard sketches',
      'Mini live coding workshop facilitator teaching students laptops',
      'Lunch together cafeteria office building buffet food students chatting',
    ],
  ],
];

const buildAlbum = (
  id: string,
  title: string,
  description: string,
  coverPrompts: string[],
  daysBack: number,
  isPublished = true
): PublicGalleryAlbum => ({
  id,
  title,
  description,
  is_published: isPublished,
  items: coverPrompts.map((prompt, i) => ({
    id: `mock-photo-${id}-${i}`,
    image_url: imgLandscape(prompt),
    caption: `${title} — foto ${i + 1}`,
    sort_order: i + 1,
  })),
  created_at: daysAgo(daysBack),
  updated_at: daysAgo(Math.max(1, daysBack - 2)),
});

export const mockGalleries: PublicGalleryAlbum[] = [
  buildAlbum(
    'mock-album-1',
    albumCoverPrompts[0][0],
    albumCoverPrompts[0][1],
    albumCoverPrompts[0][2],
    20
  ),
  buildAlbum(
    'mock-album-2',
    albumCoverPrompts[1][0],
    albumCoverPrompts[1][1],
    albumCoverPrompts[1][2],
    15
  ),
  buildAlbum(
    'mock-album-3',
    albumCoverPrompts[2][0],
    albumCoverPrompts[2][1],
    albumCoverPrompts[2][2],
    260
  ),
  buildAlbum(
    'mock-album-4',
    albumCoverPrompts[3][0],
    albumCoverPrompts[3][1],
    albumCoverPrompts[3][2],
    90
  ),
  {
    id: 'mock-album-5-empty',
    title: 'Acara Workshop Akan Datang: Mobile Dev Flutter',
    description:
      'Album dokumentasi untuk acara workshop Flutter yang akan dilaksanakan pada bulan Oktober 2025.',
    is_published: true,
    items: [],
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: 'mock-album-6-draft',
    title: '[DRAFT] Open Recruitment Pengurus 2025',
    description: 'Album ini masih dalam proses upload foto oleh panitia — segera hadir!',
    is_published: true,
    items: [],
    created_at: daysAgo(5),
    updated_at: daysAgo(3),
  },
];

type CommitteeInput = { id: string; name: string; role: string; sortOrder: number };
type ContactInput = { id: string; name: string; contact: string; sortOrder: number };

const buildRecruitment = (
  id: string,
  title: string,
  date_range: string,
  description: string,
  form_url: string,
  posterPrompt: string,
  committee: CommitteeInput[],
  contacts: ContactInput[],
  daysBack: number,
  isPublished = true
): PublicRecruitment => ({
  id,
  title,
  date_range,
  description,
  form_url,
  poster_image_url: imgLandscape(posterPrompt),
  is_published: isPublished,
  committee: committee.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    sort_order: c.sortOrder,
  })),
  contacts: contacts.map((c) => ({
    id: c.id,
    name: c.name,
    contact: c.contact,
    sort_order: c.sortOrder,
  })),
  created_at: daysAgo(daysBack),
  updated_at: daysAgo(Math.max(1, daysBack - 2)),
});

export const mockRecruitments: PublicRecruitment[] = [
  buildRecruitment(
    'mock-rec-1',
    'Open Recruitment Staff Divisi Litbang HM SDP 2025',
    '20 Agustus – 5 September 2025',
    'Mencari 9 staff Divisi Riset & Teknologi periode 2025/2026. Bidang: riset terapan, internal product, dan tim infrastruktur IT.',
    'https://forms.gle/mock-litbang-2025',
    'Campus technology recruitment poster purple violet, OPEN RECRUITMENT LITBANG 2025 text, indonesian university vibes, modern graphic',
    [
      { id: 'mock-rec1-com-1', name: 'I Made Bayu Saputra', role: 'Kepala Divisi', sortOrder: 1 },
      {
        id: 'mock-rec1-com-2',
        name: 'Clarissa Pramesti',
        role: 'Koordinator Seleksi',
        sortOrder: 2,
      },
      { id: 'mock-rec1-com-3', name: 'Farhan Wijaya', role: 'Tim Administrasi', sortOrder: 3 },
    ],
    [
      { id: 'mock-rec1-con-1', name: 'Bayu', contact: 'WA: 0811-3661-0011', sortOrder: 1 },
      { id: 'mock-rec1-con-2', name: 'Clara', contact: 'WA: 0812-3777-2244', sortOrder: 2 },
    ],
    15
  ),
  buildRecruitment(
    'mock-rec-2',
    'Perekrutan Panitia CodeComp HM SDP Cup 2025',
    '25 Agustus – 8 September 2025',
    'Butuh 24 panitia 6 divisi (Acara, Lomba, Humas, Sponsorship, Dekorasi, DD/ED). Pengalaman tidak wajib — semangat belajar nomor satu!',
    'https://forms.gle/mock-codecomp-panitia',
    'Competitive programming contest recruitment poster, purple neon cyber background, CODECOMP HM SDP CUP 2025, esport style flyer',
    [
      { id: 'mock-rec2-com-1', name: 'Samuel Tanujaya', role: 'Ketua Pelaksana', sortOrder: 1 },
      { id: 'mock-rec2-com-2', name: 'Jesica Halim', role: 'Wakil Ketua Pelaksana', sortOrder: 2 },
      {
        id: 'mock-rec2-com-3',
        name: 'Rara Kusumawardhani',
        role: 'Kepala Divisi SDM',
        sortOrder: 3,
      },
    ],
    [
      { id: 'mock-rec2-con-1', name: 'Sam', contact: 'WA: 0812-8888-6666', sortOrder: 1 },
      { id: 'mock-rec2-con-2', name: 'Jesica', contact: 'WA: 0812-7777-9999', sortOrder: 2 },
    ],
    12
  ),
  buildRecruitment(
    'mock-rec-3',
    'Asisten Mentor: Bootcamp Web Developer Pro',
    '25 Agustus – 10 September 2025',
    'Cari 12 asisten mentor & 4 tutor. Benefit: sertifikat pembimbing, jaringan industri, dan insentif per-sesi.',
    'https://forms.gle/mock-mentor-webdev',
    'Coding mentor recruitment poster, modern laptop purple blue gradient, MENTOR BOOTCAMP WEB DEV text, university tech atmosphere',
    [
      {
        id: 'mock-rec3-com-1',
        name: 'Talitha Ananda',
        role: 'Project Manager Bootcamp',
        sortOrder: 1,
      },
      { id: 'mock-rec3-com-2', name: 'Yoga Prasetya', role: 'Kepala Kurikulum', sortOrder: 2 },
    ],
    [
      { id: 'mock-rec3-con-1', name: 'Talitha', contact: 'WA: 0813-4444-0000', sortOrder: 1 },
      { id: 'mock-rec3-con-2', name: 'Yoga', contact: 'WA: 0813-5555-1111', sortOrder: 2 },
    ],
    10
  ),
  buildRecruitment(
    'mock-rec-4-empty',
    '[Segera Dibuka] Volunteer Bazaar UMKM Festival Sinergi Nirmala',
    'Pendaftaran: 1 – 20 November 2025',
    'Butuh 60 volunteer untuk 2 hari acara festival. Benefit: sertifikat, kaos panitia, konsumsi 2x/hari, dan reward festival. Panitia sedang dalam persiapan — narahubung dan struktur kepanitiaan akan diumumkan minggu ketiga Oktober 2025.',
    'https://forms.gle/mock-volunteer-bazaar',
    'Bazaar volunteer recruitment indonesian poster, colorful market stalls umkm balinese, purple gradient festive, VOLUNTEER BAZAAR 2025 text',
    [],
    [],
    3,
    true
  ),
  buildRecruitment(
    'mock-rec-5-draft',
    '[Internal] Staff Pelatihan Kepemimpinan (LKMM-Pra) 2025',
    'Pendaftaran dibuka 1 Oktober 2025',
    'Program LKMM-Pra untuk pengurus baru level tingkat dasar. Kuota 50 orang. Waktu dan tempat akan diinfokan melalui grup WA pengurus.',
    'https://forms.gle/mock-lkmm-pra',
    'Student leadership training indonesian poster purple gold, LKMM PRA text, young leaders handshake, university training workshop design',
    [],
    [],
    1,
    true
  ),
];
