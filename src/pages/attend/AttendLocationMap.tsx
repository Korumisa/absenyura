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

/** Safe Leaflet panel sanitizer — **never wipes innerHTML**.
 *  React owns the wrapper div's children via react-leaflet's <MapContainer>
 *  host fiber tree. Manually clearing innerHTML here would make React's
 *  reconciler try to `removeChild` a node that no longer exists during a
 *  subsequent unmount, crashing with:
 *    NotFoundError: Failed to execute 'removeChild' on 'Node'.
 *
 *  We therefore ONLY strip every `_leaflet_id` / `_leaflet_events` /
 *  `_leaflet_tile_loaded` expando from the subtree via the centralized
 *  TreeWalker helper, PLUS (this is the critical hard fix for "container
 *  is being reused"): sweep Leaflet's internal global registries so the
 *  old <MapContainer> instance cannot be detected by a fresh mount.
 */
function installPruneLeafletGlobalsOnce() {
  const w = window as any;
  if (typeof w.pruneLeafletGlobals === 'function') return;
  w.pruneLeafletGlobals = function () {
    try {
      // ── 1. L.DomUtil element → key cache ──────────────────────────────
      //    e.g. used by Leaflet v1.9 to associate a DOM node with its
      //    internal map / layer id. If a stale entry survives across
      //    remounts, the fresh L.Map constructor thinks the div is "busy".
      const L = w.L;
      if (L && L.DomUtil) {
        const cacheObj =
          L.DomUtil._cache ||
          L.DomUtil._elementCache ||
          L.DomUtil.cache ||
          (L.DomUtil.get && L.DomUtil.get._cache);
        if (cacheObj && typeof cacheObj === 'object') {
          const keys = Object.keys(cacheObj);
          for (const k of keys) {
            try {
              delete cacheObj[k];
            } catch {
              void 0;
            }
          }
        }
      }

      // ── 2. Global L.Map instance registry ─────────────────────────────
      //    Leaflet 1.9 exposes no public list, but many 3rd-party builds
      //    attach `_instances` / `__maps`. We also sweep any property on
      //    L.Map itself that holds an id → instance WeakMap-like object.
      if (L && L.Map) {
        for (const k of Object.getOwnPropertyNames(L.Map)) {
          const candidate = (L.Map as any)[k];
          if (candidate && typeof candidate === 'object' && candidate.constructor === Object) {
            try {
              const inner = Object.keys(candidate);
              // Heuristic: wipe map-like id registries (< 2000 keys small)
              if (inner.length > 0 && inner.length < 2000) {
                for (const ik of inner) delete candidate[ik];
              }
            } catch {
              void 0;
            }
          }
        }
        // Also sweep on the global L namespace (common 3rd-party pattern)
        if (Array.isArray(L._instances)) {
          L._instances.length = 0;
        }
        if (L.__maps && typeof L.__maps === 'object') {
          for (const k of Object.keys(L.__maps)) delete L.__maps[k];
        }
      }
    } catch {
      void 0;
    }
  };
}
installPruneLeafletGlobalsOnce();

function pruneLeafletPanel(root: HTMLElement | null) {
  if (!root) return;
  try {
    (window as any).pruneLeafletGlobals?.();
  } catch {
    void 0;
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

  // We intentionally do NOT mutate state here. `getDerivedStateFromError` runs
  // during the "render phase" and bails us out before `componentDidCatch` has
  // a chance to orchestrate the strict 3-step flushSync unmount → wait →
  // remount sequence below. Leave state transitions to componentDidCatch.
  static getDerivedStateFromError(
    _: unknown,
    state: MapSelfHealingBoundaryState
  ): MapSelfHealingBoundaryState {
    return state;
  }

  componentDidCatch(error: any) {
    const msg: string = String(error?.message ?? '');
    if (/Map container (is already initialized|is being reused)/i.test(msg)) {
      // ── STEP 1 ──────────────────────────────────────────────────────────
      // Force a SYNCHRONOUS React commit that swaps the tree to the skeleton
      // panel. This unmounts <MapContainer> right now, which triggers React-
      // leaflet's native L.Map.remove() + our cleanup effect that calls
      // pruneLeafletPanel (strip _leaflet_id expandos + global registry).
      // Without flushSync here React would batch this update together with
      // step 3 and the old map instance would still be attached to the DOM
      // when the new one tries to initialize.
      flushSync(() => {
        this.setState((s) => ({ hasError: true, remountSeq: s.remountSeq + 1 }));
      });

      // ── STEP 2 ──────────────────────────────────────────────────────────
      // Wait one macrotask + 2 animation frames so React's commit queue is
      // 100% flushed, the browser has a chance to fire MutationObserver /
      // ResizeObserver callbacks, and React-leaflet has finished its async
      // tile worker teardown.
      window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            // Extra safety sweep: manually clean any residual Leaflet state
            // that may still be attached to the container between commits.
            try {
              (window as any).pruneLeafletGlobals?.();
            } catch {
              void 0;
            }

            // ── STEP 3 ────────────────────────────────────────────────────
            // Now (and only now) ask the parent to regenerate its `mapKey` /
            // `mapInstanceKey` random UUID then flip hasError off synchronously
            // so React builds a FRESH <MapContainer> subtree into a truly
            // clean container.
            flushSync(() => {
              this.props.onRemount();
              this.setState({ hasError: false });
            });
          });
        });
      }, 80);
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
    // Wrapping children in a React.Fragment with an incrementing `key` forces
    // React to throw away the entire child fiber tree on every remount, so
    // even if the parent somehow fails to regenerate its unique map id we
    // still build brand new DOM nodes with no reused state.
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

  // Pre-mount sweep: every time the mapKey changes (fresh mount attempt or
  // location prop change), strip residual Leaflet expandos BEFORE React
  // commits the new MapContainer. Eliminates "already initialized"
  // signature collisions without touching DOM children that React owns
  // (wiping children would cause reconciler crash: NotFoundError removeChild).
  useEffect(() => {
    pruneLeafletPanel(mapPanelRef.current);
    // Depends on mapKey only — run once per remount cycle.
     
  }, [mapKey]);

  // Cleanup on unmount: strip Leaflet's custom DOM expandos
  // (`_leaflet_id`, `_leaflet_events`, `_leaflet_tile_loaded`) from the
  // wrapper subtree. We intentionally DO NOT clear innerHTML here — the
  // wrapper is React-owned host fiber for <MapContainer>; wiping children
  // makes React's reconciler crash with:
  //   NotFoundError: removeChild — node not a child of this node.
  // React-leaflet's native unmount already calls internal L.Map.remove().
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
