import 'dotenv/config';
import { PrismaClient, PublicPostType } from '@prisma/client';

if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

const enc = encodeURIComponent;
const imgLandscape = (p) =>
  `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${enc(p)}&image_size=landscape_16_9`;
const imgPortrait = (p) =>
  `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${enc(p)}&image_size=portrait_4_3`;
const imgSquareHD = (p) =>
  `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${enc(p)}&image_size=square_hd`;

const today = new Date();
const publishedAt = new Date(today.getTime() - 2 * 24 * 3600 * 1000);

async function enrichProfile() {
  const profile = await prisma.publicSiteProfile.findFirst({ orderBy: { created_at: 'asc' } });
  if (!profile) {
    console.log('  skip enrich profile (tidak ditemukan)');
    return;
  }
  await prisma.publicSiteProfile.update({
    where: { id: profile.id },
    data: {
      hero_subtitle:
        'Himpunan Mahasiswa Informatika Universitas Demo Indonesia — Sinergi, Karya, dan Prestasi untuk Bangsa',
      home_image_url: imgLandscape(
        'Indonesian university student organization building modern campus with diverse students gathering, cinematic wide shot, golden hour, purple and violet accent colors'
      ),
      youtube_embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      about_title: 'Tentang HMIF',
      about_content:
        'HMIF Universitas Demo Indonesia adalah organisasi kemahasiswaan yang menaungi seluruh mahasiswa Informatika. Kami berkomitmen mengembangkan potensi akademik, kepemimpinan, dan kreativitas anggota melalui program kerja unggulan sepanjang tahun.',
      home_card_left_title: '98% Anggota Lulus Tepat Waktu',
      home_card_left_body:
        'Dengan dukungan akademik terstruktur, mentoring senior, dan program belajar bersama, tingkat kelulusan tepat waktu HMIF secara konsisten berada di atas rata-rata universitas.',
      home_card_right_title: '37+ Prestasi Nasional & Internasional',
      home_card_right_body:
        'Lomba programming, hackathon, riset aplikasi, dan debat ilmiah — setiap tahun delegasi HMIF membawa pulang prestasi bergengsi di tingkat regional, nasional, dan internasional.',
      vision:
        'Menjadi himpunan mahasiswa informatika unggul di Indonesia yang menghasilkan lulusan kompeten, berkarakter, dan siap berkontribusi di era digital.',
      mission:
        '1. Menyediakan wadah pengembangan akademik dan non-akademik bagi seluruh anggota.\n2. Menjalin sinergi dengan pihak kampus, industri, dan alumni.\n3. Mendorong budaya riset, inovasi, dan kewirausahaan berbasis teknologi.\n4. Berperan aktif dalam pengabdian masyarakat melalui program berkelanjutan.',
      visi_photo_url: imgPortrait(
        'Professional male Indonesian university student leader close-up, formal blazer purple background, confident, corporate headshot style'
      ),
      visi_name: 'Rizky Pratama, S.Kom.',
      visi_role: 'Ketua Umum Kabinet Sinergi 2025/2026',
      misi_photo_url: imgPortrait(
        'Professional female Indonesian university student leader close-up, soft smile, purple accent background, corporate headshot style'
      ),
      misi_name: 'Anindya Putri Maharani',
      misi_role: 'Wakil Ketua Umum Kabinet Sinergi 2025/2026',
      footer_tagline: 'HMIF Universitas Demo Indonesia — Kabinet Sinergi 2025/2026',
      instagram_url: 'https://instagram.com/hmif.demo',
      tiktok_url: 'https://tiktok.com/@hmif.demo',
      youtube_url: 'https://youtube.com/@HMIF-Demo',
      address: 'Jl. Teknologi Informasi No. 7, Gedung Informatika Lt. 2, Kampus Demo, 12345',
      email: 'hmif@demo.ac.id',
      phone: '+62 812-3456-7890',
      logo_light_url: imgSquareHD(
        'Minimalist tech university student association logo, monogram H M I F letter mark, purple violet color palette, clean flat vector logo design'
      ),
      logo_dark_url: imgSquareHD(
        'Minimalist tech university student association logo, monogram H M I F letter mark, white and soft purple gradient on dark background, clean vector'
      ),
      primary_color: '#7c3aed',
    },
  });
  console.log('  ✅ profile enriched (hero, about, visi-misi, kontak, logos)');
}

