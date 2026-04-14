import React from 'react';
import { Link } from 'react-router-dom';

export default function PublicFooter() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-white/10 pt-24 pb-12 text-white font-sans">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-24">
          <div className="col-span-2 lg:col-span-2 pr-8">
            <Link to="/" className="text-2xl font-bold tracking-tight text-white mb-6 flex items-center gap-2">
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-black rounded-full" />
              </div>
              Absensyura
            </Link>
            <p className="text-white/50 leading-relaxed max-w-sm font-light text-lg">
              Infrastruktur kehadiran zero-trust skala enterprise. Dibangun untuk kepastian absolut.
            </p>
          </div>
          
          <div>
            <h4 className="text-xs font-semibold text-white/80 tracking-widest uppercase mb-6">Sistem</h4>
            <ul className="space-y-4">
              <li><Link to="/fitur-utama" className="text-white/50 hover:text-white transition-colors">Arsitektur</Link></li>
              <li><Link to="/cara-kerja" className="text-white/50 hover:text-white transition-colors">Implementasi</Link></li>
              <li><Link to="/keamanan-gps" className="text-white/50 hover:text-white transition-colors">Keamanan Spasial</Link></li>
              <li><Link to="/integrasi-api" className="text-white/50 hover:text-white transition-colors">API Webhooks</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white/80 tracking-widest uppercase mb-6">Organisasi</h4>
            <ul className="space-y-4">
              <li><Link to="/tentang-kami" className="text-white/50 hover:text-white transition-colors">Manifesto</Link></li>
              <li><Link to="/karir" className="text-white/50 hover:text-white transition-colors">Karir</Link></li>
              <li><Link to="/mitra-kampus" className="text-white/50 hover:text-white transition-colors">Mitra Global</Link></li>
              <li><Link to="/hubungi-kami" className="text-white/50 hover:text-white transition-colors">Hubungi Penjualan</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white/80 tracking-widest uppercase mb-6">Referensi</h4>
            <ul className="space-y-4">
              <li><Link to="/pusat-bantuan" className="text-white/50 hover:text-white transition-colors">Pusat Bantuan</Link></li>
              <li><Link to="/dokumentasi-api" className="text-white/50 hover:text-white transition-colors">Dokumentasi API</Link></li>
              <li><Link to="/status-sistem" className="text-white/50 hover:text-white transition-colors">Status Jaringan</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} Absensyura Systems. Hak Cipta Dilindungi.
          </p>
          <div className="flex gap-8">
            <Link to="#" className="text-sm text-white/40 hover:text-white transition-colors">Privasi</Link>
            <Link to="#" className="text-sm text-white/40 hover:text-white transition-colors">Ketentuan Layanan</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
