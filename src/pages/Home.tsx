import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, QrCode, ShieldCheck, Clock, ArrowRight, BarChart3, Fingerprint, Database, CheckCircle2, ChevronRight, Menu, X } from 'lucide-react';

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const features = [
    {
      title: 'Pemindaian QR Dinamis',
      description: 'Sistem absensi menggunakan QR Code yang diperbarui setiap 15 detik. Terenkripsi dengan HMAC-SHA256 untuk mencegah pencurian token dan penitipan absen.',
      icon: QrCode,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Validasi Geofencing (GPS)',
      description: 'Pastikan kehadiran hanya dapat dilakukan di dalam radius area kelas yang telah ditentukan dengan akurasi pemetaan tinggi menggunakan Leaflet Maps.',
      icon: MapPin,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      title: 'Device & IP Fingerprinting',
      description: 'Mencegah login ganda dan memastikan absensi hanya dari jaringan kampus (Whitelist IP) serta perangkat yang sah milik mahasiswa tersebut.',
      icon: Fingerprint,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    },
    {
      title: 'Foto Bukti Kamera (Selfie)',
      description: 'Terintegrasi dengan kamera browser untuk mengambil foto saat absen, lengkap dengan watermark waktu & koordinat untuk validasi tambahan.',
      icon: ShieldCheck,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-100 dark:bg-rose-900/30',
    },
    {
      title: 'Manajemen Jadwal Pintar',
      description: 'Dosen dapat mengatur jadwal sesi kelas, batas waktu absen (check-in/out), dan toleransi keterlambatan (LATE) dengan mudah via kalender interaktif.',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      title: 'Pelaporan & Ekspor Data',
      description: 'Dashboard rekapitulasi lengkap untuk admin dan dosen. Mendukung ekspor data laporan kehadiran dalam format Excel (.xlsx) dan PDF dalam satu klik.',
      icon: Database,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ];

  const steps = [
    { step: '01', title: 'Dosen Membuka Sesi', desc: 'Dosen membuat sesi kelas dan menampilkan QR Code di layar proyektor.' },
    { step: '02', title: 'Mahasiswa Scan QR', desc: 'Mahasiswa memindai QR menggunakan perangkat mereka di dalam kelas.' },
    { step: '03', title: 'Validasi Lapis 4', desc: 'Sistem memverifikasi QR, Lokasi (GPS), Jaringan (IP), dan Foto (Kamera).' },
    { step: '04', title: 'Kehadiran Tercatat', desc: 'Data kehadiran langsung masuk ke dashboard dosen secara real-time.' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navbar Enterprise */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-b border-slate-200 dark:border-zinc-800 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Absensi<span className="text-indigo-600 dark:text-indigo-400">Web</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#fitur" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-white transition-colors">Fitur Unggulan</a>
            <a href="#cara-kerja" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-white transition-colors">Cara Kerja</a>
            <a href="#keamanan" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-white transition-colors">Keamanan</a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="hidden sm:block text-sm font-bold text-slate-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/login"
              className="text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-full hover:bg-slate-800 dark:hover:bg-slate-100 transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              Mulai Sekarang
            </Link>
            <button 
              className="md:hidden p-2 text-slate-700 dark:text-zinc-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-4 flex flex-col gap-4">
            <a href="#fitur" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-semibold text-slate-600 dark:text-zinc-300">Fitur Unggulan</a>
            <a href="#cara-kerja" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-semibold text-slate-600 dark:text-zinc-300">Cara Kerja</a>
            <a href="#keamanan" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-semibold text-slate-600 dark:text-zinc-300">Keamanan</a>
            <Link to="/login" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Log in</Link>
          </div>
        )}
      </nav>

      {/* Hero Section Enterprise */}
      <main className="pt-32 lg:pt-48 pb-20 px-6 overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/20 dark:bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="absolute top-1/2 left-1/4 w-[500px] h-[300px] bg-violet-500/20 dark:bg-violet-500/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 text-sm font-semibold mb-8 border border-slate-200 dark:border-zinc-800 shadow-sm"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              V2.0 Hadir dengan Validasi Wajah & IP
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8 leading-[1.1]"
            >
              Sistem Kehadiran Akademik{' '}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">
                  Anti-Kecurangan
                </span>
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-slate-600 dark:text-zinc-400 mb-10 max-w-3xl mx-auto leading-relaxed"
            >
              Ucapkan selamat tinggal pada "Titip Absen". Platform absensi modern yang menggabungkan 
              QR Dinamis, Geofencing presisi tinggi, Fingerprinting Perangkat, dan Bukti Foto dalam satu sistem terpadu.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1"
              >
                Masuk sebagai Admin
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-white border border-slate-200 dark:border-zinc-700 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-sm hover:shadow-md"
              >
                Portal Mahasiswa
              </Link>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-medium text-slate-500 dark:text-zinc-500"
            >
              <div className="flex items-center gap-2"><CheckCircle2 className="text-indigo-500 w-5 h-5"/> Keamanan Lapis 4</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="text-indigo-500 w-5 h-5"/> Real-time Dashboard</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="text-indigo-500 w-5 h-5"/> Standar Universitas</div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="fitur" className="py-24 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">Fitur Standar Enterprise</h2>
            <p className="text-lg text-slate-600 dark:text-zinc-400">Dirancang untuk skalabilitas kampus besar dengan fokus pada integritas data kehadiran.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all duration-300 group"
                >
                  <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="cara-kerja" className="py-24 bg-slate-50 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">Alur Presensi Terpadu</h2>
            <p className="text-lg text-slate-600 dark:text-zinc-400">Proses check-in kurang dari 10 detik dengan keamanan maksimal.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connecting lines for desktop */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-slate-200 via-indigo-200 to-slate-200 dark:from-zinc-800 dark:via-indigo-900/50 dark:to-zinc-800 -translate-y-1/2 z-0"></div>

            {steps.map((item, idx) => (
              <div key={idx} className="relative z-10 bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm text-center group hover:-translate-y-2 transition-transform duration-300">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-6 shadow-lg shadow-indigo-600/30 group-hover:scale-110 transition-transform">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-slate-600 dark:text-zinc-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 dark:from-indigo-950 dark:to-zinc-950 rounded-[3rem] p-12 lg:p-20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-500/20 blur-[100px] rounded-full pointer-events-none"></div>
            
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 relative z-10">Siap Mengubah Sistem Akademik Anda?</h2>
            <p className="text-lg text-indigo-200 mb-10 max-w-2xl mx-auto relative z-10">
              Bergabunglah dengan standar baru sistem presensi digital. Keamanan, efisiensi, dan transparansi dalam satu aplikasi.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <Link
                to="/login"
                className="bg-white text-slate-900 hover:bg-indigo-50 px-8 py-4 rounded-full font-bold text-lg transition-all hover:scale-105 shadow-xl"
              >
                Mulai Uji Coba Sekarang
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Enterprise */}
      <footer className="bg-white dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-8 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
                  GeoPresensi
                </span>
              </div>
              <p className="text-slate-500 dark:text-zinc-400 text-sm leading-relaxed mb-6 font-medium">
                Sistem informasi kehadiran mahasiswa generasi baru dengan validasi Geofencing, pemindai QR dinamis, dan perlindungan Anti-Fake GPS terintegrasi.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path></svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-6 text-lg">Produk</h3>
              <ul className="space-y-4 text-sm font-medium text-slate-500 dark:text-zinc-400">
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Fitur Utama</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Keamanan GPS</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Integrasi API</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Harga & Paket</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-6 text-lg">Sumber Daya</h3>
              <ul className="space-y-4 text-sm font-medium text-slate-500 dark:text-zinc-400">
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Pusat Bantuan</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Dokumentasi API</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Blog & Artikel</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Status Sistem</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-6 text-lg">Perusahaan</h3>
              <ul className="space-y-4 text-sm font-medium text-slate-500 dark:text-zinc-400">
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Tentang Kami</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Karir</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Hubungi Kami</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Mitra Kampus</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-slate-500 dark:text-zinc-500 text-sm font-medium">
              &copy; {new Date().getFullYear()} GeoPresensi Inc. Dibuat dengan cinta untuk Pendidikan Indonesia.
            </div>
            <div className="flex gap-6 text-sm font-medium text-slate-500 dark:text-zinc-400">
              <a href="#" className="hover:text-indigo-600 transition-colors">Kebijakan Privasi</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Syarat Layanan</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Pengaturan Cookie</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}