async function seedStructure() {
  let cabinet = await prisma.publicStructureCabinet.findFirst({
    where: { is_active: true },
    orderBy: { sort_order: 'asc' },
  });
  if (!cabinet) {
    cabinet = await prisma.publicStructureCabinet.create({
      data: { name: 'Kabinet Sinergi', period: '2025/2026', is_active: true, sort_order: 0 },
    });
    console.log(`  ✅ cabinet created: ${cabinet.name} ${cabinet.period}`);
  } else {
    console.log(`  ℹ️  cabinet exists: ${cabinet.name} ${cabinet.period} (tambah anggota baru jika grup kosong)`);
  }

  const existingCore = await prisma.publicStructureGroup.count({
    where: { cabinet_id: cabinet.id, is_core: true },
  });
  if (existingCore > 0) {
    console.log('  skip seed struktur (sudah berisi)');
    return;
  }

  const core = await prisma.publicStructureGroup.create({
    data: { cabinet_id: cabinet.id, title: 'Inti Kabinet', sort_order: 1, is_core: true },
  });
  await prisma.publicStructureMember.createMany({
    data: [
      {
        group_id: core.id,
        name: 'Rizky Pratama',
        role: 'Ketua Umum',
        photo_url: imgPortrait(
          'Indonesian male university student ketua umum headshot, formal, confident, purple accent background, portrait 4x3'
        ),
        is_spotlight: true,
        sort_order: 1,
      },
      {
        group_id: core.id,
        name: 'Anindya Putri Maharani',
        role: 'Wakil Ketua Umum',
        photo_url: imgPortrait(
          'Indonesian female university student wakil ketua headshot, friendly smile, purple background, portrait 4x3'
        ),
        is_spotlight: true,
        sort_order: 2,
      },
      {
        group_id: core.id,
        name: 'Dimas Nugroho',
        role: 'Sekretaris Jenderal',
        photo_url: imgPortrait('Young Indonesian male secretary portrait, office look, light background'),
        sort_order: 3,
      },
      {
        group_id: core.id,
        name: 'Maya Ayu Lestari',
        role: 'Bendahara',
        photo_url: imgPortrait('Young Indonesian female treasurer portrait, cheerful, purple frame'),
        sort_order: 4,
      },
    ],
  });

  const divisions = [
    {
      title: 'Divisi Riset & Teknologi (Litbang)',
      sort_order: 10,
      members: [
        ['Bayu Saputra', 'Kepala Divisi', 'Indonesian male division head portrait, serious, purple office'],
        ['Clarissa Wijaya', 'Anggota', 'Indonesian female programmer coding laptop portrait'],
        ['Farhan Maulana', 'Anggota', 'Indonesian male researcher portrait holding tablet'],
      ],
    },
    {
      title: 'Divisi Komunikasi & Informasi (Kominfo)',
      sort_order: 20,
      members: [
        ['Talitha Anisa', 'Kepala Divisi', 'Indonesian female marketing head portrait holding camera'],
        ['Bagas Pramono', 'Anggota', 'Male videographer holding gimbal camera portrait'],
        ['Citra Dewi', 'Anggota', 'Female graphic designer digital art tablet portrait'],
      ],
    },
    {
      title: 'Divisi Pengembangan SDM (PSDM)',
      sort_order: 30,
      members: [
        ['Samuel Tanujaya', 'Kepala Divisi', 'Indonesian male HR head portrait, leadership, office'],
        ['Rara Kusumawardhani', 'Anggota', 'Female mentor mentoring student portrait cheerful'],
        ['Yoga Prasetya', 'Anggota', 'Male trainer flip chart seminar room portrait'],
      ],
    },
    {
      title: 'Divisi Hubungan Masyarakat (Humas)',
      sort_order: 40,
      members: [
        ['Jesica Halim', 'Kepala Divisi', 'Indonesian female PR head portrait, professional, handshake background'],
        ['Rendy Kurniawan', 'Anggota', 'Male event organizer venue check portrait smile'],
        ['Bunga Azzahra', 'Anggota', 'Female campus ambassador poster event portrait'],
      ],
    },
    {
      title: 'Divisi Kewirausahaan (Kwu)',
      sort_order: 50,
      members: [
        ['Vincent Wijaya', 'Kepala Divisi', 'Indonesian young entrepreneur headshot, startup founder vibe'],
        ['Olivia Gunawan', 'Anggota', 'Female online seller packing product portrait'],
        ['Alfaro Hermawan', 'Anggota', 'Male fintech pitch deck presentation portrait'],
      ],
    },
    {
      title: 'Divisi Pengabdian Masyarakat (Pengmas)',
      sort_order: 60,
      members: [
        ['Nadia Permatasari', 'Kepala Divisi', 'Indonesian female community service head portrait village background'],
        ['Fajar Ramadhan', 'Anggota', 'Male volunteer teaching children village portrait'],
        ['Mawar Sari', 'Anggota', 'Female medical volunteer health check portrait rural'],
      ],
    },
  ];

  for (const div of divisions) {
    const g = await prisma.publicStructureGroup.create({
      data: { cabinet_id: cabinet.id, title: div.title, sort_order: div.sort_order, is_core: false },
    });
    await prisma.publicStructureMember.createMany({
      data: div.members.map(([name, role, prompt], i) => ({
        group_id: g.id,
        name,
        role,
        photo_url: imgPortrait(prompt),
        sort_order: i + 1,
      })),
    });
  }
  console.log(`  ✅ struktur: 1 core + ${divisions.length} divisi, total anggota = 4 + ${divisions.length * 3}`);
}

