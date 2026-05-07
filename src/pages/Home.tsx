import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, GraduationCap, Megaphone, Radio, Sparkles, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import PublicLayout from '@/components/PublicLayout';

const DIVISI = [
  {
    title: 'Divisi Pendidikan',
    icon: BookOpen,
    desc: 'Ngisi materi kuliah sampai coding bareng biar akademik sama skill IT-nya sama-sama naik.',
  },
  {
    title: 'Divisi Humas',
    icon: Megaphone,
    desc: 'Jembatan HMIF sama dosen, alumni, sama mitra luar kampus yang butuh kolaborasi.',
  },
  {
    title: 'Divisi Kominfo',
    icon: Radio,
    desc: 'Kelola medsos, feeds kegiatan, dan konten biar kabar proker sampai ke angkatan lain.',
  },
  {
    title: 'Divisi PSDM',
    icon: Users,
    desc: 'Rangkul anggota lewat pembinaan santai, outing, sama forum buat bagi ide.',
  },
] as const;

const PROKER = [
  {
    tag: 'Workshop',
    judul: 'Ngulik Git & Github Bareng Divisi Pendidikan',
    tanggal: '12 Apr 2026',
    ringkas: 'Dari bikin repo sampai branching. Cocok buat yang baru pertama kali.',
  },
  {
    tag: 'Lomba',
    judul: 'HMIF Competitive Programming Night',
    tanggal: '22 Apr 2026',
    ringkas: 'Latihan soal, sharing strategi, terus santai sama tim divisi PSDM.',
  },
  {
    tag: 'Kuliah Tamu',
    judul: 'Roadmap Backend dari Praktisi',
    tanggal: '5 Mei 2026',
    ringkas: 'Ngobrol apa aja dari API, sampai deployment singkat pakai cara kerja industri.',
  },
] as const;

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [location.pathname, location.hash]);

  return (
    <PublicLayout>
      <div className="relative bg-[#030712] text-white min-h-screen font-sans selection:bg-cyan-400/30 selection:text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.14),transparent_55%)]"
        />

        {/* HERO */}
        <section className="relative flex min-h-[92vh] flex-col justify-center overflow-hidden pt-24 pb-16">
          <div
            className="absolute inset-0 -z-20 bg-[url('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-[0.22]"
          />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-b from-[#030712] via-[#030712]/90 to-[#030712]"
            style={{ transform: `translateY(${scrollY * 0.08}px)` }}
          />
          <div className="absolute left-1/2 top-[38%] -z-10 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none" />

          <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-950/35 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/90 backdrop-blur-md md:text-xs">
              <Sparkles size={14} className="text-cyan-300" aria-hidden />
              HMIF Teknik Informatika — Kabinet 2025 / 2026
            </div>

            <h1 className="mb-8 text-[2.55rem] font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-[0_0_40px_rgba(34,211,238,0.12)] sm:text-6xl md:text-7xl">
              Halo, Mahasiswa TI.
              <span className="mt-4 block bg-gradient-to-r from-white via-white to-cyan-200 bg-clip-text text-transparent">
                Di sini tempatmu ngulik, ngerjain proker, sama berkembang bareng.
              </span>
            </h1>

            <p className="mb-12 max-w-2xl text-lg font-medium leading-relaxed text-slate-300 sm:text-xl">
              Kami himpunan mahasiswa yang fokus ke ruang belajar, kegiatan lapangan, dan jejaring ke profesi. Serius saat diskusi, santai saat di luar kelas.
            </p>

            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:justify-center">
              <a
                href="#tentang-kami"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-10 py-4 text-[15px] font-bold uppercase tracking-[0.12em] text-slate-950 shadow-[0_0_42px_-6px_rgba(34,211,238,0.55)] transition hover:bg-cyan-300 hover:shadow-[0_0_52px_-4px_rgba(103,232,249,0.65)]"
              >
                Selengkapnya
                <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
              </a>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-full border border-white/18 bg-white/5 px-8 py-4 text-[15px] font-semibold text-white/85 backdrop-blur-md transition hover:border-cyan-400/40 hover:text-white"
              >
                Masuk untuk admin
              </Link>
            </div>
          </div>
        </section>

        {/* TENTANG KAMI */}
        <section id="tentang-kami" className="scroll-mt-28 border-y border-white/6 bg-[#050a16]/80 px-6 py-24 backdrop-blur-sm">
          <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
            <div>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.35em] text-cyan-300/95">Tentang kami</p>
              <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-[2.85rem] md:leading-tight">
                Kami Mau Ruang Kolaboratif yang Tetap Dekat Sama Kebutuhan Mahasiswa.
              </h2>
            </div>
            <div className="space-y-5 text-lg leading-relaxed text-slate-300">
              <p>
                HMIF TI hadir buat jadi wadah resmi Teknik Informatika: akademik dapat pendampingan dari angkatan di atas dan teman seperjuangan satu angkatan, minat IT dapat jalan bareng mentor divisi.
              </p>
              <p>
                Tiap Kabinet bikin roadmap proker jelas dan terbuka. Kalau ada ide baru, silakan ngobrol lewat Kontak atau temui langsung pembina fakultas.
              </p>
              <div className="flex items-start gap-3 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/12 to-transparent p-6 text-[15px] text-slate-200">
                <GraduationCap size={34} strokeWidth={1.5} className="mt-1 shrink-0 text-cyan-300" aria-hidden />
                <p>
                  <span className="font-semibold text-white">Visi singkatnya:</span> mahasiswa TI punya pola pikir rapi, bisa kerja sama tim, dan siap tes air di dunia nyata ketika udah tingkat akhir.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* DIVISI */}
        <section id="divisi" className="scroll-mt-28 px-6 py-28">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.35em] text-cyan-300/95">Divisi</p>
            <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">Empat Jalur Kolaborasi</h2>
            <p className="mt-4 text-lg text-slate-400">
              Pilih jalur yang pas sama minatmu. Semua divisi satu frekuensi bikin HMIF lebih rapi.
            </p>
          </div>
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
            {DIVISI.map(({ title, desc, icon: Icon }) => (
              <article
                key={title}
                className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-[#081222] via-[#050a14] to-[#04101c] p-8 shadow-[0_28px_80px_-50px_rgba(34,211,238,0.35)] transition hover:border-cyan-400/30"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl transition group-hover:bg-cyan-400/15" />
                <Icon className="mb-6 h-10 w-10 text-cyan-300" aria-hidden strokeWidth={1.5} />
                <h3 className="mb-3 text-xl font-bold text-white">{title}</h3>
                <p className="leading-relaxed text-slate-400">{desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* PROKER / BERITA */}
        <section id="proker" className="scroll-mt-28 border-t border-white/6 bg-[#050a16]/80 px-6 py-28">
          <div className="mx-auto mb-14 flex max-w-6xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.35em] text-cyan-300/95">Berita &amp; proker</p>
              <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">Kegiatan Terbaru</h2>
              <p className="mt-3 max-w-xl text-lg text-slate-400">
                Tiga agenda dekat. Pantau Instagram kami buat update lengkapnya.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-300">
              Placeholder jadwal
            </span>
          </div>
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            {PROKER.map((item) => (
              <article
                key={item.judul}
                className="flex flex-col rounded-3xl border border-white/[0.07] bg-[#030712] p-7 transition hover:border-cyan-400/25 hover:shadow-[0_20px_60px_-40px_rgba(34,211,238,0.45)]"
              >
                <div className="mb-5 flex flex-wrap items-center gap-3 text-[12px] font-bold uppercase tracking-widest">
                  <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-cyan-200">{item.tag}</span>
                  <span className="text-slate-500">{item.tanggal}</span>
                </div>
                <h3 className="mb-3 text-lg font-bold leading-snug text-white">{item.judul}</h3>
                <p className="mt-auto leading-relaxed text-slate-400">{item.ringkas}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
