import React, { useEffect, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import { Building2, Quote, ArrowRight, Server, Shield, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AboutUs() {
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-slate-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 w-full z-10 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-12 backdrop-blur-md mx-auto">
            <Building2 size={16} className="text-slate-400" />
            <span className="text-xs font-semibold tracking-widest uppercase text-white/80">Identitas Perusahaan</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter leading-[0.95] mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
            Mengembalikan Integritas.
          </h1>
          <h2 className="text-2xl md:text-3xl text-white/40 font-light tracking-tight max-w-3xl mx-auto">
            Kehadiran digital telah kehilangan maknanya. Di Absensyura, kami tidak membuat aplikasi absen—kami membangun infrastruktur kepastian data.
          </h2>
        </div>
      </div>
      
      <div className="bg-[#0a0a0a] py-32">
        <div className="max-w-4xl mx-auto px-6">
          
          {/* The Manifesto */}
          <div className="mb-40 relative">
            <Quote size={120} className="text-white/5 absolute -top-8 -left-4 md:-top-16 md:-left-16 z-0 w-16 h-16 md:w-32 md:h-32" />
            <div className="relative z-10 space-y-8 text-xl md:text-2xl font-light leading-relaxed text-white/70">
              <p>
                Selama dua dekade terakhir, digitalisasi sistem absensi di institusi akademik dan korporasi selalu berakhir pada satu masalah fundamental: <strong className="text-white font-medium">titip absen digital</strong>.
              </p>
              <p>
                Aplikasi absensi standar yang mengandalkan tombol GPS atau QR Code statis gagal mendeteksi penggunaan emulator, fake GPS, dan pembagian QR Code via grup obrolan. Hal ini merusak integritas data HRIS dan SIAKAD bernilai miliaran rupiah.
              </p>
              <p>
                Kami membangun Absensyura dengan pendekatan pesimis (zero-trust). Sistem kami mengasumsikan setiap perangkat berpotensi melakukan manipulasi. Dengan memadukan kriptografi, pengikatan perangkat fisik (fingerprinting), dan analisis geospasial real-time, kami menciptakan lapisan pengamanan yang memaksa kehadiran fisik 100% otentik.
              </p>
            </div>
            
            <div className="mt-12 flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center font-bold text-lg">A</div>
              <div>
                <h4 className="font-bold text-white tracking-tight">Tim Arsitektur Absensyura</h4>
                <p className="text-sm text-white/40">Jakarta, Indonesia</p>
              </div>
            </div>
          </div>

          {/* Three Core Values */}
          <div className="grid md:grid-cols-3 gap-12 mb-40 border-t border-white/10 pt-24">
            <div>
              <Shield size={32} className="text-indigo-400 mb-6" />
              <h3 className="text-xl font-bold mb-4">Privasi Berdaulat</h3>
              <p className="text-white/50 font-light leading-relaxed">
                Sistem kami mengunci identitas perangkat (Hardware ID) tanpa pernah mengumpulkan atau menyimpan data pribadi biometrik sensitif di server publik. Semua di-hash lokal.
              </p>
            </div>
            <div>
              <Server size={32} className="text-emerald-400 mb-6" />
              <h3 className="text-xl font-bold mb-4">Infrastruktur Tenang</h3>
              <p className="text-white/50 font-light leading-relaxed">
                Kami mengelola jutaan permintaan absensi dalam hitungan detik (50ms). Dosen dan administrator hanya perlu mengajar, biarkan infrastruktur kami yang memverifikasi.
              </p>
            </div>
            <div>
              <FileCheck size={32} className="text-purple-400 mb-6" />
              <h3 className="text-xl font-bold mb-4">Kepatuhan Total</h3>
              <p className="text-white/50 font-light leading-relaxed">
                Log audit yang tak dapat diubah (immutable). Setiap rekaman lokasi, alamat IP, dan rotasi perangkat dicatat demi kebutuhan audit investigatif kapan pun dibutuhkan.
              </p>
            </div>
          </div>

          <div className="p-12 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-3xl text-center">
            <h3 className="text-3xl font-bold mb-6">Bergabung dalam ekosistem.</h3>
            <p className="text-white/60 font-light mb-12 max-w-2xl mx-auto text-lg">
              Insinyur kami siap berdiskusi dengan tim IT Anda mengenai keamanan arsitektur, SLA 99.9%, dan topologi integrasi SIAKAD universitas Anda.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/hubungi-kami" className="w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-full font-bold tracking-wide transition-colors">
                Jadwalkan Konsultasi Teknis
              </Link>
            </div>
          </div>

        </div>
      </div>
    </PublicLayout>
  );
}
