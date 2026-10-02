import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapResizeOnOpen } from '@/components/MapResizeOnOpen';
import { fixLeafletDefaultIcons } from '@/lib/media/leafletIcon';
import { LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';

fixLeafletDefaultIcons();

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

export default function LocationsFormMap({
  latitude,
  longitude,
  radius,
  onPositionChange,
  onLocateClick,
  isLocating,
}: LocationsFormMapProps) {
  const center: [number, number] = [latitude, longitude];

  // Let React-Leaflet remove its own map when the dialog unmounts.
  return (
    <div className="location-map-panel relative isolate z-0 min-h-[320px] flex-1 overflow-hidden bg-muted md:min-h-[480px]">
      <div className="h-full min-h-[320px] w-full">
        <MapContainer
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
            pathOptions={{ color: 'indigo', fillColor: 'indigo', fillOpacity: 0.2 }}
          />
          <MapClickHandler onPick={onPositionChange} />
          <MapViewSync lat={latitude} lng={longitude} />
          <MapResizeOnOpen when />
        </MapContainer>
      </div>
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
