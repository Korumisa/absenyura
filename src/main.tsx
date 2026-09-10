import { StrictMode, lazy, Suspense, useEffect, useState, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import App from './App';
import './index.css';

// ── ErrorBoundary for DeferredMonitoring (ChunkLoadError guard) ───────────
// SpeedInsights / Analytics are non-critical. If their chunk fails to load
// (e.g. CDN cache stale after a deploy), we MUST NOT let that bubble up and
// crash the ENTIRE app (white screen of death on root-level sibling).
interface ChunkLoadErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}
interface ChunkLoadErrorBoundaryState {
  hasError: boolean;
}
class ChunkLoadErrorBoundary extends Component<
  ChunkLoadErrorBoundaryProps,
  ChunkLoadErrorBoundaryState
> {
  state: ChunkLoadErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(_e: unknown): ChunkLoadErrorBoundaryState {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    const msg = String(error instanceof Error ? error.message : (error ?? ''));
     
    console.warn('[ChunkLoadErrorBoundary] suppressed non-critical chunk error:', msg);
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

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

// Swap media attribute untuk Google Fonts stylesheet — menggantikan inline onload=""
// yang melanggar CSP script-src-attr 'none'. Event listener via JS property diizinkan CSP.
(function activateGoogleFonts() {
  if (typeof document === 'undefined') return;
  const link = document.getElementById('google-fonts-stylesheet') as HTMLLinkElement | null;
  if (!link) return;
  const swap = () => {
    if (link.media !== 'all') link.media = 'all';
  };
  if (link.sheet) {
    swap();
  } else {
    link.addEventListener('load', swap, { once: true });
    link.addEventListener(
      'error',
      () => {
        link.media = 'all';
      },
      { once: true }
    );
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <LazyMotion features={domAnimation}>
        <App />
      </LazyMotion>
      <ChunkLoadErrorBoundary>
        <DeferredMonitoring />
      </ChunkLoadErrorBoundary>
    </Router>
  </StrictMode>
);