async function seedPrograms() {
  const existing = await prisma.publicProgram.count({ where: { is_published: true } });
  if (existing > 0) {
    console.log(`  skip programs (sudah ${existing} published)`);
    return;
  }
  const programs = [
    {
      title: 'Bootcamp Web Developer Professional',
      date_range: '15 September – 15 November 2025',
      description:
        'Pelatihan intensive 2 bulan full-stack web development (React + Node.js + PostgreSQL) dengan mentor industri aktif, diakhiri dengan job connect mini-hackathon. Kuota 60 peserta.',
    },
    {
      title: 'TechTalk: AI Generatif & Etika Penggunaannya',
      date_range: '18 September 2025',
      description:
        'Seminar nasional menghadirkan peneliti AI dan praktisi dari Big Tech — membahas best practice penggunaan LLM di dunia perkuliahan, pengembangan produk, dan riset akademik.',
    },
    {
      title: 'CodeComp HMIF Cup 2025',
      date_range: '1 – 10 Oktober 2025',
      description:
        'Kompetisi pemrograman nasional bergengsi mahasiswa informatika seluruh Indonesia. Total hadiah Rp 15.000.000 + akses beasiswa bootcamp eksklusif.',
    },
    {
      title: 'KM Informatika: Mengajar di Desa',
      date_range: 'Oktober – Desember 2025',
      description:
        'Program Kuliah Kerja Nyata tematik HMIF — mengajar TIK dan literasi digital di 3 desa mitra Jawa Barat, melibatkan 40 mahasiswa dan 12 dosen pembimbing.',
    },
    {
      title: 'Startup Sprint: Pitch Your Idea',
      date_range: '27 September – 5 Oktober 2025',
      description:
        'Pre-inkubasi startup 9 hari: validasi ide, bikin MVP, presentasi ke investor. Tiga tim terbaik mendapat pendaftaran inkubator kampus gratis.',
    },
    {
      title: 'Study Club OSN & Competitive Programming',
      date_range: 'Setiap Sabtu (Agustus – Desember 2025)',
      description:
        'Pembinaan rutin algoritma dan competitive programming untuk persiapan OSN, Gemastik, ICPC, dan Codeforces contest. Dipandu oleh mentor medali nasional.',
    },
    {
      title: 'Alumni Homecoming & Career Day 2025',
      date_range: '22 November 2025',
      description:
        'Kumpul alumni HMIF lintas angkatan + career fair 25+ perusahaan teknologi partner. Buka lowongan magang, fresh-graduate, dan beasiswa pascasarjana.',
    },
    {
      title: 'Festival Sinergi: Pameran Karya & Pentas Seni',
      date_range: '13 – 14 Desember 2025',
      description:
        'Acara puncak akhir tahun Kabinet Sinergi: pameran proyek mata kuliah, demo startup mahasiswa, pentas seni band akustik, serta bazaar wirausaha anggota.',
    },
  ];
  const titles = programs.map((p) => ({ ...p, is_published: true }));
  await prisma.publicProgram.createMany({ data: titles, skipDuplicates: true });
  console.log(`  ✅ programs: ${titles.length} program kerja dipublikasikan`);
}

