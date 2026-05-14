import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const el = document.getElementById('app-main-scroll');
    if (el) el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    else window.scrollTo(0, 0);
  }, [pathname]);

  return null; // Komponen ini tidak merender UI apapun
}
