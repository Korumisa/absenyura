type MockResult = { status: number; body: any };

function ok(data: any): MockResult {
  return { status: 200, body: { success: true, data } };
}

function created(data: any): MockResult {
  return { status: 201, body: { success: true, data } };
}

function message(text: string): MockResult {
  return { status: 200, body: { success: true, message: text } };
}

export function getApiMock(reqUrl: string, method = 'GET'): MockResult | null {
  const url = new URL(reqUrl, 'http://local.mock');
  const pathname = url.pathname;
  const sp = url.searchParams;

  if (!pathname.startsWith('/api/')) return null;

  const toIso = (d: Date) => d.toISOString();
  const now = new Date();
  const addHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);
  const addDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  const mockLocations = [
    { id: 'loc-1', name: 'Aula Kampus' },
    { id: 'loc-2', name: 'Lab Komputer' },
    { id: 'loc-3', name: 'Ruang Kelas 2.1' },
  ];

  const mockClasses = [
    { id: 'class-1', name: 'Pemrograman Web (A)' },
    { id: 'class-2', name: 'Basis Data (B)' },
    { id: 'class-3', name: 'UI/UX (Umum)' },
  ];

  const mockSessions = [
    {
      id: 'sess-1',
      title: 'Pertemuan 7: React Hooks',
      location_id: mockLocations[0].id,
      location: mockLocations[0],
      creator: { name: 'Dosen Admin' },
      class_id: null,
      class: null,
      session_classes: [{ class: mockClasses[0] }, { class: mockClasses[1] }],
      qr_mode: 'DYNAMIC',
      session_start: toIso(addHours(2)),
      session_end: toIso(addHours(4)),
      check_in_open_at: toIso(addHours(1.75)),
      check_in_close_at: toIso(addHours(2.5)),
      require_checkout: false,
      status: 'UPCOMING',
      attendances: [],
    },
    {
      id: 'sess-2',
      title: 'Praktikum: SQL Join',
      location_id: mockLocations[1].id,
      location: mockLocations[1],
      creator: { name: 'Dosen Admin' },
      class_id: mockClasses[1].id,
      class: mockClasses[1],
      session_classes: [],
      qr_mode: 'STATIC',
      session_start: toIso(addHours(-1)),
      session_end: toIso(addHours(1)),
      check_in_open_at: toIso(addHours(-1)),
      check_in_close_at: toIso(addHours(0.25)),
      require_checkout: true,
      status: 'ACTIVE',
      attendances: [],
    },
    {
      id: 'sess-3',
      title: 'Sharing Session UI/UX',
      location_id: mockLocations[2].id,
      location: mockLocations[2],
      creator: { name: 'Dosen Admin' },
      class_id: null,
      class: null,
      session_classes: [],
      qr_mode: 'NONE',
      session_start: toIso(addDays(2)),
      session_end: toIso(addDays(2.1)),
      check_in_open_at: toIso(addDays(2)),
      check_in_close_at: toIso(addDays(2.02)),
      require_checkout: false,
      status: 'UPCOMING',
      attendances: [],
    },
  ];

  const mockPublicProfile = {
    id: 'profile-1',
    org_name: 'Preview Organization',
    campus_name: 'Preview Campus',
    kabinet_name: 'PREVIEW',
    kabinet_period: '2026/2027',
    hero_subtitle: 'Preview mode',
    home_image_url: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1400&q=80',
    youtube_embed_url: 'https://www.youtube.com/embed/cqA1PrPrqp0',
    about_title: 'Tentang Organisasi',
    about_content: 'Ini contoh konten untuk preview.\n\nSilakan ubah dari CMS.',
    vision: 'Menjadi organisasi mahasiswa yang berdampak melalui inovasi dan kolaborasi.',
    mission: 'Meningkatkan kompetensi anggota.\nMendorong publikasi dan inovasi.\nMembangun jejaring strategis.',
    footer_tagline: 'Terbuka untuk kolaborasi, kemitraan, dan kerja sama.',
    instagram_url: 'https://instagram.com/',
    tiktok_url: 'https://tiktok.com/',
    youtube_url: 'https://youtube.com/',
    address: 'Jl. Contoh No. 1, Kota',
    email: 'info@organisasi.ac.id',
    phone: '081238567749',
    logo_light_url: 'https://dummyimage.com/256x256/2563eb/ffffff.png&text=P',
    logo_dark_url: 'https://dummyimage.com/256x256/111827/ffffff.png&text=P',
    primary_color: '#2563eb',
  };

  const mockAdminStructure = [
    {
      id: 'group-1',
      title: 'Badan Pengurus Harian',
      sort_order: 0,
      is_core: true,
      members: [
        { id: 'm-1', name: 'Ketua Contoh', role: 'Ketua', photo_url: null, is_spotlight: true, sort_order: 0 },
        { id: 'm-2', name: 'Wakil Ketua', role: 'Wakil Ketua I', photo_url: null, is_spotlight: false, sort_order: 1 },
        { id: 'm-3', name: 'Sekretaris', role: 'Sekretaris', photo_url: null, is_spotlight: false, sort_order: 2 },
        { id: 'm-4', name: 'Bendahara', role: 'Bendahara', photo_url: null, is_spotlight: false, sort_order: 3 },
      ],
    },
    {
      id: 'group-2',
      title: 'Kominfo',
      sort_order: 1,
      is_core: false,
      members: [
        { id: 'm-5', name: 'Kabid Kominfo', role: 'Kabid Kominfo', photo_url: null, is_spotlight: true, sort_order: 0 },
        { id: 'm-6', name: 'Staff Konten', role: 'Staff', photo_url: null, is_spotlight: false, sort_order: 1 },
        { id: 'm-7', name: 'Staff Desain', role: 'Staff', photo_url: null, is_spotlight: false, sort_order: 2 },
      ],
    },
    {
      id: 'group-3',
      title: 'PSDM',
      sort_order: 2,
      is_core: false,
      members: [
        { id: 'm-8', name: 'Kabid PSDM', role: 'Kabid PSDM', photo_url: null, is_spotlight: true, sort_order: 0 },
        { id: 'm-9', name: 'Staff Mentoring', role: 'Staff', photo_url: null, is_spotlight: false, sort_order: 1 },
      ],
    },
  ];

  const mockCategories = [
    { id: 'cat-1', name: 'Kegiatan', slug: 'kegiatan', created_at: toIso(addDays(-30)), updated_at: toIso(addDays(-1)) },
    { id: 'cat-2', name: 'Prestasi', slug: 'prestasi', created_at: toIso(addDays(-30)), updated_at: toIso(addDays(-2)) },
  ];

  const mockPosts = [
    {
      id: 'post-1',
      type: 'BERITA',
      title: 'Pelatihan UI/UX untuk Mahasiswa Baru',
      slug: 'pelatihan-ui-ux-untuk-mahasiswa-baru',
      date_label: '08 Mei 2026',
      status: null,
      form_url: null,
      excerpt: 'Workshop singkat yang membahas dasar riset pengguna, wireframe, dan desain sistem sederhana.',
      content: 'Ini contoh konten untuk preview.',
      cover_image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1400&q=80',
      category: mockCategories[0],
      category_id: mockCategories[0].id,
      is_published: true,
      published_at: toIso(addDays(-1)),
      created_at: toIso(addDays(-10)),
      updated_at: toIso(addDays(-1)),
    },
    {
      id: 'post-2',
      type: 'KEGIATAN',
      title: 'Workshop React + Tailwind untuk Pemula',
      slug: 'workshop-react-tailwind-untuk-pemula',
      date_label: '20 Apr 2026',
      status: null,
      form_url: null,
      excerpt: 'Belajar komponen, state, dan styling cepat menggunakan Tailwind.',
      content: 'Ini contoh konten untuk preview.',
      cover_image_url: 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1400&q=80',
      category: mockCategories[0],
      category_id: mockCategories[0].id,
      is_published: true,
      published_at: toIso(addDays(-2)),
      created_at: toIso(addDays(-20)),
      updated_at: toIso(addDays(-2)),
    },
    {
      id: 'post-3',
      type: 'LOMBA',
      title: 'ITCC 2026',
      slug: 'itcc-2026',
      date_label: '15 Mei 2026',
      status: 'Buka',
      form_url: 'https://forms.gle/',
      excerpt: 'Kompetisi UI/UX, Web, dan Mobile untuk mahasiswa se-Indonesia.',
      content: 'Ini contoh konten untuk preview.',
      cover_image_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80',
      category: null,
      category_id: null,
      is_published: true,
      published_at: toIso(addDays(-1)),
      created_at: toIso(addDays(-12)),
      updated_at: toIso(addDays(-1)),
    },
  ];

  const mockPrograms = [
    {
      id: 'program-1',
      title: 'Workshop & Pelatihan',
      date_range: 'Mar 2026 - Jun 2026',
      description: 'Seri pelatihan rutin untuk meningkatkan skill teknis dan soft skill.',
      is_published: true,
      created_at: toIso(addDays(-80)),
      updated_at: toIso(addDays(-2)),
    },
    {
      id: 'program-2',
      title: 'Pengabdian Masyarakat',
      date_range: 'Jul 2026',
      description: 'Program sosial dan edukasi teknologi untuk masyarakat sekitar.',
      is_published: true,
      created_at: toIso(addDays(-90)),
      updated_at: toIso(addDays(-20)),
    },
  ];

  const mockGalleries = [
    {
      id: 'album-1',
      title: 'Workshop Frontend',
      description: 'Dokumentasi workshop frontend bersama anggota baru.',
      is_published: true,
      items: [
        { id: 'a1-1', image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80', caption: 'Sesi pembukaan', sort_order: 1 },
        { id: 'a1-2', image_url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=80', caption: 'Hands-on', sort_order: 2 },
      ],
      created_at: toIso(addDays(-40)),
      updated_at: toIso(addDays(-4)),
    },
  ];

  const mockRecruitments = [
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
      created_at: toIso(addDays(-14)),
      updated_at: toIso(addDays(-2)),
    },
  ];

  if (pathname === '/api/auth/refresh' && method.toUpperCase() === 'POST') {
    return message('Tokens refreshed (mock)');
  }

  if (pathname.startsWith('/api/dashboard')) {
    return ok({
      stats: {
        total: 24,
        present: 18,
        late: 4,
        absent: 2,
        sick: 1,
        excused: 3,
        percentage: 92,
        total_users: 128,
        total_sessions: 42,
        today_present: 31,
        today_late: 6,
      },
      recent_sessions: mockSessions.slice(0, 3),
      chart_data: [],
    });
  }

  if (pathname === '/api/sessions') return ok(mockSessions);
  if (pathname.startsWith('/api/sessions/')) return ok(null);

  if (pathname === '/api/locations') return ok(mockLocations);
  if (pathname === '/api/classes') return ok(mockClasses);
  if (pathname === '/api/users') return ok([]);
  if (pathname === '/api/reports') return ok([]);
  if (pathname === '/api/settings') return ok([]);
  if (pathname === '/api/audit-logs') return ok([]);
  if (pathname === '/api/notifications') return ok([]);

  if (pathname === '/api/public-site/admin/profile') {
    if (method.toUpperCase() === 'GET') {
      return ok(mockPublicProfile);
    }
    if (method.toUpperCase() === 'PUT') return ok({});
  }

  if (pathname === '/api/public-site/admin/structure') {
    if (method.toUpperCase() === 'GET') return ok(mockAdminStructure);
    if (method.toUpperCase() === 'PUT') return ok({});
  }

  if (pathname === '/api/public-site/admin/categories') {
    if (method.toUpperCase() === 'GET') return ok(mockCategories);
    if (method.toUpperCase() === 'POST') return created({});
  }
  if (pathname.startsWith('/api/public-site/admin/categories/')) {
    if (method.toUpperCase() === 'PUT') return ok({});
    if (method.toUpperCase() === 'DELETE') return ok({});
  }

  if (pathname === '/api/public-site/admin/posts') {
    if (method.toUpperCase() === 'GET') {
      const type = String(sp.get('type') || '').trim();
      const list = type ? mockPosts.filter((p) => p.type === type) : mockPosts;
      return ok(list);
    }
    if (method.toUpperCase() === 'POST') return created({});
  }
  if (pathname.startsWith('/api/public-site/admin/posts/')) {
    if (method.toUpperCase() === 'PUT') return ok({});
    if (method.toUpperCase() === 'DELETE') return ok({});
  }

  if (pathname === '/api/public-site/admin/programs') {
    if (method.toUpperCase() === 'GET') return ok(mockPrograms);
    if (method.toUpperCase() === 'POST') return created({});
  }
  if (pathname.startsWith('/api/public-site/admin/programs/')) {
    if (method.toUpperCase() === 'PUT') return ok({});
    if (method.toUpperCase() === 'DELETE') return ok({});
  }

  if (pathname === '/api/public-site/admin/galleries') {
    if (method.toUpperCase() === 'GET') return ok(mockGalleries);
    if (method.toUpperCase() === 'POST') return created({});
  }
  if (pathname.startsWith('/api/public-site/admin/galleries/')) {
    if (method.toUpperCase() === 'PUT') return ok({});
    if (method.toUpperCase() === 'DELETE') return ok({});
  }

  if (pathname === '/api/public-site/admin/recruitments') {
    if (method.toUpperCase() === 'GET') return ok(mockRecruitments);
    if (method.toUpperCase() === 'POST') return created({});
  }
  if (pathname.startsWith('/api/public-site/admin/recruitments/')) {
    if (method.toUpperCase() === 'PUT') return ok({});
    if (method.toUpperCase() === 'DELETE') return ok({});
  }

  if (pathname === '/api/public-site/admin/upload' && method.toUpperCase() === 'POST') {
    return ok({ url: 'https://dummyimage.com/1200x900/2563eb/ffffff.png&text=Preview' });
  }

  return null;
}
