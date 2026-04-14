import React, { useEffect, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import { Handshake, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CampusPartners() {
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
        
        {/* Glow effect */}
        <div className="absolute top-1/2 right-0 translate-x-1/3 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 w-full z-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-12 backdrop-blur-md">
            <Handshake size={16} className="text-amber-400" />
            <span className="text-xs font-semibold tracking-widest uppercase text-white/80">Dokumentasi & Ekosistem</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter leading-[0.95] mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 max-w-4xl">
            Mitra Global
          </h1>
          <h2 className="text-2xl md:text-4xl text-white/40 font-light tracking-tight max-w-3xl">
            Kepercayaan yang divalidasi oleh ratusan institusi.
          </h2>
        </div>
      </div>
      
      <div className="bg-[#0a0a0a] py-32 relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-12">
            <p className="text-xl md:text-2xl leading-relaxed text-white/70 font-light">Sebuah sistem keamanan hanya sebaik rekam jejak dan skala penerapannya di dunia nyata. Absensyura dengan bangga melayani ekosistem universitas negeri, politeknik, hingga perusahaan korporasi yang menuntut kepatuhan tingkat tinggi.</p>
            <p className="text-xl md:text-2xl leading-relaxed text-white/70 font-light">Mitra kami mencakup konsorsium perangkat keras, penyedia infrastruktur cloud, dan integrator sistem lokal yang secara kolektif memastikan solusi kami dapat beroperasi secara persisten di berbagai lingkungan topologi jaringan—dari area kampus dengan throughput internet raksasa hingga site operasional terpencil.</p>
            <p className="text-xl md:text-2xl leading-relaxed text-white/70 font-light">Kami juga secara aktif membuka program 'Campus Partner Initiative'. Melalui program ini, fakultas ilmu komputer dapat menggunakan lisensi Absensyura secara khusus, sembari memberikan ruang bagi mahasiswa tingkat akhir untuk mengaudit dan mempelajari secara langsung arsitektur sistem keamanan kami.</p>
            <p className="text-xl md:text-2xl leading-relaxed text-white/70 font-light">Bagi institusi yang siap membuang perangkat absensi fisik lawas dan bertransisi sepenuhnya ke infrastruktur zero-trust, mari jalin kemitraan strategis dengan kami.</p>
          </div>

          <div className="mt-32 pt-12 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-white/50 font-light">Eksplorasi infrastruktur kami lebih dalam.</div>
            <Link to="/login" className="group flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-semibold tracking-wide hover:scale-105 transition-all duration-300">
              Masuk ke Dasbor <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
