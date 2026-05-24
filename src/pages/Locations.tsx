import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { Plus, Edit2, Trash2, Search, X, MapPin, LocateFixed } from 'lucide-react';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapResizeOnOpen } from '@/components/MapResizeOnOpen';
import useSWR from 'swr';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { MobileTableHint } from '@/components/ui/MobileTableHint';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdminPageShell from '@/components/AdminPageShell';
import type { Location } from '@/types/location';
import { fixLeafletDefaultIcons } from '@/lib/leafletIcon';

fixLeafletDefaultIcons();

export default function Locations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [wifiFilter, setWifiFilter] = useState('ALL');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Delete Confirmation Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);
  
  // Custom Map hook state to force re-render map center
  const [mapCenter, setMapCenter] = useState<[number, number]>([-8.11475, 115.08865]);
  const [isLocating, setIsLocating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '', address: '', latitude: -8.11475, longitude: 115.08865, radius: 100, wifi_bssid: ''
  });

  const [isGeocoding, setIsGeocoding] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetcher = (url: string) => api.get(url).then(res => res.data.data);
  const swr = useSWR<Location[]>('/locations', fetcher, { revalidateOnFocus: false });
  const { data: locations = [], isInitialLoading: loading, isError, retry, mutate } = useSwrPageState(swr);

  const hasFilters = Boolean(searchTerm.trim()) || wifiFilter !== 'ALL';

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
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  const openDeleteConfirm = (id: string) => {
    setLocationToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!locationToDelete) return;
    try {
      await api.delete(`/locations/${locationToDelete}`);
      toast.success('Lokasi berhasil dihapus');
      setIsDeleteModalOpen(false);
      setLocationToDelete(null);
      mutate();
    } catch (error) {
      toast.error('Gagal menghapus lokasi');
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

  const filteredLocations = locations.filter(l => {
    const matchSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (l.address && l.address.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchSearch) return false;
    
    if (wifiFilter === 'RESTRICTED') return l.wifi_bssid && l.wifi_bssid.length > 0;
    if (wifiFilter === 'UNRESTRICTED') return !l.wifi_bssid || l.wifi_bssid.length === 0;
    return true;
  });

  return (
    <AdminPageShell
      title="Manajemen Lokasi"
      description="Atur geofencing dan batasan WiFi untuk absensi."
      variant="plain"
      icon={<MapPin className="h-5 w-5" />}
      actions={
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Lokasi
        </Button>
      }
    >
      {isError ? (
        <ErrorWithRetry title="Gagal memuat lokasi" error={swr.error} onRetry={retry} />
      ) : (
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              type="text" 
              placeholder="Cari nama lokasi atau alamat..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={wifiFilter} onValueChange={setWifiFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Semua Batasan WiFi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Batasan WiFi</SelectItem>
              <SelectItem value="RESTRICTED">Ada Batasan WiFi</SelectItem>
              <SelectItem value="UNRESTRICTED">Tanpa Batasan WiFi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ul className="space-y-3 p-4 md:hidden" aria-label="Daftar lokasi">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-800">
                  <Skeleton className="mb-2 h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                </li>
              ))
            : filteredLocations.length === 0 ? (
                <li>
                  <AdminEmptyState
                    compact
                    icon={MapPin}
                    title={hasFilters ? 'Tidak ada hasil' : 'Belum ada lokasi'}
                    description={
                      hasFilters
                        ? 'Ubah kata kunci atau filter WiFi.'
                        : 'Tambahkan lokasi geofencing untuk sesi absensi.'
                    }
                  />
                </li>
              )
            : filteredLocations.map((loc) => (
                <li key={loc.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-start gap-2">
                    <MapPin size={18} className="mt-0.5 shrink-0 text-indigo-500" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-white">{loc.name}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">{loc.address || 'Tanpa alamat'}</p>
                      <p className="mt-2 font-mono text-xs text-slate-500">
                        {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)} · {loc.radius} m
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        WiFi/IP: {loc.wifi_bssid.length > 0 ? `${loc.wifi_bssid.length} aturan` : 'Tanpa batasan'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="min-h-11 flex-1" onClick={() => handleOpenModal(loc)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11 flex-1 text-red-600 hover:text-red-700"
                      onClick={() => openDeleteConfirm(loc.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Hapus
                    </Button>
                  </div>
                </li>
              ))}
        </ul>

        <MobileTableHint />
        <div className="hidden overflow-x-auto md:block">
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
                  <TableCell colSpan={6} className="p-0">
                    <AdminEmptyState
                      compact
                      icon={MapPin}
                      title={hasFilters ? 'Tidak ada hasil' : 'Belum ada lokasi'}
                      description={
                        hasFilters
                          ? 'Ubah kata kunci atau filter WiFi.'
                          : 'Tambahkan lokasi geofencing untuk sesi absensi.'
                      }
                      className="border-0 shadow-none"
                    />
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
                          onClick={() => openDeleteConfirm(loc.id)}
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
      )}

      {/* Modal Form */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl p-0">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800 dark:text-white">
                {editingLocation ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}
              </DialogTitle>
              <DialogDescription className="sr-only">Form lokasi geofencing</DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden md:flex-row md:items-stretch">
              <div className="relative z-10 shrink-0 space-y-4 overflow-y-auto border-r border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 md:w-1/2 md:max-h-[min(72vh,680px)]">
                <div className="space-y-2">
                  <Label>Nama Lokasi <span className="text-red-500">*</span></Label>
                  <Input 
                    type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Gedung A Ruang 201"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Alamat <span className="text-red-500">*</span>
                    {isGeocoding && <span className="text-xs text-indigo-500 animate-pulse">(Mencari koordinat...)</span>}
                  </Label>
                  <Textarea 
                    rows={2} required value={formData.address} onChange={handleAddressChange}
                    placeholder="Ketik alamat (misal: Undiksha Singaraja)..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latitude <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      step="any"
                      required
                      value={formData.latitude}
                      onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      step="any"
                      required
                      value={formData.longitude}
                      onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Radius (Meter) <span className="text-red-500">*</span></Label>
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
                    className="font-mono"
                  />
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Kosongkan jika tidak ada batasan IP</p>
                </div>
              </div>
              
              <div className="flex min-h-[360px] flex-1 flex-col md:w-1/2">
                <div className="location-map-panel relative isolate z-0 min-h-[320px] flex-1 overflow-hidden bg-slate-100 dark:bg-zinc-900 md:min-h-[480px]">
                  {isModalOpen ? (
                  <MapContainer 
                    key={editingLocation?.id ?? 'new-location'}
                    center={mapCenter} 
                    zoom={16} 
                    style={{ height: '100%', width: '100%', minHeight: 320 }}
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
                    <MapResizeOnOpen when={isModalOpen} />
                  </MapContainer>
                  ) : null}

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
                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 p-5 dark:border-zinc-800">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">
                    Simpan Lokasi
                  </Button>
                </div>
              </div>
            </form>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Konfirmasi Hapus Lokasi"
        description="Apakah Anda yakin ingin menghapus lokasi ini? Data yang dihapus tidak dapat dikembalikan."
        confirmText="Ya, Hapus Lokasi"
        variant="danger"
      />
    </AdminPageShell>
  );
}
