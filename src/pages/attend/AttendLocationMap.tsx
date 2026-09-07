import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fixLeafletDefaultIcons } from '@/lib/media/leafletIcon';
import { stripLeafletDomSignatures as stripLeafletById } from '@/lib/systemic/stripDomExpandos';

fixLeafletDefaultIcons();

// AttendLocationMap wrapper: helper systemic menerima string rootId, sedangkan
// call sites saat ini pakai snapshot ref HTMLElement|null. Adapter kompatibilitas.
function stripLeafletDomSignatures(root: HTMLElement | null) {
  if (!root) return;
  stripLeafletById(root.id ?? `attend-map-panel-fallback-${crypto.randomUUID()}`);
}

/** Aggresive pre- & post-mount panel sanitizer for Leaflet reuse-safety:
 *  1. Empty innerHTML → removes leftover Leaflet DOM (.leaflet-control-container,
 *     .leaflet-pane stacks, tile image nodes that React-leaflet's internal
 *     unmount sometimes leaves behind when component errors mid-render).
 *  2. Strips every `_leaflet_id` / `_leaflet_events` expando from the tree via
 *     the existing centralized TreeWalker helper.
 */
function pruneLeafletPanel(root: HTMLElement | null) {
  if (!root) return;
  try {
    root.innerHTML = '';
  } catch {
    // IE / old engines throw on innerHTML of some nodes — ignore.
    while (root.firstChild) root.removeChild(root.firstChild);
  }
  stripLeafletDomSignatures(root);
}

// ── Self-healing error boundary for Leaflet ──────────────────────────────
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
  state: MapSelfHealingBoundaryState = { hasError: false, remountSeq: 0 };
  static getDerivedStateFromError(_: any): MapSelfHealingBoundaryState {
    return { hasError: true, remountSeq: (_.remountSeq ?? 0) + 1 };
  }
  componentDidCatch(error: any) {
    const msg: string = String(error?.message ?? '');
    if (/Map container (is already initialized|is being reused)/i.test(msg)) {
      // STEP 1: Commit skeleton first (hasError=true) → React unmounts the
      // stale MapContainer (runs Leaflet internal .remove() + our effect
      // cleanup strip expandos). This guarantees the old instance is gone.
      flushSync(() => {
        this.setState((s) => ({ hasError: true, remountSeq: s.remountSeq + 1 }));
      });
      // STEP 2+3: Wait 2 consecutive frames + macrotask so React commit &
      // DOM cleanup are 100% flushed before we attempt a fresh mount.
      window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            // Parent regenerates mapKey (different DOM id) and we increment
            // remountSeq once more — React will build a brand new subtree.
            flushSync(() => {
              this.props.onRemount();
              this.setState({ hasError: false });
            });
          });
        });
      }, 50);
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

const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
};

export interface AttendLocationMapProps {
  location: { lat: number; lng: number } | null;
  sessionLocation?: {
    latitude: number;
    longitude: number;
    radius: number;
  } | null;
  isLocationValid: boolean;
}

export default function AttendLocationMap({
  location,
  sessionLocation,
  isLocationValid,
}: AttendLocationMapProps) {
  const mapPanelRef = useRef<HTMLDivElement | null>(null);
  const [mapKey, setMapKey] = useState<string>(() => crypto.randomUUID());
  const prevLocationKeyRef = useRef<string>('');

  // When location changes → strip signatures + regenerate key.
  useEffect(() => {
    if (!location) return;
    const locKey = `${location.lat}:${location.lng}`;
    if (prevLocationKeyRef.current !== locKey) {
      prevLocationKeyRef.current = locKey;
      pruneLeafletPanel(mapPanelRef.current);
      setMapKey(crypto.randomUUID());
    }
  }, [location]);

  // Pre-mount prune: every time the map key changes (fresh mount attempt),
  // nuke residual DOM children + expandos from the wrapper BEFORE React
  // commits the new MapContainer. Eliminates "another instance" reuse race.
  useEffect(() => {
    pruneLeafletPanel(mapPanelRef.current);
    // Depends on mapKey only — run once per remount cycle.
     
  }, [mapKey]);

  // Cleanup on unmount: prune DOM children (empty container innerHTML)
  // + strip all Leaflet DOM expandos (`_leaflet_id`, `_leaflet_events`).
  // React-leaflet's native unmount already calls internal L.Map.remove()
  // — we don't duplicate that call (it triggers "being reused" on 1.9).
  useEffect(() => {
    const panelSnapshot = mapPanelRef.current;
    return () => {
      pruneLeafletPanel(panelSnapshot);
    };
  }, []);

  if (!location) return null;

  return (
    <div
      ref={mapPanelRef}
      id={`attend-map-panel-${mapKey}`}
      className="z-0 h-52 w-full overflow-hidden rounded-xl border border-border shadow-inner"
    >
      <MapSelfHealingBoundary key={mapKey} onRemount={() => setMapKey(crypto.randomUUID())}>
        <MapContainer
          center={[location.lat, location.lng]}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapUpdater center={[location.lat, location.lng]} />

          <Marker position={[location.lat, location.lng]}>
            <Popup>Lokasi Anda Saat Ini</Popup>
          </Marker>

          {sessionLocation && (
            <Circle
              center={[sessionLocation.latitude, sessionLocation.longitude]}
              radius={sessionLocation.radius}
              pathOptions={{
                color: isLocationValid ? 'green' : 'red',
                fillColor: isLocationValid ? 'green' : 'red',
                fillOpacity: 0.2,
              }}
            >
              <Popup>Area Absensi ({sessionLocation.radius}m)</Popup>
            </Circle>
          )}
        </MapContainer>
      </MapSelfHealingBoundary>
    </div>
  );
}