async function seedRecruitments() {
  const existing = await prisma.publicRecruitment.count({ where: { is_published: true } });
  if (existing > 0) {
    console.log(`  skip recruitments (sudah ${existing} published)`);
    return;
  }
  const recs = [
    {
      title: 'Open Recruitment Staff Divisi Litbang 2025',
      date_range: '20 Agustus – 5 September 2025',
      description:
        'Mencari 9 staff baru Divisi Riset & Teknologi HMIF untuk periode 2025/2026. Bidang: riset terapan, pengembangan internal product, dan tim infrastruktur IT.',
      form_url: 'https://forms.gle/demo-litbang-2025',
      poster_image_url: imgLandscape(
        'Campus technology recruitment poster purple violet theme, text OPEN RECRUITMENT LITBANG 2025, Indonesian university vibes, modern clean graphic'
      ),
      committees: [
        ['Bayu Saputra', 'Kepala Divisi'],
        ['Clarissa Wijaya', 'Koordinator Seleksi'],
        ['Farhan Maulana', 'Tim Administrasi'],
      ],
      contacts: [
        ['Bayu', 'WA: 0811-1111-2222'],
        ['Clara', 'WA: 0812-3333-4444'],
      ],
    },
    {
      title: 'Perekrutan Panitia CodeComp HMIF Cup 2025',
      date_range: '25 Agustus – 8 September 2025',
      description:
        'Butuh 24 panitia untuk 6 divisi (Acara, Lomba, Humas, Sponsorship, Dekorasi, DD/ED). Pengalaman kepanitiaan tidak diwajibkan — semangat belajar nomor satu!',
      form_url: 'https://forms.gle/demo-codecomp-panitia',
      poster_image_url: imgLandscape(
        'Competitive programming contest recruitment poster, purple neon cyber background, CODECOMP HMIF CUP 2025, modern esport-style flyer'
      ),
      committees: [
        ['Samuel Tanujaya', 'Ketua Pelaksana'],
        ['Jesica Halim', 'Wakil Ketua Pelaksana'],
        ['Rara Kusumawardhani', 'Divisi SDM'],
      ],
      contacts: [
        ['Sam', 'WA: 0812-5555-6666'],
        ['Jesica', 'WA: 0812-7777-8888'],
      ],
    },
    {
      title: 'Asisten Mentor Bootcamp Web Dev Pro',
      date_range: '25 Agustus – 10 September 2025',
      description:
        'Kami cari 12 asisten mentor dan 4 tutor untuk Bootcamp Web Developer Professional. Benefit: sertifikat pembimbing, jaringan industri, dan insentif sesi mentoring.',
      form_url: 'https://forms.gle/demo-mentor-webdev',
      poster_image_url: imgLandscape(
        'Coding mentor recruitment poster, modern laptop purple blue gradient, MENTOR BOOTCAMP WEB DEV text, Indonesian university tech atmosphere'
      ),
      committees: [
        ['Talitha Anisa', 'PM Bootcamp'],
        ['Yoga Prasetya', 'Kepala Kurikulum'],
      ],
      contacts: [
        ['Talitha', 'WA: 0812-9999-0000'],
        ['Yoga', 'WA: 0813-1111-2222'],
      ],
    },
  ];

  for (const r of recs) {
    const created = await prisma.publicRecruitment.create({
      data: {
        title: r.title,
        date_range: r.date_range,
        description: r.description,
        form_url: r.form_url,
        poster_image_url: r.poster_image_url,
        is_published: true,
        committee: { createMany: { data: r.committees.map(([n, role], i) => ({ name: n, role, sort_order: i + 1 })) } },
        contacts: { createMany: { data: r.contacts.map(([n, c], i) => ({ name: n, contact: c, sort_order: i + 1 })) } },
      },
    });
    console.log(`  ✅ recruitment: ${created.title}`);
  }
}

