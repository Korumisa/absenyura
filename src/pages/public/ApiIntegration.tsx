import React, { useEffect, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import { Webhook, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ApiIntegration() {
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
        <div className="absolute top-1/2 right-0 translate-x-1/3 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 w-full z-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-12 backdrop-blur-md">
            <Webhook size={16} className="text-emerald-400" />
            <span className="text-xs font-semibold tracking-widest uppercase text-white/80">Dokumentasi & Ekosistem</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter leading-[0.95] mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 max-w-4xl">
            API Webhooks
          </h1>
          <h2 className="text-2xl md:text-4xl text-white/40 font-light tracking-tight max-w-3xl">
            Interoperabilitas skala penuh dengan latensi &lt;50ms.
          </h2>
        </div>
      </div>
      
      <div className="bg-[#0a0a0a] py-32 relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-12">
            <p className="text-xl md:text-2xl leading-relaxed text-white/70 font-light">Institusi akademik dan enterprise besar tidak dapat bekerja dengan data yang terisolasi. Oleh karena itu, Absensyura sejak awal dirancang dengan arsitektur API-first yang memungkinkan sinkronisasi dua arah dengan ekosistem IT yang sudah Anda miliki.</p>
            <p className="text-xl md:text-2xl leading-relaxed text-white/70 font-light">Hubungkan Absensyura secara langsung ke Enterprise Resource Planning (ERP) Anda, sistem HRIS, atau Sistem Informasi Akademik (SIAKAD) universitas tanpa hambatan. Kami menyediakan RESTful API yang terdokumentasi secara ketat dan mendukung versioning semantik untuk menjamin tidak ada integrasi yang rusak saat sistem diperbarui.</p>
            <p className="text-xl md:text-2xl leading-relaxed text-white/70 font-light">Selain polling data, infrastruktur kami mengutamakan streaming event real-time melalui Webhooks. Setiap kali peserta memindai kode QR atau ketika Cron Job menandai peserta sebagai &apos;ALFA&apos;, server kami akan seketika mendorong (push) payload JSON ke endpoint internal server kampus Anda dengan latensi kurang dari 50 milidetik.</p>
            <p className="text-xl md:text-2xl leading-relaxed text-white/70 font-light">Keamanan integrasi dijamin melalui otentikasi JWT asimetris dan validasi signature HMAC. Silakan diskusikan kebutuhan integrasi kustom Anda dengan tim insinyur data kami untuk memulai proses migrasi dan konektivitas.</p>
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
