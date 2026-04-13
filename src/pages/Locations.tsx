import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { Plus, Edit2, Trash2, Search, X, MapPin, LocateFixed } from 'lucide-react';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Fix leaflet icon issue in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Location {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius: number;
  wifi_bssid: string[];
}

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  
  // Custom Map hook state to force re-render map center
  const [mapCenter, setMapCenter] = useState<[number, number]>([-8.11475, 115.08865]);
  const [isLocating, setIsLocating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '', address: '', latitude: -8.11475, longitude: 115.08865, radius: 100, wifi_bssid: ''
  });

  const [isGeocoding, setIsGeocoding] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/locations');
      setLocations(res.data.data);
    } catch (error) {
      toast.error('Gagal mengambil data lokasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleOpenModal = (location: Location | null = null) => {
    if (location) {
      setEditingLocation(location);
      setMapCenter([location.latitude, location.longitude]);
      setFormData({
        name: location.name,
        address: location.address || '',
        latitude: location.latitude,
        longitude: location.longitude,
        radius: location.radius,
        wifi_bssid: location.wifi_bssid.join(', ')
      });
    } else {
      setEditingLocation(null);
      // Center map to Undiksha coordinate by default
      setMapCenter([-8.11475, 115.08865]); 
      setFormData({
        name: '', address: '', latitude: -8.11475, longitude: 115.08865, radius: 100, wifi_bssid: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        wifi_bssid: formData.wifi_bssid.split(',').map(ip => ip.trim()).filter(Boolean)
      };

      if (editingLocation) {
        await api.put(`/locations/${editingLocation.id}`, payload);
        toast.success('Lokasi berhasil diperbarui');
      } else {
        await api.post('/locations', payload);
        toast.success('Lokasi berhasil ditambahkan');
      }
      setIsModalOpen(false);
      fetchLocations();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus lokasi ini?')) {
      try {
        await api.delete(`/locations/${id}`);
        toast.success('Lokasi berhasil dihapus');
        fetchLocations();
      } catch (error) {
        toast.error('Gagal menghapus lokasi');
      }
    }
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Browser Anda tidak mendukung fitur geolokasi');
      return;
    }

    setIsLocating(true);
    toast.loading('Mencari lokasi Anda...', { id: 'geolocation' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMapCenter([lat, lng]);
        setFormData({
          ...formData,
          latitude: lat,
          longitude: lng
        });
        toast.success('Lokasi ditemukan!', { id: 'geolocation' });
        setIsLocating(false);
      },
      (error) => {
        let msg = 'Gagal mendapatkan lokasi';
        if (error.code === 1) msg = 'Akses lokasi ditolak. Izinkan browser mengakses lokasi.';
        else if (error.code === 2) msg = 'Sinyal GPS tidak tersedia.';
        else if (error.code === 3) msg = 'Waktu pencarian lokasi habis.';
        
        toast.error(msg, { id: 'geolocation' });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Map Click Handler Component
  const MapEvents = () => {
    const map = useMapEvents({
      click(e) {
        setFormData({
          ...formData,
          latitude: e.latlng.lat,
          longitude: e.latlng.lng
        });
      },
    });
    
    // Auto center map when coordinate inputs change
    useEffect(() => {
      map.setView([formData.latitude, formData.longitude], map.getZoom(), {
        animate: true,
        duration: 1
      });
    }, [formData.latitude, formData.longitude, map]);
    
    return null;
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, address: value });

    // Debounce Geocoding API Call (OpenStreetMap Nominatim)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length > 3) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsGeocoding(true);
        try {
          // Use fetch directly to bypass API interceptor base URL
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=1`);
          const data = await response.json();
          
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            setFormData(prev => ({
              ...prev,
              latitude: lat,
              longitude: lon
            }));
            setMapCenter([lat, lon]);
            toast.success('Lokasi ditemukan dari alamat');
          }
        } catch (error) {
          console.error('Geocoding error:', error);
        } finally {
          setIsGeocoding(false);
        }
      }, 1000); // 1 second delay after typing stops
    }
  };

  const filteredLocations = locations.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (l.address && l.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Manajemen Lokasi Geofencing</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Lokasi
        </Button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              type="text" 
              placeholder="Cari nama lokasi atau alamat..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-zinc-950/50">
              <TableRow>
                <TableHead>Nama Lokasi</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>Koordinat (Lat, Lng)</TableHead>
                <TableHead>Radius</TableHead>
                <TableHead>IP/WiFi Diizinkan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500 dark:text-zinc-400">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : filteredLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500 dark:text-zinc-400">
                    Tidak ada data lokasi ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLocations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-indigo-500" />
                        {loc.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-zinc-300 max-w-xs truncate" title={loc.address || ''}>
                      {loc.address || '-'}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-zinc-300 font-mono text-sm">
                      {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-zinc-300">
                      {loc.radius} meter
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-zinc-300">
                      {loc.wifi_bssid.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {loc.wifi_bssid.map((ip, i) => (
                            <span key={i} className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded text-xs">
                              {ip}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenModal(loc)}
                          className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-indigo-900/30"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(loc.id)}
                          className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-red-900/30"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 py-8">
          <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-full border border-slate-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingLocation ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row overflow-hidden">
              <div className="p-6 md:w-1/2 overflow-y-auto space-y-4 border-r border-slate-200 dark:border-zinc-800">
                <div className="space-y-2">
                  <Label>Nama Lokasi</Label>
                  <Input 
                    type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Gedung A Ruang 201"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Alamat (Opsional) 
                    {isGeocoding && <span className="text-xs text-indigo-500 animate-pulse">(Mencari koordinat...)</span>}
                  </Label>
                  <textarea 
                    rows={2} value={formData.address} onChange={handleAddressChange}
                    placeholder="Ketik alamat (misal: Undiksha Singaraja)..."
                    className="flex w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-indigo-600 dark:focus:ring-offset-zinc-900 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input 
                      type="number" step="any" required value={formData.latitude} onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input 
                      type="number" step="any" required value={formData.longitude} onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Radius (Meter)</Label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" min="10" max="1000" step="10" value={formData.radius} onChange={e => setFormData({...formData, radius: parseInt(e.target.value)})}
                      className="flex-1 accent-indigo-600"
                    />
                    <span className="font-mono text-sm bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-1 rounded w-16 text-center text-slate-800 dark:text-zinc-200">
                      {formData.radius}m
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>IP/WiFi yang Diizinkan (Pisahkan dengan koma)</Label>
                  <Input 
                    type="text" value={formData.wifi_bssid} onChange={e => setFormData({...formData, wifi_bssid: e.target.value})}
                    placeholder="192.168.1.1, 10.0.0.0/24"
                  />
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Kosongkan jika tidak ada batasan IP</p>
                </div>
              </div>
              
              <div className="md:w-1/2 flex flex-col h-64 md:h-[400px]">
                <div className="bg-slate-100 dark:bg-zinc-900 flex-1 relative z-0 min-h-[300px]">
                  <MapContainer 
                    center={mapCenter} 
                    zoom={16} 
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[formData.latitude, formData.longitude]} />
                    <Circle 
                      center={[formData.latitude, formData.longitude]} 
                      radius={formData.radius} 
                      pathOptions={{ color: 'indigo', fillColor: 'indigo', fillOpacity: 0.2 }}
                    />
                    <MapEvents />
                  </MapContainer>

                  {/* Geolocation Button overlay */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGetMyLocation}
                    disabled={isLocating}
                    className="absolute top-4 right-4 z-[1000] shadow-lg rounded-xl"
                    title="Deteksi Lokasi Saya"
                  >
                    <LocateFixed className={`w-5 h-5 ${isLocating ? 'animate-pulse text-indigo-500' : ''}`} />
                  </Button>

                  <div className="absolute bottom-2 left-2 right-2 z-[1000] pointer-events-none">
                    <div className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur text-xs px-3 py-2 rounded shadow border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 pointer-events-auto">
                      Klik pada peta untuk mengubah koordinat secara otomatis.
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">
                    Simpan Lokasi
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}