import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/** Panggil invalidateSize saat peta di dalam dialog/modal baru tampil */
export function MapResizeOnOpen({ when }: { when: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!when) return;
    const run = () => map.invalidateSize({ animate: false });
    run();
    const t1 = window.setTimeout(run, 80);
    const t2 = window.setTimeout(run, 320);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [when, map]);

  return null;
}
