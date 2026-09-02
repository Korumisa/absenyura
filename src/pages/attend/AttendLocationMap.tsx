import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fixLeafletDefaultIcons } from '@/lib/media/leafletIcon';

fixLeafletDefaultIcons();

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
  if (!location) return null;

  return (
    <div className="z-0 h-52 w-full overflow-hidden rounded-xl border border-border shadow-inner border-border">
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
    </div>
  );
}