async function seedGalleries() {
  const existing = await prisma.publicGalleryAlbum.count({ where: { is_published: true } });
  if (existing > 0) {
    console.log(`  skip galleries (sudah ${existing} published)`);
    return;
  }
  const albums = [
    {
      title: 'Raker Awal Kabinet Sinergi 2025',
      description:
        'Rapat kerja dan penyusunan program kerja seluruh pengurus HMIF selama 3 hari 2 malam di Villa Puncak Bogor.',
      items: [
        'Group photo of Indonesian university students on mountain villa, morning sun, purple uniform shirts, group hug cheerful',
        'Students discussion circle on mats brainstorming sticky notes on flip chart paper, collaborative energy',
        'Ice breaking session games outdoor field, students laughing, team building ropes activity',
        'Formal opening ceremony speech student president giving speech on stage banner background',
        'Night bonfire students guitar singing together under the stars, warm bokeh lighting',
      ],
    },
    {
      title: 'TechTalk AI Generatif 2025',
      description: 'Seminar nasional menghadirkan pembicara dari Google, Tokopedia, dan riset AI ITB.',
      items: [
        'Fully packed university auditorium audience students listening keynote on AI topic, stage purple lighting',
        'Keynote speaker presenting in front of large LED screen showing neural network slides',
        'Interactive Q&A session student raising hand microphone, panel discussion long table',
        'Sponsorship booth IT companies swag distribution laptop stickers colorful',
        'Group photo organizing committee and all speakers on stage, holding flower bouquets',
      ],
    },
    {
      title: 'Festival Sinergi 2024',
      description:
        'Pameran karya dan pentas seni tahun lalu — perpaduan teknologi, seni, dan bazaar mahasiswa.',
      items: [
        'Indonesian campus festival daytime outdoor exhibition booths colorful banners, students walking around',
        'Live music stage acoustic band performance, fairy lights sunset golden hour',
        'Project demo VR headset exhibition visitors trying virtual reality goggles smiling',
        'Bazaar food stalls classic Indonesian snacks vendors, queue of students',
        'Closing ceremony fireworks purple golden sky silhouette cheering students foreground',
      ],
    },
    {
      title: 'Kunjungan Industri ke Tokopedia HQ',
      description:
        'Study tour 45 mahasiswa HMIF ke kantor pusat Tokopedia di Jakarta Selatan — sharing session bersama engineering manager.',
      items: [
        'Group photo modern startup office entrance, company logo wall, students wearing visitor passes',
        'Open plan office tour rows of standing desks programmers working screens keyboard',
        'Round table sharing session product manager explaining career roadmap tech industry, whiteboard sketches',
        'Mini workshop live coding session facilitator teaching on screen, students with laptops',
        'Lunch together cafeteria office building, buffet food students chatting laughing',
      ],
    },
  ];
  for (const a of albums) {
    const album = await prisma.publicGalleryAlbum.create({
      data: {
        title: a.title,
        description: a.description,
        is_published: true,
        items: {
          createMany: {
            data: a.items.map((prompt, i) => ({
              image_url: imgLandscape(prompt),
              caption: `${a.title} — foto ${i + 1}`,
              sort_order: i + 1,
            })),
          },
        },
      },
    });
    console.log(`  ✅ album: ${album.title} (${a.items.length} foto)`);
  }
}

