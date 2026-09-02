import { StrictMode, lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, domAnimation } from 'framer-motion';
import App from './App';
import './index.css';

const SpeedInsights = lazy(() =>
  import('@vercel/speed-insights/react').then((m) => ({ default: m.SpeedInsights }))
);

function scheduleIdleWork(fn: () => void) {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(fn, { timeout: 3000 });
    return () => window.cancelIdleCallback(id);
  }
  const t = setTimeout(fn, 1);
  return () => clearTimeout(t);
}

function DeferredMonitoring() {
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    return scheduleIdleWork(() => {
      void import('@vercel/analytics').then(({ inject }) => inject());
      setShowInsights(true);
    });
  }, []);

  if (!showInsights) return null;

  return (
    <Suspense fallback={null}>
      <SpeedInsights />
    </Suspense>
  );
}

// Muat ulang otomatis saat chunk JS tidak ditemukan setelah deploy baru
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={domAnimation}>
      <App />
    </LazyMotion>
    <DeferredMonitoring />
  </StrictMode>
);
