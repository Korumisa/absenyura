import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fixLeafletDefaultIcons } from '@/lib/media/leafletIcon';
import { stripLeafletDomSignatures as stripLeafletById } from '@/lib/systemic/stripDomExpandos';

// ── Idempotent leaflet side-effects ────────────────────────────────────────
// Guards prevent re-running these module-level side-effects on HMR / StrictMode
// double-invoke / lazy-load re-evaluation.
(function leafletInstallOnce() {
  const w = window as any;
  if (!w.__attendLeafletIconsInstalled__) {
    w.__attendLeafletIconsInstalled__ = true;
    fixLeafletDefaultIcons();
  }
})();

// AttendLocationMap wrapper: helper systemic menerima string rootId, sedangkan
// call sites saat ini pakai snapshot ref HTMLElement|null. Adapter kompatibilitas.
function stripLeafletDomSignatures(root: HTMLElement | null) {
  if (!root) return;
  stripLeafletById(root.id ?? `attend-map-panel-fallback-${crypto.randomUUID()}`);
}

/** Safe Leaflet panel sanitizer — **never wipes innerHTML**, and MUST NEVER
 *  sweep global L registries when a MapContainer is still mounted in the DOM.
 *  The global `pruneLeafletGlobals` helper deletes entries from `window.L.*`
 *  caches that the LIVE map instance still needs. Calling it during a normal
 *  prop update (GPS location drift change) caused the production crash:
 *    "Map container is being reused by another instance at e.remove"
 *    bubbled all the way to the route-level error boundary.
 *
 *  This local helper therefore ONLY strips per-DOM-node expandos
 *  (`_leaflet_id`, `_leaflet_events`, `_leaflet_tile_loaded`) via the
 *  centralized TreeWalker helper. Global registry cleanup is reserved
 *  EXCLUSIVELY for the MapSelfHealingBoundary error-recovery code path and
 *  the unmount effect (both of which are guaranteed to run AFTER the old
 *  <MapContainer> has been fully torn down from the DOM).
 */
function pruneLeafletPanel(root: HTMLElement | null) {
  if (!root) return;
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
// Leaflet's global cache sweep is installed ONLY once per page lifecycle.
// Kept separate from the module-level helper so we can guarantee it never
// fires while a MapContainer is still mounted.
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
class MapSelfHealingBoundary extends React.Component<
  MapSelfHealingBoundaryProps,
  MapSelfHealingBoundaryState
> {
  constructor(props: MapSelfHealingBoundaryProps) {
    super(props);
    ensureGlobalPruneHelperInstalled();
    this.state = { hasError: false, remountSeq: 0 };
  }

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
      // tile worker teardown. THEN (and only then) sweep global Leaflet
      // registries — now guaranteed to not affect a live map instance.
      window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            try {
              (window as any).pruneLeafletGlobals?.();
            } catch {
              void 0;
            }

            // ── STEP 3 ────────────────────────────────────────────────────
            // Now ask the parent to regenerate its `mapKey` random UUID then
            // flip hasError off synchronously so React builds a FRESH
            // <MapContainer> subtree into a truly clean container.
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
  const prevRemountLatLngRef = useRef<{ lat: number; lng: number } | null>(null);
  const debounceRegenTimerRef = useRef<number | null>(null);

  // ⚠️ Deliberately NO `useEffect[mapKey]` here.
  //
  // We used to sweep pruneLeafletPanel every time the parent regenerated
  // `mapKey` (GPS drift update). That triggered `window.pruneLeafletGlobals`
  // which wiped entries from Leaflet's internal L.Map registry while the
  // OLD React-leaflet <MapContainer> instance was still mounted in the DOM
  // (React's reconciler is asynchronous). The stale instance then called
  // L.Map.remove() on its own teardown, Leaflet's collision check returned
  // "another instance", and the error bubbled past the page boundary to
  // the top-level route error screen.
  //
  // Normal GPS prop updates (1–20m drift, ref changes every watchPosition tick)
  // should be handled by the <MapUpdater> leaflet hook (map.setView) inside
  // the mounted tree. We only regenerate the mapKey when we truly need a
  // fresh instance, and we always let React's unmount lifecycle run first.

  // Regenerate map identity ONLY for BIG location jumps > 500 m AND only
  // after the value has settled for ≥ 300 ms (debounce GPS watchPosition
  // noise). Normal drift (accuracy improvement) no longer causes remounts.
  useEffect(() => {
    if (!location) return;

    const prev = prevRemountLatLngRef.current;
    if (!prev) {
      prevRemountLatLngRef.current = { lat: location.lat, lng: location.lng };
      return;
    }

    // Haversine-ish quick check: ~1 deg lat ≈ 111 km, ~1 deg lng ≈ 111 km *
    // cos(lat). Convert to metres; skip regenerate if small drift.
    const dLat = location.lat - prev.lat;
    const dLng = location.lng - prev.lng;
    const dMetres = Math.sqrt(
      Math.pow(dLat * 111_000, 2) +
        Math.pow(dLng * 111_000 * Math.cos((location.lat * Math.PI) / 180), 2)
    );

    if (dMetres < 500) return; // normal GPS drift, use MapUpdater.setView instead

    if (debounceRegenTimerRef.current) {
      window.clearTimeout(debounceRegenTimerRef.current);
    }
    debounceRegenTimerRef.current = window.setTimeout(() => {
      prevRemountLatLngRef.current = { lat: location.lat, lng: location.lng };
      setMapKey(crypto.randomUUID());
    }, 300);

    return () => {
      if (debounceRegenTimerRef.current) {
        window.clearTimeout(debounceRegenTimerRef.current);
        debounceRegenTimerRef.current = null;
      }
    };
  }, [location]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  // ONLY HERE, AFTER React reconciler has confirmed the full component tree
  // (including its nested <MapContainer>) is being torn down, do we call
  // the global Leaflet registry sweep. This is the ONLY normal-lifecycle
  // call site that touches window.pruneLeafletGlobals; all others are
  // gated inside MapSelfHealingBoundary.componentDidCatch (which similarly
  // waits for flushSync unmount commit before sweeping).
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
