import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fixLeafletDefaultIcons } from '@/lib/media/leafletIcon';
import type L from 'leaflet';

fixLeafletDefaultIcons();

// ── Leaflet systemic hardening helpers (shared pattern) ──────────────────
// Leaflet marks DOM elements with a custom `_leaflet_id` property when a map
// is initialised on them. If React reuses that DOM node without Leaflet
// properly tearing down first (fast remount / StrictMode double-invoke),
// Leaflet throws "Map container is already initialized".
// We therefore (1) strip every `_leaflet_id` property from the subtree
// before a MapContainer mounts, (2) key the tree with a random UUID so the
// identity is globally unique across mounts, and (3) destroy any ref-held
// raw instance on unmount.
function stripLeafletDomSignatures(root: HTMLElement | null) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.currentNode;
  while (node) {
    if (node instanceof HTMLElement) {
      try {
        // @ts-expect-error — Leaflet internal expando; we intentionally wipe it
        if (node._leaflet_id !== undefined) delete node._leaflet_id;
        // Also strip event-manager slots that some Leaflet versions leave
        // @ts-expect-error — same internal expando reason
        if (node._leaflet_events !== undefined) delete node._leaflet_events;
        // @ts-expect-error — same internal expando reason
        if (node._leaflet_tile_loaded !== undefined) delete node._leaflet_tile_loaded;
      } catch {
        /* defensive — IE/older engines can throw on delete of non-configurable */
      }
    }
    node = walker.nextNode();
  }
}

const MapUpdater = ({
  center,
  mapRef,
}: {
  center: [number, number];
  mapRef: React.MutableRefObject<L.Map | null>;
}) => {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    return () => {
      if (mapRef.current === map) mapRef.current = null;
    };
  }, [map, mapRef]);
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
  const leafletMapRef = useRef<L.Map | null>(null);
  // Collision-proof mount identity. If location changes, bump the key so a
  // stale map instance cannot accidentally attach to a node that was prepared
  // for different coordinates.
  const [mapKey, setMapKey] = useState<string>(() => crypto.randomUUID());
  const prevLocationKeyRef = useRef<string>('');

  // Before mounting the map (and whenever the location changes) ensure there
  // is no lingering Leaflet DOM signature in the panel.
  useEffect(() => {
    if (!location) return;
    const locKey = `${location.lat}:${location.lng}`;
    if (prevLocationKeyRef.current !== locKey) {
      prevLocationKeyRef.current = locKey;
      stripLeafletDomSignatures(mapPanelRef.current);
      setMapKey(crypto.randomUUID());
    }
  }, [location]);

  // Best-effort raw-instance teardown on unmount / location tear-down.
  useEffect(() => {
    // Capture refs into local variables during effect setup so the cleanup
    // function does not read a potentially-stale `.current` (per
    // react-hooks/exhaustive-deps ref-stale rule).
    const mapRefSnapshot = leafletMapRef;
    const panelRefSnapshot = mapPanelRef;
    return () => {
      try {
        if (mapRefSnapshot.current) {
          mapRefSnapshot.current.remove();
          mapRefSnapshot.current = null;
        }
      } catch {
        /* transient unmount throws are acceptable */
      }
      stripLeafletDomSignatures(panelRefSnapshot.current);
    };
  }, [location]);

  if (!location) return null;

  return (
    <div
      ref={mapPanelRef}
      className="z-0 h-52 w-full overflow-hidden rounded-xl border border-border shadow-inner"
    >
      <MapContainer
        key={mapKey}
        center={[location.lat, location.lng]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapUpdater center={[location.lat, location.lng]} mapRef={leafletMapRef} />

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
    </div>
  );
}
