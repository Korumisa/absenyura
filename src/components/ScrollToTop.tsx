import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Reset scroll ke paling atas (0, 0) setiap kali URL path berubah
    window.scrollTo(0, 0);
  }, [pathname]);

  return null; // Komponen ini tidak merender UI apapun
}
