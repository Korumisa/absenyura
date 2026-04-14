import React, { useEffect, useState } from 'react';
import { ArrowRight, Fingerprint, MapPin, ShieldCheck, ChevronRight, Globe, Lock, Cpu, Server } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicLayout from '@/components/PublicLayout';

export default function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <PublicLayout>
      <div className="bg-[#0a0a0a] text-white min-h-screen font-sans selection:bg-white selection:text-black">
        
        {/* HERO SECTION */}
        <section className="relative min-h-[90vh] flex flex-col justify-center items-center overflow-hidden pt-20">
          <div 
            className="absolute inset-0 bg-gradient-to-b from-[#111] to-[#0a0a0a] -z-10"
            style={{ transform: `translateY(${scrollY * 0.4}px)` }}
          />
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

          <div className="text-center z-10 px-6 max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium tracking-widest uppercase text-white/70">Sistem Operasional V2.0</span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-[110px] font-extrabold tracking-tighter leading-[0.9] mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
              Absolut.<br />Presisi.
            </h1>
            
            <p className="text-xl md:text-2xl text-white/50 max-w-3xl mx-auto font-light tracking-tight mb-12">
              Infrastruktur kehadiran digital tingkat enterprise. Mengeliminasi celah manipulasi dengan memadukan validasi biometrik, pengikatan perangkat keras, dan geolokasi satelit.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <Link 
                to="/login" 
                className="group flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-full font-semibold tracking-wide hover:scale-105 transition-all duration-300 w-full sm:w-auto"
              >
                Mulai Operasional <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="/hubungi-kami" 
                className="flex items-center justify-center gap-2 text-white/70 hover:text-white px-8 py-4 font-medium transition-colors w-full sm:w-auto"
              >
                Jadwalkan Demo
              </Link>
            </div>
          </div>
        </section>

        {/* COMPANY VISION / ABOUT */}
        <section className="py-32 px-6 max-w-5xl mx-auto text-center border-t border-white/5">
          <Globe size={48} strokeWidth={1} className="mx-auto text-white/30 mb-8" />
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">
            Mendefinisikan Ulang Kepercayaan Digital.
          </h2>
          <p className="text-xl text-white/50 font-light leading-relaxed max-w-4xl mx-auto">
            Absensyura didirikan pada satu prinsip fundamental: kehadiran digital harus tidak dapat disangkal. Kami tidak membangun sekadar aplikasi absensi; kami merekayasa infrastruktur <span className="text-white font-medium">zero-trust</span> yang memungkinkan institusi berskala besar—dari perbankan hingga universitas negeri—beroperasi dengan kepastian data 100%. Tidak ada toleransi untuk manipulasi lokasi, dan tidak ada kompromi pada privasi data.
          </p>
        </section>

        {/* CORE ARCHITECTURE (THE 3 PILLARS) */}
        <section className="py-32 px-6 max-w-7xl mx-auto border-t border-white/5">
          <div className="grid md:grid-cols-12 gap-12 md:gap-8 items-start">
            <div className="md:col-span-5 md:sticky top-32">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Arsitektur<br/>Zero-Trust.
              </h2>
              <p className="text-lg text-white/50 leading-relaxed font-light mb-8">
                Setiap pemindaian kehadiran diverifikasi melalui tiga lapisan keamanan sebelum data diizinkan masuk ke dalam buku besar server kami. Jika satu lapisan gagal, akses ditolak secara absolut.
              </p>
              <Link to="/fitur-utama" className="inline-flex items-center gap-2 text-indigo-400 font-medium hover:text-indigo-300 transition-colors">
                Jelajahi Platform Kami <ChevronRight size={16} />
              </Link>
            </div>

            <div className="md:col-span-6 md:col-start-7 space-y-16 md:space-y-24">
              <div className="group">
                <MapPin size={40} strokeWidth={1} className="text-white/40 mb-6 group-hover:text-white transition-colors" />
                <h3 className="text-2xl font-bold mb-4 tracking-tight">Geofencing Satelit Presisi Tinggi</h3>
                <p className="text-white/50 leading-relaxed font-light">
                  Membatasi area absensi dengan akurasi tingkat sentimeter. Mesin heuristik kami secara aktif menganalisis anomali pada altimeter, akselerometer, dan BSSID jaringan untuk mendeteksi dan memblokir penggunaan VPN maupun aplikasi Fake GPS secara instan.
                </p>
              </div>

              <div className="group">
                <Fingerprint size={40} strokeWidth={1} className="text-white/40 mb-6 group-hover:text-white transition-colors" />
                <h3 className="text-2xl font-bold mb-4 tracking-tight">Device Fingerprinting Kriptografis</h3>
                <p className="text-white/50 leading-relaxed font-light">
                  Setiap akun pengguna diikat secara kriptografis ke satu perangkat keras fisik spesifik. Upaya untuk memindahkan sesi ke perangkat tak dikenal atau emulator akan memicu pemblokiran sistem secara real-time.
                </p>
              </div>

              <div className="group">
                <ShieldCheck size={40} strokeWidth={1} className="text-white/40 mb-6 group-hover:text-white transition-colors" />
                <h3 className="text-2xl font-bold mb-4 tracking-tight">QR Code Dinamis (OTP-Based)</h3>
                <p className="text-white/50 leading-relaxed font-light">
                  Token kehadiran fisik yang berotasi setiap 15 detik menggunakan algoritma HMAC-SHA256 tersinkronisasi waktu. Menjadikan tangkapan layar (screenshot) atau rekaman video layar tidak berguna bagi pelaku kecurangan.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SCALE & COMPLIANCE (METRICS) */}
        <section className="relative py-40 overflow-hidden bg-[#111] border-y border-white/10">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
            <div className="py-6 md:py-0">
              <div className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter mb-2 md:mb-4">99.9<span className="text-indigo-500">%</span></div>
              <div className="text-sm uppercase tracking-widest text-white/50 font-medium">SLA Uptime Sistem</div>
            </div>
            <div className="py-6 md:py-0">
              <div className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter mb-2 md:mb-4">&lt;50<span className="text-indigo-500">ms</span></div>
              <div className="text-sm uppercase tracking-widest text-white/50 font-medium">Latensi Pemrosesan</div>
            </div>
            <div className="py-6 md:py-0">
              <div className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter mb-2 md:mb-4">AES<span className="text-indigo-500">256</span></div>
              <div className="text-sm uppercase tracking-widest text-white/50 font-medium">Standar Enkripsi</div>
            </div>
            <div className="py-6 md:py-0">
              <div className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter mb-2 md:mb-4">2M<span className="text-indigo-500">+</span></div>
              <div className="text-sm uppercase tracking-widest text-white/50 font-medium">Validasi Harian</div>
            </div>
          </div>
        </section>

        {/* ENTERPRISE INTEGRATION */}
        <section className="py-32 px-6 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
            <div>
              <Cpu size={48} strokeWidth={1} className="text-white/40 mb-8" />
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                Terintegrasi secara Mulus.
              </h2>
              <p className="text-lg text-white/50 font-light leading-relaxed mb-8">
                Kami memahami bahwa institusi Anda telah memiliki ekosistem digital yang kompleks. Oleh karena itu, Absensyura dirancang dengan pendekatan API-first. Sinkronisasi data kehadiran, pengelolaan pengguna, dan penarikan laporan analitik dapat dilakukan secara terprogram ke dalam sistem HRIS, ERP, atau SIAKAD Anda melalui webhook latensi rendah kami.
              </p>
              <Link to="/integrasi-api" className="inline-flex items-center gap-2 text-white border-b border-white/30 pb-1 hover:border-white transition-colors">
                Baca Dokumentasi API <ArrowRight size={16} />
              </Link>
            </div>
            <div className="bg-[#111] border border-white/10 rounded-3xl p-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
              <Server size={32} strokeWidth={1} className="text-indigo-400 mb-6" />
              <h3 className="text-xl font-bold mb-4">Infrastruktur Dedicated</h3>
              <p className="text-white/60 font-light mb-8 text-sm leading-relaxed">
                Untuk klien tingkat Enterprise, kami menyediakan instance server terisolasi (Single-Tenant) dengan kontrol penuh atas lokasi residensi data (Data Residency) untuk memastikan kepatuhan penuh terhadap regulasi privasi nasional dan internasional.
              </p>
              <div className="flex items-center gap-3 text-xs font-medium text-emerald-400 bg-emerald-400/10 w-fit px-3 py-1.5 rounded-full">
                <Lock size={14} /> Tersertifikasi Keamanan Kelembagaan
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-40 bg-white text-black text-center px-6 mt-20">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8">
            Siap untuk masa depan?
          </h2>
          <p className="text-xl text-black/60 font-light mb-12 max-w-2xl mx-auto">
            Bergabunglah dengan ratusan institusi terkemuka yang telah beralih ke standar keamanan absensi tertinggi di kelasnya.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link 
              to="/login" 
              className="inline-flex items-center justify-center gap-2 bg-black text-white px-10 py-5 rounded-full font-bold tracking-wide hover:bg-black/80 transition-colors w-full sm:w-auto"
            >
              Masuk ke Dasbor <ArrowRight size={18} />
            </Link>
            <Link 
              to="/hubungi-kami" 
              className="inline-flex items-center justify-center gap-2 bg-transparent text-black border border-black/20 px-10 py-5 rounded-full font-bold tracking-wide hover:bg-black/5 transition-colors w-full sm:w-auto"
            >
              Hubungi Tim Penjualan
            </Link>
          </div>
        </section>

      </div>
    </PublicLayout>
  );
}
