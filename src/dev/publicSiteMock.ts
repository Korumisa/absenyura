type MockResult = { status: number; body: any };

const toIso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

export function getPublicSiteMock(reqUrl: string): MockResult | null {
  const url = new URL(reqUrl, 'http://local.mock');
  const pathname = url.pathname;
  if (!pathname.startsWith('/api/public-site/')) return null;

  const publicPath = pathname.replace(/^\/api/, '');
  const sp = url.searchParams;

  const profile = {
    id: 'profile-1',
    org_name: 'Himpunan Mahasiswa Teknologi Informasi',
    campus_name: 'Universitas Udayana',
    kabinet_name: 'ELABORASI',
    kabinet_period: 'Periode 2025 / 2026',
    hero_subtitle: 'Integrity · Networking · Teamwork · Empathy · Growth · Responsibility · Adaptability',
    home_image_url: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1400&q=80',
    youtube_embed_url: 'https://www.youtube.com/embed/cqA1PrPrqp0',
    about_title: 'Tentang Organisasi',
    about_content:
      'Ini adalah contoh konten profil organisasi untuk mode dummy.\n\nSilakan atur judul, deskripsi, logo, dan media melalui menu Konten Website.',
    footer_tagline: 'Terbuka untuk kolaborasi, kemitraan, dan kerja sama dengan berbagai pihak.',
    instagram_url: 'https://instagram.com/',
    tiktok_url: 'https://tiktok.com/',
    youtube_url: 'https://youtube.com/',
    address: 'Jl. Kampus Bukit, Jimbaran, Kuta Selatan, Badung, Bali',
    email: 'info@organisasi.ac.id',
    phone: '+62 812-3456-7890',
    logo_light_url: 'https://dummyimage.com/256x256/2563eb/ffffff.png&text=H',
    logo_dark_url: 'https://dummyimage.com/256x256/111827/ffffff.png&text=H',
    primary_color: '#2563eb',
  };

  const categories = [
    { id: 'cat-1', name: 'Kegiatan', slug: 'kegiatan', created_at: toIso(daysAgo(60)), updated_at: toIso(daysAgo(2)) },
    { id: 'cat-2', name: 'Prestasi', slug: 'prestasi', created_at: toIso(daysAgo(60)), updated_at: toIso(daysAgo(3)) },
    { id: 'cat-3', name: 'Pengumuman', slug: 'pengumuman', created_at: toIso(daysAgo(60)), updated_at: toIso(daysAgo(1)) },
  ];

  const posts = [
    {
      id: 'post-berita-1',
      type: 'BERITA',
      title: 'Pelatihan UI/UX untuk Mahasiswa Baru',
      slug: 'pelatihan-ui-ux-untuk-mahasiswa-baru',
      date_label: '08 Mei 2026',
      status: null,
      excerpt: 'Workshop singkat yang membahas dasar riset pengguna, wireframe, dan desain sistem sederhana.',
      content:
        'Kami mengadakan pelatihan UI/UX untuk mahasiswa baru.\n\nMateri:\n- Pengenalan UI/UX\n- User flow & wireframe\n- Design system ringan\n\nSampai ketemu di kegiatan berikutnya!',
      cover_image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1400&q=80',
      category: categories[0],
      category_id: categories[0].id,
      is_published: true,
      published_at: toIso(daysAgo(0)),
      created_at: toIso(daysAgo(10)),
      updated_at: toIso(daysAgo(0)),
    },
    {
      id: 'post-berita-2',
      type: 'BERITA',
      title: 'Tim Organisasi Raih Juara 2 Kompetisi Web Nasional',
      slug: 'tim-organisasi-raih-juara-2-kompetisi-web-nasional',
      date_label: '02 Mei 2026',
      status: null,
      excerpt: 'Selamat untuk tim yang berhasil membawa pulang Juara 2 di kompetisi pengembangan web.',
      content: 'Tim berhasil menunjukkan performa terbaik pada tahap final.\n\nTerima kasih untuk semua pihak yang mendukung.',
      cover_image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80',
      category: categories[1],
      category_id: categories[1].id,
      is_published: true,
      published_at: toIso(daysAgo(6)),
      created_at: toIso(daysAgo(20)),
      updated_at: toIso(daysAgo(6)),
    },
    {
      id: 'post-kegiatan-1',
      type: 'KEGIATAN',
      title: 'Workshop React + Tailwind untuk Pemula',
      slug: 'workshop-react-tailwind-untuk-pemula',
      date_label: '20 Apr 2026',
      status: null,
      excerpt: 'Belajar komponen, state, dan styling cepat menggunakan Tailwind.',
      content: 'Kegiatan workshop internal.\n\nPeserta akan membuat mini project landing page.',
      cover_image_url: 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1400&q=80',
      category: categories[0],
      category_id: categories[0].id,
      is_published: true,
      published_at: toIso(daysAgo(18)),
      created_at: toIso(daysAgo(30)),
      updated_at: toIso(daysAgo(18)),
    },
    {
      id: 'post-pengumuman-1',
      type: 'PENGUMUMAN',
      title: 'Info: Pengumpulan Data Anggota',
      slug: 'info-pengumpulan-data-anggota',
      date_label: '15 Apr 2026',
      status: null,
      excerpt: 'Mohon seluruh anggota mengisi form data untuk keperluan administrasi.',
      content: 'Silakan isi data anggota melalui form yang dibagikan.\n\nDeadline: 20 April 2026.',
      cover_image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80',
      category: categories[2],
      category_id: categories[2].id,
      is_published: true,
      published_at: toIso(daysAgo(23)),
      created_at: toIso(daysAgo(40)),
      updated_at: toIso(daysAgo(23)),
    },
    {
      id: 'post-lomba-1',
      type: 'LOMBA',
      title: 'ITCC 2026',
      slug: 'itcc-2026',
      date_label: '15 Mei 2026',
      status: 'Buka',
      form_url: 'https://forms.gle/',
      excerpt: 'Kompetisi UI/UX, Web, dan Mobile untuk mahasiswa se-Indonesia.',
      content:
        'Kategori:\n- UI/UX\n- Web Development\n- Mobile Development\n\nHadiah menarik dan sertifikat.\n\nLink pendaftaran tersedia pada tombol Join.',
      cover_image_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80',
      category: null,
      category_id: null,
      is_published: true,
      published_at: toIso(daysAgo(1)),
      created_at: toIso(daysAgo(12)),
      updated_at: toIso(daysAgo(1)),
    },
    {
      id: 'post-lomba-2',
      type: 'LOMBA',
      title: 'CTF CyberWave 2.0',
      slug: 'ctf-cyberwave-2',
      date_label: '01 Mei 2026',
      status: 'Tutup',
      form_url: 'https://forms.gle/',
      excerpt: 'Challenge DFIR, PWN, WEB, CRYPTO, OSINT, dan lainnya.',
      content: 'Kompetisi sudah ditutup. Nantikan event berikutnya.',
      cover_image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1400&q=80',
      category: null,
      category_id: null,
      is_published: true,
      published_at: toIso(daysAgo(12)),
      created_at: toIso(daysAgo(45)),
      updated_at: toIso(daysAgo(12)),
    },
  ];

  const programs = [
    {
      id: 'program-1',
      title: 'Workshop & Pelatihan',
      date_range: 'Mar 2026 - Jun 2026',
      description:
        'Divisi: PSDM\nNama: Workshop & Pelatihan\nTanggal Kegiatan: 12 Mei 2026\nSumber Dana: Kas organisasi\nTarget: Mahasiswa TI (pemula–menengah)\nLokasi: Aula kampus\nRasional: Menambah exposure materi praktik yang sering dipakai di dunia industri.\n\nSeri pelatihan rutin untuk meningkatkan skill teknis dan soft skill.',
      is_published: true,
      created_at: toIso(daysAgo(80)),
      updated_at: toIso(daysAgo(2)),
    },
    {
      id: 'program-2',
      title: 'Pengabdian Masyarakat',
      date_range: 'Jul 2026',
      description:
        'Divisi: Humas\nTanggal: Jul 2026\nTarget: Siswa sekolah sekitar\nSumber Dana: Sponsorship + kas\nRasional: Berbagi literasi teknologi secara praktis.\n\nProgram sosial dan edukasi teknologi untuk masyarakat sekitar.',
      is_published: true,
      created_at: toIso(daysAgo(90)),
      updated_at: toIso(daysAgo(20)),
    },
    {
      id: 'program-3',
      title: 'Kompetisi Internal',
      date_range: 'Agu 2026',
      description: 'Divisi: Kominfo\nAjang latihan lomba untuk anggota sebelum ikut kompetisi eksternal.',
      is_published: true,
      created_at: toIso(daysAgo(70)),
      updated_at: toIso(daysAgo(15)),
    },
  ];

  const structure = [
    {
      id: 'group-1',
      title: 'Badan Pengurus Harian',
      sort_order: 1,
      members: [
        {
          id: 'm-1',
          name: 'I Gusti Komang Damar Ari Suputra',
          role: 'Ketua',
          photo_url: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=900&q=80',
          sort_order: 1,
        },
        {
          id: 'm-2',
          name: 'Nyoman Danendra Widy Pradnya',
          role: 'Wakil Ketua I',
          photo_url: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=900&q=80',
          sort_order: 2,
        },
        {
          id: 'm-3',
          name: 'Kadek Egy Putra Sena',
          role: 'Wakil Ketua II',
          photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80',
          sort_order: 3,
        },
      ],
    },
    {
      id: 'group-2',
      title: 'Kominfo',
      sort_order: 2,
      members: [
        {
          id: 'm-4',
          name: 'Putu Della Pradnyaswari Cipta Dewi',
          role: 'Kabid Kominfo',
          photo_url: 'https://images.unsplash.com/photo-1524503033411-f7a2fe8c7f4f?auto=format&fit=crop&w=900&q=80',
          sort_order: 1,
        },
        {
          id: 'm-5',
          name: 'Made Rama Devananda',
          role: 'Kadiv Pubdok',
          photo_url: 'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=900&q=80',
          sort_order: 2,
        },
        {
          id: 'm-6',
          name: 'Putu Satria Wibawa',
          role: 'Kadiv Medsos',
          photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80',
          sort_order: 3,
        },
        {
          id: 'm-7',
          name: 'Ni Kadek Dwi Lestari',
          role: 'Staff Desain',
          photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
          sort_order: 4,
        },
        {
          id: 'm-8',
          name: 'I Made Putra Aditya',
          role: 'Staff Konten',
          photo_url: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=900&q=80',
          sort_order: 5,
        },
        {
          id: 'm-9',
          name: 'Ni Luh Ayu Prameswari',
          role: 'Staff Dokumentasi',
          photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80',
          sort_order: 6,
        },
        {
          id: 'm-10',
          name: 'Kadek Yoga Pratama',
          role: 'Staff Editor',
          photo_url: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=900&q=80',
          sort_order: 7,
        },
      ],
    },
    {
      id: 'group-3',
      title: 'PSDM',
      sort_order: 3,
      members: [
        {
          id: 'm-11',
          name: 'Kadek Putu Ananta Wijaya',
          role: 'Kabid PSDM',
          photo_url: 'https://images.unsplash.com/photo-1524502397800-2eeaad7c3fe5?auto=format&fit=crop&w=900&q=80',
          sort_order: 1,
        },
        {
          id: 'm-12',
          name: 'Ni Putu Sari Mahadewi',
          role: 'Kadiv Pengembangan',
          photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
          sort_order: 2,
        },
        {
          id: 'm-13',
          name: 'I Komang Dewa Arimbawa',
          role: 'Kadiv Pelatihan',
          photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80',
          sort_order: 3,
        },
        {
          id: 'm-14',
          name: 'Made Ratih Puspasari',
          role: 'Staff Mentoring',
          photo_url: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=900&q=80',
          sort_order: 4,
        },
        {
          id: 'm-15',
          name: 'Ni Kadek Ayu Saraswati',
          role: 'Staff Pengembangan',
          photo_url: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=900&q=80',
          sort_order: 5,
        },
      ],
    },
  ];

  const galleries = [
    {
      id: 'album-1',
      title: 'Workshop Frontend',
      description: 'Dokumentasi workshop frontend bersama anggota baru.',
      is_published: true,
      items: [
        { id: 'a1-1', image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80', caption: 'Sesi pembukaan', sort_order: 1 },
        { id: 'a1-2', image_url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=80', caption: 'Hands-on coding', sort_order: 2 },
        { id: 'a1-3', image_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1400&q=80', caption: 'Diskusi kelompok', sort_order: 3 },
      ],
      created_at: toIso(daysAgo(40)),
      updated_at: toIso(daysAgo(4)),
    },
    {
      id: 'album-2',
      title: 'Bakti Sosial',
      description: 'Kegiatan sosial dan edukasi teknologi.',
      is_published: true,
      items: [
        { id: 'a2-1', image_url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80', caption: 'Persiapan', sort_order: 1 },
        { id: 'a2-2', image_url: 'https://images.unsplash.com/photo-1520975693416-35a2fdb2fbdc?auto=format&fit=crop&w=1400&q=80', caption: 'Kegiatan', sort_order: 2 },
      ],
      created_at: toIso(daysAgo(55)),
      updated_at: toIso(daysAgo(10)),
    },
  ];

  const recruitments = [
    {
      id: 'rec-1',
      title: 'Open Recruitment 2026',
      date_range: '05 Mei 2026 - 15 Mei 2026',
      description: 'Buka pendaftaran anggota baru. Pilih divisi dan ikut jadi bagian dari organisasi.',
      form_url: 'https://forms.gle/',
      poster_image_url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1400&q=80',
      is_published: true,
      committee: [
        { id: 'c-1', name: 'Made Surya', role: 'Koordinator', sort_order: 1 },
        { id: 'c-2', name: 'Ni Luh Ayu', role: 'Sekretaris', sort_order: 2 },
      ],
      contacts: [
        { id: 'cp-1', name: 'Contact 1', contact: '+62 812-1111-2222', sort_order: 1 },
        { id: 'cp-2', name: 'Contact 2', contact: '+62 812-3333-4444', sort_order: 2 },
      ],
      created_at: toIso(daysAgo(14)),
      updated_at: toIso(daysAgo(2)),
    },
  ];

  const ok = (payload: any): MockResult => ({ status: 200, body: { data: payload } });

  if (publicPath === '/public-site/profile') return ok(profile);
  if (publicPath === '/public-site/categories') return ok(categories);
  if (publicPath === '/public-site/programs') return ok(programs);
  if (publicPath === '/public-site/structure') return ok(structure);
  if (publicPath === '/public-site/galleries') return ok(galleries);
  if (publicPath === '/public-site/recruitments') return ok(recruitments);

  if (publicPath === '/public-site/posts') {
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
    const pageSize = Math.max(1, parseInt(sp.get('pageSize') || '10', 10) || 10);
    const type = (sp.get('type') || '').trim();
    const q = (sp.get('q') || '').trim().toLowerCase();
    const categorySlug = (sp.get('categorySlug') || '').trim();

    let list = posts.slice();
    if (type) list = list.filter((p) => p.type === type);
    if (categorySlug) list = list.filter((p) => p.category?.slug === categorySlug);
    if (q) list = list.filter((p) => String(p.title || '').toLowerCase().includes(q));

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const items = list.slice(start, start + pageSize);
    return ok({ items, total, page: safePage, pageSize, totalPages });
  }

  const postMatch = publicPath.match(/^\/public-site\/posts\/([^/]+)$/);
  if (postMatch) {
    const slug = decodeURIComponent(postMatch[1] || '');
    const found = posts.find((p) => p.slug === slug) || null;
    return ok(found);
  }

  return null;
}

