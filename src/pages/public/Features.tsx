import React, { useEffect, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import { Box, MapPin, Fingerprint, ShieldCheck, Activity, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Features() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <PublicLayout>
      <div className="relative min-h-[80vh] flex flex-col justify-center items-start overflow-hidden pt-32 pb-24 border-b border-white/5">
        <div 
          className="absolute inset-0 bg-gradient-to-b from-[#111] to-[#0a0a0a] -z-10"
          style={{ transform: `translateY(${scrollY * 0.4}px)` }}
        />
        <div className="absolute top-1/2 right-0 translate-x-1/3 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 w-full z-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-12 backdrop-blur-md">
            <Box size={16} className="text-indigo-400" />
            <span className="text-xs font-semibold tracking-widest uppercase text-white/80">Tinjauan Platform</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter leading-[0.95] mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 max-w-4xl">
            Arsitektur Zero-Trust.<br/>Tanpa Celah.
          </h1>
          <h2 className="text-2xl md:text-3xl text-white/40 font-light tracking-tight max-w-3xl">
            Sistem absensi standar terlalu mudah dimanipulasi. Kami merombak ulang infrastruktur kehadiran dengan tiga lapisan keamanan kriptografis dan geospasial tingkat militer.
          </h2>
        </div>
      </div>
      
      <div className="bg-[#0a0a0a] py-32">
        <div className="max-w-7xl mx-auto px-6 space-y-24 md:space-y-40">
          
          {/* Feature 1 */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10">
                <MapPin size={32} className="text-indigo-400" />
              </div>
              <h3 className="text-4xl font-bold tracking-tight mb-6">Geofencing Satelit Presisi Tinggi</h3>
              <p className="text-lg text-white/50 font-light leading-relaxed mb-6">
                Kami menggunakan kombinasi GPS, GLONASS, dan Galileo untuk memetakan lokasi pengguna hingga akurasi sentimeter. Bukan sekadar titik koordinat, sistem kami membaca anomali pergerakan (teleportasi) untuk memblokir penggunaan Fake GPS secara instan.
              </p>
              <ul className="space-y-4 text-white/60 font-light">
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Deteksi emulator & aplikasi peretas lokasi</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Algoritma Haversine untuk kalkulasi radius absolut</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Penguncian jaringan via BSSID (WiFi Mac Address)</li>
              </ul>
            </div>
            <div className="order-1 md:order-2 bg-[#111] border border-white/10 rounded-3xl p-8 aspect-square relative overflow-hidden flex items-center justify-center group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              {/* Visual abstraction of a radar/map */}
              <div className="relative w-64 h-64 border border-white/20 rounded-full flex items-center justify-center">
                <div className="absolute w-48 h-48 border border-white/10 rounded-full animate-[ping_3s_ease-in-out_infinite]" />
                <div className="absolute w-32 h-32 border border-white/5 rounded-full animate-[ping_3s_ease-in-out_infinite_500ms]" />
                <MapPin size={48} className="text-indigo-400 z-10" />
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="bg-[#111] border border-white/10 rounded-3xl p-8 aspect-square relative overflow-hidden flex items-center justify-center group">
              <div className="absolute inset-0 bg-gradient-to-bl from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              {/* Visual abstraction of a fingerprint/device lock */}
              <div className="relative flex flex-col items-center gap-6">
                <div className="w-24 h-32 border-2 border-white/20 rounded-3xl flex items-center justify-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 animate-[bounce_2s_ease-in-out_infinite]" />
                  <Fingerprint size={48} className="text-emerald-400/50" />
                </div>
              </div>
            </div>
            <div>
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10">
                <Fingerprint size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-4xl font-bold tracking-tight mb-6">Device Fingerprinting Kriptografis</h3>
              <p className="text-lg text-white/50 font-light leading-relaxed mb-6">
                Hilangkan kebiasaan "titip absen". Akun pengguna diikat secara permanen ke identitas perangkat keras (hardware ID) dari ponsel cerdas mereka sejak sesi login pertama.
              </p>
              <ul className="space-y-4 text-white/60 font-light">
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 1 Akun = 1 Perangkat Fisik</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Pemblokiran otomatis saat login di perangkat lain</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Reset perangkat terkontrol oleh Administrator</li>
              </ul>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10">
                <ShieldCheck size={32} className="text-purple-400" />
              </div>
              <h3 className="text-4xl font-bold tracking-tight mb-6">QR Code Dinamis Berbasis Waktu</h3>
              <p className="text-lg text-white/50 font-light leading-relaxed mb-6">
                QR Code statis yang ditempel di dinding sudah kuno. Absensyura memproyeksikan QR Code yang dirender secara real-time dan berotasi (berubah bentuk) setiap 15 detik menggunakan kunci rahasia server (HMAC-SHA256).
              </p>
              <ul className="space-y-4 text-white/60 font-light">
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Mencegah pembagian foto QR ke grup chat</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Tanda tangan digital yang divalidasi oleh server</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Layar proyektor sebagai pusat validasi fisik</li>
              </ul>
            </div>
            <div className="order-1 md:order-2 bg-[#111] border border-white/10 rounded-3xl p-8 aspect-square relative overflow-hidden flex items-center justify-center group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              {/* Visual abstraction of rotating QR */}
              <div className="relative w-48 h-48 border border-white/10 bg-white/5 rounded-2xl flex items-center justify-center p-4">
                <div className="w-full h-full border-4 border-dashed border-purple-500/50 animate-[spin_10s_linear_infinite]" />
                <div className="absolute font-mono text-purple-400 font-bold tracking-widest">OTP: 015s</div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-40 pt-12 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-white/50 font-light text-xl">Siap menguji ketahanan sistem kami?</div>
            <Link to="/login" className="group flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-semibold tracking-wide hover:scale-105 transition-all duration-300">
              Mulai Operasional <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
