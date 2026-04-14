import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function PublicNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled || isMobileMenuOpen ? 'bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent border-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-black rounded-full" />
            </div>
            Absensyura
          </Link>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <Link to="/fitur-utama" className="text-sm font-medium tracking-wide text-white/60 hover:text-white transition-colors">Platform</Link>
          <Link to="/cara-kerja" className="text-sm font-medium tracking-wide text-white/60 hover:text-white transition-colors">Cara Kerja</Link>
          <Link to="/harga-paket" className="text-sm font-medium tracking-wide text-white/60 hover:text-white transition-colors">Enterprise</Link>
          <Link to="/tentang-kami" className="text-sm font-medium tracking-wide text-white/60 hover:text-white transition-colors">Perusahaan</Link>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <Link to="/login" className="text-sm font-medium tracking-wide text-white/60 hover:text-white transition-colors">Log in</Link>
          <Link to="/login" className="text-sm font-medium tracking-wide bg-white text-black px-6 py-2.5 rounded-full hover:bg-white/90 transition-colors">Mulai Sekarang</Link>
        </div>

        <button className="md:hidden p-2 text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full h-[calc(100vh-5rem)] bg-[#0a0a0a] border-t border-white/5 px-6 py-8 flex flex-col gap-8 overflow-y-auto">
          <Link to="/fitur-utama" className="text-2xl sm:text-3xl font-medium text-white tracking-tight">Platform</Link>
          <Link to="/cara-kerja" className="text-2xl sm:text-3xl font-medium text-white tracking-tight">Cara Kerja</Link>
          <Link to="/harga-paket" className="text-2xl sm:text-3xl font-medium text-white tracking-tight">Enterprise</Link>
          <Link to="/tentang-kami" className="text-2xl sm:text-3xl font-medium text-white tracking-tight">Perusahaan</Link>
          
          <div className="h-px w-full bg-white/10 my-4" />
          
          <Link to="/login" className="text-xl font-medium text-white/60">Log in</Link>
          <Link to="/login" className="text-xl font-medium text-black bg-white w-full text-center py-4 rounded-full">Mulai Sekarang</Link>
        </div>
      )}
    </nav>
  );
}
