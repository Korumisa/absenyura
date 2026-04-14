import React, { useEffect, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import { Layers, ArrowRight, Settings, Users, Focus, BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HowItWorks() {
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
        <div className="absolute top-1/2 right-0 translate-x-1/3 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 w-full z-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-12 backdrop-blur-md">
            <Layers size={16} className="text-emerald-400" />
            <span className="text-xs font-semibold tracking-widest uppercase text-white/80">Alur Operasional</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter leading-[0.95] mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 max-w-4xl">
            Sederhana.<br/>Kuat. Aman.
          </h1>
          <h2 className="text-2xl md:text-3xl text-white/40 font-light tracking-tight max-w-3xl">
            Sistem pengamanan yang kuat tidak harus sulit digunakan. Absensyura didesain agar operator hanya perlu menyetelnya sekali, dan sistem akan mengurus sisanya.
          </h2>
        </div>
      </div>
      
      <div className="bg-[#0a0a0a] py-32">
        <div className="max-w-4xl mx-auto px-6 relative">
          
          {/* Vertical line connecting steps */}
          <div className="hidden md:block absolute left-[50%] top-0 bottom-0 w-px bg-white/10" />

          {/* Step 1 */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-12 items-center mb-24 md:mb-32 relative">
            <div className="order-2 md:order-1 text-center md:text-right md:pr-12">
              <h3 className="text-sm uppercase tracking-widest text-emerald-400 font-bold mb-4">Langkah 01</h3>
              <h4 className="text-3xl font-bold mb-4">Konfigurasi Parameter Spasial</h4>
              <p className="text-white/50 leading-relaxed font-light">
                Administrator atau dosen login ke dashboard dan membuat Sesi Kehadiran. Menetapkan titik tengah (koordinat GPS ruangan), radius batas izin (misal: 10 meter), dan SSID/IP WiFi yang disetujui.
              </p>
            </div>
            <div className="order-1 md:order-2 flex justify-center md:justify-start md:pl-12 mb-8 md:mb-0">
              <div className="w-24 h-24 rounded-full bg-[#111] border border-white/10 flex items-center justify-center relative z-10">
                <Settings size={32} className="text-white" />
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-12 items-center mb-24 md:mb-32 relative">
            <div className="order-1 md:order-1 flex justify-center md:justify-end md:pr-12 mb-8 md:mb-0">
              <div className="w-24 h-24 rounded-full bg-[#111] border border-white/10 flex items-center justify-center relative z-10">
                <Users size={32} className="text-white" />
              </div>
            </div>
            <div className="order-2 md:order-2 text-center md:text-left md:pl-12">
              <h3 className="text-sm uppercase tracking-widest text-indigo-400 font-bold mb-4">Langkah 02</h3>
              <h4 className="text-3xl font-bold mb-4">Pengikatan Perangkat (Binding)</h4>
              <p className="text-white/50 leading-relaxed font-light">
                Saat peserta melakukan login pertama kalinya, sistem secara senyap merekam dan menyimpan Device Fingerprint ke dalam database. Mulai detik ini, akun tersebut tidak bisa meminjam ponsel temannya untuk absen.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-12 items-center mb-24 md:mb-32 relative">
            <div className="order-2 md:order-1 text-center md:text-right md:pr-12">
              <h3 className="text-sm uppercase tracking-widest text-purple-400 font-bold mb-4">Langkah 03</h3>
              <h4 className="text-3xl font-bold mb-4">Pemindaian QR Dinamis</h4>
              <p className="text-white/50 leading-relaxed font-light">
                Dosen memproyeksikan layar QR di depan kelas. Peserta membuka menu Pemindai QR. Kamera ponsel, modul GPS, dan enkripsi berpadu dalam 50 milidetik untuk mengirimkan paket data "Hadir" yang terotentikasi.
              </p>
            </div>
            <div className="order-1 md:order-2 flex justify-center md:justify-start md:pl-12 mb-8 md:mb-0">
              <div className="w-24 h-24 rounded-full bg-[#111] border border-white/10 flex items-center justify-center relative z-10">
                <Focus size={32} className="text-white" />
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-12 items-center relative">
            <div className="order-1 md:order-1 flex justify-center md:justify-end md:pr-12 mb-8 md:mb-0">
              <div className="w-24 h-24 rounded-full bg-[#111] border border-white/10 flex items-center justify-center relative z-10">
                <BarChart size={32} className="text-white" />
              </div>
            </div>
            <div className="order-2 md:order-2 text-center md:text-left md:pl-12">
              <h3 className="text-sm uppercase tracking-widest text-amber-400 font-bold mb-4">Langkah 04</h3>
              <h4 className="text-3xl font-bold mb-4">Sinkronisasi & Pelaporan</h4>
              <p className="text-white/50 leading-relaxed font-light">
                Sesi ditutup otomatis oleh Cron Job server saat waktunya habis. Mereka yang tidak memindai otomatis berstatus ALFA. Data rekapan (Excel/PDF) seketika siap diunduh atau diekspor via Webhook ke SIAKAD universitas.
              </p>
            </div>
          </div>

          <div className="mt-40 pt-12 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-white/50 font-light text-xl">Ingin melihat simulasi dasbornya secara langsung?</div>
            <Link to="/login" className="group flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-semibold tracking-wide hover:scale-105 transition-all duration-300">
              Uji Coba Sekarang <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
