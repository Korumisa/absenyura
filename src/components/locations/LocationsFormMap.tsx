import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapResizeOnOpen } from '@/components/MapResizeOnOpen';
import { fixLeafletDefaultIcons } from '@/lib/media/leafletIcon';
import { stripLeafletDomSignatures as stripLeafletById } from '@/lib/systemic/stripDomExpandos';
import { LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';

(function leafletInstallOnce() {
  const w = window as any;
  if (!w.__attendLeafletIconsInstalled__) {
    w.__attendLeafletIconsInstalled__ = true;
    fixLeafletDefaultIcons();
  }
})();

function stripLeafletDomSignatures(root: HTMLElement | null) {
  if (!root) return;
  stripLeafletById(root.id ?? `locations-map-panel-fallback-${crypto.randomUUID()}`);
}

function pruneLeafletPanel(root: HTMLElement | null) {
  if (!root) return;
  stripLeafletDomSignatures(root);
}

function ensureGlobalPruneHelperInstalled() {
  const w = window as any;
  if (typeof w.pruneLeafletGlobals === 'function') return;
  w.pruneLeafletGlobals = function () {
    try {
      const L = w.L;
      if (L && L.DomUtil) {
        const cacheObj =
          L.DomUtil._cache ||
          L.DomUtil._elementCache ||
          L.DomUtil.cache ||
          (L.DomUtil.get && L.DomUtil.get._cache);
        if (cacheObj && typeof cacheObj === 'object') {
          for (const k of Object.keys(cacheObj)) {
            try {
              delete cacheObj[k];
            } catch {
              void 0;
            }
          }
        }
      }
      if (L && L.Map) {
        for (const k of Object.getOwnPropertyNames(L.Map)) {
          const candidate = (L.Map as any)[k];
          if (candidate && typeof candidate === 'object' && candidate.constructor === Object) {
            try {
              const inner = Object.keys(candidate);
              if (inner.length > 0 && inner.length < 2000) {
                for (const ik of inner) delete candidate[ik];
              }
            } catch {
              void 0;
            }
          }
        }
        if (Array.isArray(L._instances)) L._instances.length = 0;
        if (L.__maps && typeof L.__maps === 'object') {
          for (const k of Object.keys(L.__maps)) delete L.__maps[k];
        }
      }
    } catch {
      void 0;
    }
  };
}

interface MapSelfHealingBoundaryProps {
  children: React.ReactNode;
  onRemount: () => void;
}
interface MapSelfHealingBoundaryState {
  hasError: boolean;
  remountSeq: number;
}

class MapSelfHealingBoundary extends React.Component<
  MapSelfHealingBoundaryProps,
  MapSelfHealingBoundaryState
> {
  constructor(props: MapSelfHealingBoundaryProps) {
    super(props);
    ensureGlobalPruneHelperInstalled();
    this.state = { hasError: false, remountSeq: 0 };
  }

  static getDerivedStateFromError(): Partial<MapSelfHealingBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    const msg = String((error as { message?: string })?.message ?? '');
    if (/Map container (is already initialized|is being reused)/i.test(msg)) {
      // Unmount MapContainer synchronously before sweeping Leaflet registries.
      flushSync(() => {
        this.setState((s) => ({ hasError: true, remountSeq: s.remountSeq + 1 }));
      });

      window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            try {
              (window as any).pruneLeafletGlobals?.();
            } catch {
              void 0;
            }
            flushSync(() => {
              this.props.onRemount();
              this.setState({ hasError: false });
            });
          });
        });
      }, 120);
    } else {
      throw error;
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
          Memuat ulang peta…
        </div>
      );
    }
    return <React.Fragment key={this.state.remountSeq}>{this.props.children}</React.Fragment>;
  }
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapViewSync({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: false });
  }, [lat, lng, map]);
  return null;
}

export interface LocationsFormMapProps {
  latitude: number;
  longitude: number;
  radius: number;
  onPositionChange: (lat: number, lng: number) => void;
  onLocateClick: () => void;
  isLocating: boolean;
}

/**
 * Isolated Leaflet host for the Locations dialog.
 *
 * Critical: never strip `_leaflet_id` / prune Leaflet globals while a live
 * MapContainer is mounted — that produces "Map container is being reused"
 * and bubbles to the route error boundary. Identity changes use a fresh
 * keyed host div so React never reuses the previous map container node.
 */
export default function LocationsFormMap({
  latitude,
  longitude,
  radius,
  onPositionChange,
  onLocateClick,
  isLocating,
}: LocationsFormMapProps) {
  const mapPanelRef = useRef<HTMLDivElement | null>(null);
  const [mapKey, setMapKey] = useState(() => crypto.randomUUID());
  const center: [number, number] = [latitude, longitude];

  // Cleanup only after this whole host unmounts (dialog closed / remount).
  useEffect(() => {
    const panelSnapshot = mapPanelRef.current;
    return () => {
      try {
        (window as any).pruneLeafletGlobals?.();
      } catch {
        void 0;
      }
      pruneLeafletPanel(panelSnapshot);
    };
  }, []);

  return (
    <div
      ref={mapPanelRef}
      id={`locations-map-panel-${mapKey}`}
      className="location-map-panel relative isolate z-0 min-h-[320px] flex-1 overflow-hidden bg-muted md:min-h-[480px]"
    >
      <MapSelfHealingBoundary key={mapKey} onRemount={() => setMapKey(crypto.randomUUID())}>
        <div key={mapKey} className="h-full min-h-[320px] w-full">
          <MapContainer
            key={mapKey}
            center={center}
            zoom={16}
            style={{ height: '100%', width: '100%', minHeight: 320 }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={center} />
            <Circle
              center={center}
              radius={radius}
              pathOptions={{
                color: 'indigo',
                fillColor: 'indigo',
                fillOpacity: 0.2,
              }}
            />
            <MapClickHandler onPick={onPositionChange} />
            <MapViewSync lat={latitude} lng={longitude} />
            <MapResizeOnOpen when />
          </MapContainer>
        </div>
      </MapSelfHealingBoundary>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onLocateClick}
        disabled={isLocating}
        className="absolute top-4 right-4 z-[1000] min-h-11 min-w-11 rounded-xl shadow-lg"
        title="Deteksi Lokasi Saya"
        aria-label="Deteksi lokasi saya"
      >
        <LocateFixed className={`size-5 ${isLocating ? 'animate-pulse text-indigo-500' : ''}`} />
      </Button>

      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[1000]">
        <div className="pointer-events-auto rounded bg-card/95 px-3 py-2 text-xs text-foreground shadow backdrop-blur">
          Klik pada peta untuk mengubah koordinat secara otomatis.
        </div>
      </div>
    </div>
  );
}
