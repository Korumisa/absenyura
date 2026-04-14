import React, { useEffect, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import { CreditCard, Check, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Pricing() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <PublicLayout>
      <div className="relative min-h-[70vh] flex flex-col justify-center items-start overflow-hidden pt-32 pb-24 border-b border-white/5">
        <div 
          className="absolute inset-0 bg-gradient-to-b from-[#111] to-[#0a0a0a] -z-10"
          style={{ transform: `translateY(${scrollY * 0.4}px)` }}
        />
        <div className="absolute top-1/2 left-0 -translate-x-1/3 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 w-full z-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-12 backdrop-blur-md">
            <CreditCard size={16} className="text-amber-400" />
            <span className="text-xs font-semibold tracking-widest uppercase text-white/80">Struktur Harga</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter leading-[0.95] mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 max-w-4xl">
            Satu Harga.<br/>Kapasitas Tanpa Batas.
          </h1>
          <h2 className="text-2xl md:text-3xl text-white/40 font-light tracking-tight max-w-3xl">
            Tidak ada harga per-pengguna yang tersembunyi. Kami menyediakan instance khusus (Single-Tenant) untuk universitas dan perusahaan Anda.
          </h2>
        </div>
      </div>
      
      <div className="bg-[#0a0a0a] py-32">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* TIER 1: Starter */}
            <div className="bg-[#111] border border-white/5 rounded-3xl p-10 flex flex-col">
              <h3 className="text-2xl font-bold mb-2">Departemen</h3>
              <p className="text-white/50 font-light mb-8 h-12">Untuk satu fakultas atau perusahaan berukuran menengah.</p>
              <div className="mb-8">
                <span className="text-5xl font-extrabold">Rp 4.5<span className="text-2xl font-light text-white/50">Jt</span></span>
                <span className="text-white/40 ml-2">/ bulan</span>
              </div>
              <ul className="space-y-4 flex-1 mb-12">
                <li className="flex items-center gap-3 text-white/70"><Check size={18} className="text-emerald-500" /> Hingga 1.000 Pengguna Aktif</li>
                <li className="flex items-center gap-3 text-white/70"><Check size={18} className="text-emerald-500" /> Validasi QR & GPS Dasar</li>
                <li className="flex items-center gap-3 text-white/70"><Check size={18} className="text-emerald-500" /> Server Multi-Tenant (Shared)</li>
                <li className="flex items-center gap-3 text-white/30"><X size={18} /> Device Fingerprinting</li>
                <li className="flex items-center gap-3 text-white/30"><X size={18} /> Akses Webhook / API</li>
              </ul>
              <Link to="/hubungi-kami" className="w-full text-center bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-4 rounded-xl font-medium transition-colors">
                Mulai Uji Coba Gratis
              </Link>
            </div>

            {/* TIER 2: Enterprise (Highlighted) */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border border-indigo-500/30 rounded-3xl p-10 flex flex-col relative transform md:-translate-y-4 shadow-2xl shadow-indigo-500/10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-indigo-500 rounded-b-full" />
              <div className="absolute top-6 right-6 px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full uppercase tracking-wider">Terpopuler</div>
              <h3 className="text-2xl font-bold mb-2">Universitas / Enterprise</h3>
              <p className="text-white/50 font-light mb-8 h-12">Arsitektur terdedikasi untuk kampus skala penuh dengan ribuan kelas.</p>
              <div className="mb-8">
                <span className="text-5xl font-extrabold">Rp 12.5<span className="text-2xl font-light text-white/50">Jt</span></span>
                <span className="text-white/40 ml-2">/ bulan</span>
              </div>
              <ul className="space-y-4 flex-1 mb-12">
                <li className="flex items-center gap-3 text-white"><Check size={18} className="text-indigo-400" /> Pengguna Aktif Tanpa Batas (Unlimited)</li>
                <li className="flex items-center gap-3 text-white"><Check size={18} className="text-indigo-400" /> Anti-Fake GPS & BSSID Whitelisting</li>
                <li className="flex items-center gap-3 text-white"><Check size={18} className="text-indigo-400" /> Device Fingerprinting (Kriptografis)</li>
                <li className="flex items-center gap-3 text-white"><Check size={18} className="text-indigo-400" /> Server Single-Tenant (Terdedikasi)</li>
                <li className="flex items-center gap-3 text-white"><Check size={18} className="text-indigo-400" /> Akses API RESTful & Webhook</li>
              </ul>
              <Link to="/hubungi-kami" className="w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-600/20">
                Pesan Instalasi
              </Link>
            </div>

            {/* TIER 3: Custom */}
            <div className="bg-[#111] border border-white/5 rounded-3xl p-10 flex flex-col">
              <h3 className="text-2xl font-bold mb-2">Instansi Pemerintah</h3>
              <p className="text-white/50 font-light mb-8 h-12">Solusi On-Premise dengan kedaulatan data tingkat nasional.</p>
              <div className="mb-8">
                <span className="text-5xl font-extrabold tracking-tight">Kustom</span>
                <span className="text-white/40 ml-2 block mt-1">Perpetual License (Satu Kali Bayar)</span>
              </div>
              <ul className="space-y-4 flex-1 mb-12">
                <li className="flex items-center gap-3 text-white/70"><Check size={18} className="text-emerald-500" /> Instalasi di Server Anda (On-Premise)</li>
                <li className="flex items-center gap-3 text-white/70"><Check size={18} className="text-emerald-500" /> Audit Kode Sumber Terbuka (Whitebox)</li>
                <li className="flex items-center gap-3 text-white/70"><Check size={18} className="text-emerald-500" /> SLA Ketersediaan 99.99%</li>
                <li className="flex items-center gap-3 text-white/70"><Check size={18} className="text-emerald-500" /> Dukungan Insinyur Lokal 24/7</li>
              </ul>
              <Link to="/hubungi-kami" className="w-full text-center bg-white text-black hover:bg-white/90 px-6 py-4 rounded-xl font-medium transition-colors">
                Konsultasi Arsitektur
              </Link>
            </div>
          </div>

          <div className="mt-32 p-12 bg-[#111] border border-white/10 rounded-3xl text-center">
            <h3 className="text-2xl font-bold mb-4">Butuh migrasi data dari SIAKAD / sistem lama Anda?</h3>
            <p className="text-white/50 font-light mb-8 max-w-2xl mx-auto">
              Tim Data Engineer kami siap membantu proses ekstraksi dan pembersihan jutaan baris data kehadiran historis dan akun mahasiswa ke sistem Absensyura dalam kurun waktu kurang dari 48 jam secara gratis untuk klien Enterprise.
            </p>
            <Link to="/hubungi-kami" className="inline-flex items-center gap-2 text-indigo-400 font-medium hover:text-indigo-300 transition-colors">
              Pelajari Protokol Migrasi Data <ArrowRight size={16} />
            </Link>
          </div>

        </div>
      </div>
    </PublicLayout>
  );
}
