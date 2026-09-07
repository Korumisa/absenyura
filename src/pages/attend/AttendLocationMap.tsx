import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fixLeafletDefaultIcons } from '@/lib/media/leafletIcon';
import { stripLeafletDomSignatures as stripLeafletById } from '@/lib/systemic/stripDomExpandos';

fixLeafletDefaultIcons();

// AttendLocationMap wrapper: helper menerima string rootId, sedangkan call sites
// saat ini pakai HTMLElement|null (snapshot ref .current). Adapter kompatibilitas:
function stripLeafletDomSignatures(root: HTMLElement | null) {
  if (!root || !root.id) {
    stripLeafletById(root?.id ?? '__no_id__');
    return;
  }
  stripLeafletById(root.id);
}

// ── Self-healing error boundary for Leaflet ──────────────────────────────
interface MapSelfHealingBoundaryProps {
  children: React.ReactNode;
  onRemount: () => void;
}
interface MapSelfHealingBoundaryState {
  hasError: boolean;
}
class MapSelfHealingBoundary extends React.Component<
  MapSelfHealingBoundaryProps,
  MapSelfHealingBoundaryState
> {
  state: MapSelfHealingBoundaryState = { hasError: false };
  static getDerivedStateFromError(_: any): MapSelfHealingBoundaryState {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    const msg: string = String(error?.message ?? '');
    if (/Map container (is already initialized|is being reused)/i.test(msg)) {
      window.setTimeout(() => {
        flushSync(() => {
          this.setState({ hasError: false });
          this.props.onRemount();
        });
      }, 16);
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
    return this.props.children;
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
      stripLeafletDomSignatures(mapPanelRef.current);
      setMapKey(crypto.randomUUID());
    }
  }, [location]);

  // Cleanup on unmount: ONLY strip DOM signatures. We intentionally DO NOT
  // call L.Map.remove() here — React-leaflet's native unmount already does
  // this, and a double-call triggers Leaflet 1.9's "being reused" error.
  useEffect(() => {
    const panel = mapPanelRef.current;
    return () => {
      stripLeafletDomSignatures(panel);
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