async function seedPosts() {
  const existingBerita = await prisma.publicPost.count({
    where: { is_published: true, type: PublicPostType.BERITA },
  });
  const existingLomba = await prisma.publicPost.count({
    where: { is_published: true, type: PublicPostType.LOMBA },
  });

  const beritaCat = await prisma.publicCategory.findUnique({ where: { slug: 'berita' } });
  const lombaCat = await prisma.publicCategory.findUnique({ where: { slug: 'informasi-lomba' } });

  if (existingBerita > 0 && existingLomba > 0) {
    console.log(`  skip posts (berita=${existingBerita}, lomba=${existingLomba})`);
    return;
  }

  const berita =
    existingBerita === 0
      ? [
          {
            type: PublicPostType.BERITA,
            title: 'HMIF Borong 5 Medali di Gemastik XVII 2024',
            slug: 'gemastik-xvii-2024-medali',
            date_label: '12 Juli 2025',
            status: 'PUBLIKASI',
            excerpt:
              'Tim delegasi HMIF Universitas Demo Indonesia berhasil meraih total 5 medali di ajang Gemastik XVII yang diselenggarakan di Surabaya — termasuk 1 emas cabang Pengembangan Aplikasi Web.',
            content:
              '<p>Perjalanan kompetisi selama 5 hari tidaklah mudah. Tim kami berlaga melawan 320 tim dari seluruh Indonesia. Alhamdulillah, hasil kerja keras sepanjang semester genap 2024/2025 membuahkan hasil yang luar biasa. Total 5 medali: 1 emas, 2 perak, 2 perunggu.</p><p>Rektor Universitas Demo Indonesia, Prof. Dr. Sutopo, menyatakan kebanggaannya dan memberikan bonus insentif prestasi serta beasiswa pendidikan bagi seluruh anggota tim. "Kalian kebanggaan kampus. Terus berprestasi!" tuturnya.</p>',
            category_id: beritaCat?.id ?? undefined,
            cover_prompt:
              'Indonesian university students team celebrating competition awards on stage, holding trophy and medals, confetti falling, purple gold celebration atmosphere, Gemastik banner background',
          },
          {
            type: PublicPostType.BERITA,
            title: 'Kerja Sama MoU HMIF dengan AWS untuk Program Pelatihan Cloud',
            slug: 'mou-hmif-aws-cloud-training-2025',
            date_label: '30 Juli 2025',
            status: 'PUBLIKASI',
            excerpt:
              'Hari ini resmi ditandatangani Nota Kesepahaman antara HMIF UDI dan Amazon Web Services Indonesia untuk pelatihan cloud computing bersertifikasi AWS Cloud Practitioner bagi 200 mahasiswa.',
            content:
              '<p>Penandatangan MoU dilakukan langsung oleh Ketua Umum HMIF dan Country Head Education AWS Indonesia. Seluruh mahasiswa informatika aktif berhak mengikuti kelas daring 8 pertemuan + ujian sertifikasi dengan biaya ditanggung penuh program kerja HMIF.</p><p>Peserta yang lulus akan mendapatkan digital badge AWS dan masuk ke talent pool rekomendasi magang AWS partner di seluruh Indonesia. Pendaftaran dibuka bulan depan! Pantau terus Instagram @hmif.demo.</p>',
            category_id: beritaCat?.id ?? undefined,
            cover_prompt:
              'MOU signing ceremony university student organization and tech company representative, exchanging signed documents, corporate meeting room purple accent, AWS logo on screen',
          },
          {
            type: PublicPostType.BERITA,
            title: 'Raihan Juara 1 Hackathon Fintech Nasional 2025',
            slug: 'juara-1-hackathon-fintech-2025',
            date_label: '21 Agustus 2025',
            status: 'PUBLIKASI',
            excerpt:
              'Tim KiriKiri.Uang dari HMIF berhasil membawa pulang juara pertama Hackathon Fintech Nasional 2025 dengan aplikasi UMKM micro-investment, mengungguli 157 tim finalis lainnya.',
            content:
              '<p>Selama 48 jam non-stop, tim beranggotakan 4 orang: Vincent, Olivia, Bagas, dan Citra, berhasil mengembangkan aplikasi end-to-end micro-savings berbasis WhatsApp untuk UMKM ibu rumah tangga. Produk mereka lulus uji validasi 4 panelis investor venture capital.</p><p>Hadiah utama berupa pendanaan pre-seed Rp 75 juta dan inkubasi 6 bulan di Jakarta Tech Hub. "Ini baru awal. Setelah kompetisi, kita realisasikan produknya!" ujar Vincent, CEO tim, penuh semangat.</p>',
            category_id: beritaCat?.id ?? undefined,
            cover_prompt:
              'Winner champion team hackathon competition holding oversized check money prize, big smiles thumbs up, purple tech stage backdrop spotlight, fintech poster background',
          },
        ]
      : [];

  const lomba =
    existingLomba === 0
      ? [
          {
            type: PublicPostType.LOMBA,
            title: 'Competition: UI/UX Design Challenge 2025',
            slug: 'lomba-ui-ux-design-challenge-2025',
            date_label: 'Pendaftaran s/d 30 September 2025',
            status: 'OPEN',
            form_url: 'https://forms.gle/demo-uiux-2025',
            excerpt:
              'Lomba desain UI/UX tingkat nasional mahasiswa. Tema: "Aplikasi Layanan Publik Ramah Disabilitas". Hadiah total Rp 10 juta + sertifikat nasional.',
            content:
              '<p><strong>Timeline:</strong></p><ul><li>Pendaftaran: hingga 30 September 2025</li><li>Pengumuman Lolos Seleksi Administrasi: 5 Oktober 2025</li><li>Submission Babak Final: 25 Oktober 2025</li><li>Pengumuman Pemenang: 30 Oktober 2025</li></ul>',
            category_id: lombaCat?.id ?? undefined,
            cover_prompt:
              'UI UX design competition poster, purple gradient, modern mobile app interface wireframes floating around text UI UX CHALLENGE 2025, indonesian student graphic poster style',
          },
          {
            type: PublicPostType.LOMBA,
            title: 'Lomba Esai Nasional: Transformasi Digital Pendidikan',
            slug: 'lomba-esai-transformasi-digital-pendidikan',
            date_label: 'Pendaftaran s/d 15 Oktober 2025',
            status: 'OPEN',
            form_url: 'https://forms.gle/demo-esai-pendidikan',
            excerpt:
              'Tulis gagasan terbaikmu tentang bagaimana AI dan teknologi digital dapat meratakan kualitas pendidikan di daerah 3T. Hadiah juara 1 Rp 3 juta + e-voucher buku.',
            content:
              '<p>Seluruh mahasiswa Indonesia aktif boleh ikut, maksimal 24 tahun. Format esai 3000-5000 kata, belum pernah dipublikasikan. Penilaian oleh dosen ahli pendidikan dan redaktur nasional.</p>',
            category_id: lombaCat?.id ?? undefined,
            cover_prompt:
              'Essay writing competition poster, purple indigo gradient, open book quill pen laptop icons, Indonesian national essay contest design, clean typography',
          },
          {
            type: PublicPostType.LOMBA,
            title: 'CTF Capture The Flag Cybersecurity War 2025',
            slug: 'lomba-ctf-cyber-war-2025',
            date_label: '1 – 3 November 2025',
            status: 'COMING SOON',
            form_url: 'https://forms.gle/demo-ctf-2025',
            excerpt:
              'Kompetisi keamanan siber CTF Jeopardy + Attack-Defense 3 hari 2 malam offline camp. Kuota 80 tim. Juara 1: Rp 7 juta + sertifikat BNSP kompetensi junior security engineer.',
            content:
              '<p>Kategori soal: Web, Pwn, Crypto, Forensics, Reverse Engineering, OSINT. Materi pra-competition briefing rilis di channel Telegram HMIF 1 minggu sebelum event.</p>',
            category_id: lombaCat?.id ?? undefined,
            cover_prompt:
              'Capture the flag cybersecurity contest poster, dark purple neon hacker matrix digital code rain aesthetic, glowing CTF badge logo, hacking gaming style flyer',
          },
          {
            type: PublicPostType.LOMBA,
            title: 'Business Plan Competition: GreenTech Startup Idea',
            slug: 'lomba-business-plan-greentech-2025',
            date_label: 'Pendaftaran s/d 20 Oktober 2025',
            status: 'OPEN',
            form_url: 'https://forms.gle/demo-bizplan-greentech',
            excerpt:
              'Kirim rencana bisnis startup teknologi berbasis lingkungan yang orisinal. 10 tim finalis mendapatkan akses mentoring langsung oleh founder startup climate tech Indonesia.',
            content:
              '<p>Tim maksimal 3 orang mahasiswa. Format penilaian: orisinalitas ide (30%), kesesuaian target pasar (25%), kelayakan finansial (25%), dan kualitas presentasi (20%). Final live pitching di Youtube HMIF.</p>',
            category_id: lombaCat?.id ?? undefined,
            cover_prompt:
              'Business plan green tech startup pitch poster, green and purple color scheme, plant growing with circuit board leaves, eco-friendly technology infographic flyer',
          },
          {
            type: PublicPostType.LOMBA,
            title: 'Short Video Competition: Hari Kemerdekaan RI ke-80',
            slug: 'lomba-video-hut-ri-80',
            date_label: 'Pendaftaran s/d 10 September 2025',
            status: 'OPEN',
            form_url: 'https://forms.gle/demo-video-hutri',
            excerpt:
              'Buat short video kreatif 60 detik tentang kemerdekaan dan peran mahasiswa teknologi! Juara 1 mendapatkan kamera mirrorless + fitur di akun TikTok HMIF 100K++ penonton.',
            content:
              '<p>Durasi 45-60 detik, format vertikal 9:16, bebas gaya (cinematic vlog, animasi motion graphic, dokumenter mini). Upload ke TikTok pribadi dengan tag #HMIFHUTRI80 #KemerdekaanDigital.</p>',
            category_id: lombaCat?.id ?? undefined,
            cover_prompt:
              'Indonesia independence day short video contest poster, red white flag bunting ornaments, purple color overlay, smartphone vertical video frame, cinematic poster flyer',
          },
          {
            type: PublicPostType.LOMBA,
            title: 'Lomba Poster Digital: Anti Perundungan di Dunia Maya',
            slug: 'lomba-poster-anti-cyberbullying-2025',
            date_label: 'Pendaftaran s/d 5 November 2025',
            status: 'OPEN',
            form_url: 'https://forms.gle/demo-poster-cyberbullying',
            excerpt:
              'Sampaikan aspirasi anti perundungan siber lewat poster digital kreatif. 10 desain terbaik akan dipamerkan di festival akhir tahun dan dicetak sebagai merchandise kampus!',
            content:
              '<p>Ketentuan teknis: ukuran A3 portrait, mode RGB, file PNG + source file. Tidak mengandung unsur SARA, kekerasan, atau melanggar hak cipta. Karya orisinal, belum pernah lomba sebelumnya.</p>',
            category_id: lombaCat?.id ?? undefined,
            cover_prompt:
              'Anti cyberbullying awareness poster competition design, purple and soft blue theme, heart shield protecting digital bubble chat icons, modern advocacy graphic, typography',
          },
        ]
      : [];

  for (const p of [...berita, ...lomba]) {
    await prisma.publicPost.upsert({
      where: { slug: p.slug },
      update: {
        type: p.type,
        title: p.title,
        date_label: p.date_label,
        status: p.status,
        form_url: p.form_url || null,
        excerpt: p.excerpt,
        content: p.content,
        cover_image_url: imgLandscape(p.cover_prompt),
        category_id: p.category_id,
        is_published: true,
        published_at: publishedAt,
      },
      create: {
        type: p.type,
        title: p.title,
        slug: p.slug,
        date_label: p.date_label,
        status: p.status,
        form_url: p.form_url || null,
        excerpt: p.excerpt,
        content: p.content,
        cover_image_url: imgLandscape(p.cover_prompt),
        category_id: p.category_id,
        is_published: true,
        published_at: publishedAt,
      },
    });
  }
  console.log(`  ✅ posts: ${berita.length} berita + ${lomba.length} lomba`);
}

async function main() {
  console.log('🎯 Seed mock landing page HMIF Universitas Demo Indonesia');
  console.log('-----------------------------------------------------');
  console.log('1/6 Enrich PublicSiteProfile');
  await enrichProfile();
  console.log('2/6 Struktur Organisasi (Kabinet + Inti + Divisi)');
  await seedStructure();
  console.log('3/6 Programs Kerja');
  await seedPrograms();
  console.log('4/6 Recruitments (Open Rec Panitia/Mentor)');
  await seedRecruitments();
  console.log('5/6 Galleries Album');
  await seedGalleries();
  console.log('6/6 Public Posts (Berita + Informasi Lomba)');
  await seedPosts();
  console.log('-----------------------------------------------------');
  console.log('✅ Semua mock data landing page berhasil ditambahkan!');
  console.log('💡 Refresh browser localhost:5173 untuk melihat perubahan.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
