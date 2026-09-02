import React, { useState, useEffect, lazy, Suspense } from 'react';
import api from '@/services/api';
import { Plus, Edit2, Trash2, Search, X, MapPin, LocateFixed } from 'lucide-react';
import { toast } from 'sonner';
import { MapResizeOnOpen } from '@/components/MapResizeOnOpen';
import useSWR from 'swr';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { useClientPagination } from '@/hooks/useClientPagination';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { SlowLoadingHint } from '@/components/admin/SlowLoadingHint';
import { TablePagination } from '@/components/ui/TablePagination';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmModal } from '@/components/ConfirmModal';
import ActionLoadingOverlay from '@/components/ActionLoadingOverlay';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AdminPageShell from '@/components/AdminPageShell';
import type { Location } from '@/types/location';
import { fixLeafletDefaultIcons } from '@/lib/media/leafletIcon';
import { useAuthStore } from '@/stores/authStore';
import { toastErrorMessage } from '@/lib/utils/toastMessage';
import { useMutationToast } from '@/hooks/useMutationToast';

const MapContainer = lazy(() => import('react-leaflet').then((m) => ({ default: m.MapContainer })));
const TileLayer = lazy(() => import('react-leaflet').then((m) => ({ default: m.TileLayer })));
const Marker = lazy(() => import('react-leaflet').then((m) => ({ default: m.Marker })));
const Circle = lazy(() => import('react-leaflet').then((m) => ({ default: m.Circle })));
import { useMapEvents } from 'react-leaflet';

interface MapEventsProps {
  formData: {
    latitude: number;
    longitude: number;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      radius: number;
      wifi_bssid: string;
    }>
  >;
}

const MapEvents: React.FC<MapEventsProps> = ({ formData, setFormData }) => {
  const map = useMapEvents({
    click(e) {
      setFormData((prev) => ({
        ...prev,
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      }));
    },
  });

  useEffect(() => {
    map.setView([formData.latitude, formData.longitude], map.getZoom(), {
      animate: true,
      duration: 1,
    });
  }, [formData.latitude, formData.longitude, map]);

  return null;
};

export default function Locations() {
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const [searchTerm, setSearchTerm] = useState('');
  const [wifiFilter, setWifiFilter] = useState('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  useEffect(() => {
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(() => {
      fixLeafletDefaultIcons();
      setLeafletLoaded(true);
    });
  }, []);

  // Delete Confirmation Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Custom Map hook state to force re-render map center
  const [mapCenter, setMapCenter] = useState<[number, number]>([-8.11475, 115.08865]);
  const [isLocating, setIsLocating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: -8.11475,
    longitude: 115.08865,
    radius: 100,
    wifi_bssid: '',
  });

  const [isGeocoding, setIsGeocoding] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetcher = (url: string) => api.get(url).then((res) => res.data.data);
  const swr = useSWR<Location[]>('/locations', fetcher, { revalidateOnFocus: false });
  const {
    data: locations = [],
    isPending: loading,
    isError,
    showSlowLoadingHint,
    retry,
    mutate,
  } = useSwrPageState(swr);

  const hasFilters = Boolean(searchTerm.trim()) || wifiFilter !== 'ALL';

  const doSaveLocation = useMutationToast(
    async () => {
      const payload = {
        ...formData,
        wifi_bssid: formData.wifi_bssid.split(',').flatMap((ip) => {
          const result = ip.trim();
          return result ? [result] : [];
        }),
      };
      if (editingLocation) {
        return api.put(`/locations/${editingLocation.id}`, payload);
      }
      return api.post('/locations', payload);
    },
    {
      successMsg: editingLocation ? 'Lokasi berhasil diperbarui' : 'Lokasi berhasil ditambahkan',
      errorMsg: (err) => toastErrorMessage(err, 'Terjadi kesalahan'),
    }
  );

  const doDeleteLocation = useMutationToast(() => api.delete(`/locations/${locationToDelete}`), {
    successMsg: 'Lokasi berhasil dihapus',
    errorMsg: (err) => toastErrorMessage(err, 'Gagal menghapus lokasi'),
  });

  const canManageLocation = (loc: Location): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    if (currentUser.role === 'ADMIN')
      return Boolean(loc.created_by && loc.created_by === currentUser.id);
    return false;
  };

  const handleOpenModal = (location: Location | null = null) => {
    if (location) {
      if (!canManageLocation(location)) {
        toast.error('Lokasi ini hanya bisa dikelola oleh pembuatnya (Super Admin).');
        return;
      }
      setEditingLocation(location);
      setMapCenter([location.latitude, location.longitude]);
      setFormData({
        name: location.name,
        address: location.address || '',
        latitude: location.latitude,
        longitude: location.longitude,
        radius: location.radius,
        wifi_bssid: location.wifi_bssid.join(', '),
      });
    } else {
      setEditingLocation(null);
      // Center map to Undiksha coordinate by default
      setMapCenter([-8.11475, 115.08865]);
      setFormData({
        name: '',
        address: '',
        latitude: -8.11475,
        longitude: 115.08865,
        radius: 100,
        wifi_bssid: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const result = await doSaveLocation();
      if (result !== undefined) {
        setIsModalOpen(false);
        mutate();
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (location: Location) => {
    if (!canManageLocation(location)) {
      toast.error('Lokasi ini hanya bisa dikelola oleh pembuatnya (Super Admin).');
      return;
    }
    setLocationToDelete(location.id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!locationToDelete || deleting) return;
    setDeleting(true);
    try {
      const result = await doDeleteLocation();
      if (result !== undefined) {
        setIsDeleteModalOpen(false);
        setLocationToDelete(null);
        mutate();
      }
    } finally {
      setDeleting(false);
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
          longitude: lng,
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
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=1`
          );
          const data = await response.json();

          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            setFormData((prev) => ({
              ...prev,
              latitude: lat,
              longitude: lon,
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

  const filteredLocations = locations.filter((l) => {
    const matchSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.address && l.address.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchSearch) return false;

    if (wifiFilter === 'RESTRICTED') return l.wifi_bssid && l.wifi_bssid.length > 0;
    if (wifiFilter === 'UNRESTRICTED') return !l.wifi_bssid || l.wifi_bssid.length === 0;
    return true;
  });

  const {
    paginatedItems: paginatedLocations,
    meta: locationsPaginationMeta,
    setPage: setLocationsPage,
  } = useClientPagination(filteredLocations, {
    pageSize: 20,
    resetDeps: [searchTerm, wifiFilter],
  });

  const actionOverlayLabel = saving
    ? editingLocation
      ? 'Menyimpan perubahan lokasi…'
      : 'Menambah lokasi…'
    : deleting
      ? 'Menghapus lokasi…'
      : null;

  return (
    <>
      <ActionLoadingOverlay show={!!actionOverlayLabel} label={actionOverlayLabel ?? ''} />
      <AdminPageShell
        title="Manajemen Lokasi"
        description="Atur geofencing dan batasan WiFi untuk absensi."
        variant="plain"
        icon={<MapPin className="size-5" />}
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus className="size-4 mr-2" />
            Tambah Lokasi
          </Button>
        }
      >
        {isError ? (
          <ErrorWithRetry title="Gagal memuat lokasi" error={swr.error} onRetry={retry} />
        ) : showSlowLoadingHint ? (
          <SlowLoadingHint onRetry={retry} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
            <div className="flex flex-col gap-5 border-b border-border p-5 sm:flex-row">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
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

            <ul className="space-y-3 p-5 md:hidden" aria-label="Daftar lokasi">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="rounded-2xl border border-border p-4 border-border">
                    <Skeleton className="mb-2 h-5 w-40" />
                    <Skeleton className="h-4 w-full" />
                  </li>
                ))
              ) : filteredLocations.length === 0 ? (
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
              ) : (
                paginatedLocations.map((loc) => (
                  <li key={loc.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start gap-2">
                      <MapPin size={18} className="mt-0.5 shrink-0 text-indigo-500" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground">{loc.name}</p>
                          {!canManageLocation(loc) && currentUser?.role === 'ADMIN' ? (
                            <Badge variant="secondary">Global</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {loc.address || 'Tanpa alamat'}
                        </p>
                        <p className="mt-2 font-mono text-xs text-muted-foreground">
                          {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)} · {loc.radius} m
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          WiFi/IP:{' '}
                          {loc.wifi_bssid.length > 0
                            ? `${loc.wifi_bssid.length} aturan`
                            : 'Tanpa batasan'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        className="min-h-11 flex-1"
                        onClick={() => handleOpenModal(loc)}
                        disabled={!canManageLocation(loc)}
                      >
                        <Edit2 className="mr-2 size-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-11 flex-1 text-red-600 hover:text-red-700"
                        onClick={() => openDeleteConfirm(loc)}
                        disabled={!canManageLocation(loc)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Hapus
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/50 [&_tr]:border-b">
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
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
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
                    paginatedLocations.map((loc) => (
                      <TableRow key={loc.id}>
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-indigo-500" />
                            {loc.name}
                            {!canManageLocation(loc) && currentUser?.role === 'ADMIN' ? (
                              <Badge variant="secondary">Global</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell
                          className="text-muted-foreground dark:text-zinc-300 max-w-xs truncate"
                          title={loc.address || ''}
                        >
                          {loc.address || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground dark:text-zinc-300 font-mono text-sm">
                          {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                        </TableCell>
                        <TableCell className="text-muted-foreground dark:text-zinc-300">
                          {loc.radius} meter
                        </TableCell>
                        <TableCell className="text-muted-foreground dark:text-zinc-300">
                          {loc.wifi_bssid.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {loc.wifi_bssid.map((ip, i) => (
                                <span
                                  key={i}
                                  className="bg-muted border border-border px-2 py-0.5 rounded text-xs"
                                >
                                  {ip}
                                </span>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenModal(loc)}
                              className="text-muted-foreground hover:text-brand hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-indigo-900/30"
                              title="Edit"
                              disabled={!canManageLocation(loc)}
                            >
                              <Edit2 className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteConfirm(loc)}
                              className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-red-900/30"
                              title="Hapus"
                              disabled={!canManageLocation(loc)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              meta={locationsPaginationMeta}
              onPageChange={setLocationsPage}
              itemLabel="lokasi"
            />
          </div>
        )}

        {/* Modal Form */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl p-0">
            <div className="border-b border-border px-6 py-4 border-border">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-foreground">
                  {editingLocation ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}
                </DialogTitle>
                <DialogDescription className="sr-only">Form lokasi geofencing</DialogDescription>
              </DialogHeader>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col overflow-hidden md:flex-row md:items-stretch"
            >
              <div className="relative z-10 shrink-0 space-y-4 overflow-y-auto border-r border-border border-r border-border bg-card p-6 md:w-1/2 md:max-h-[min(72vh,680px)]">
                <FormField id="location-name" label="Nama Lokasi" required>
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Gedung A Ruang 201"
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField
                  id="location-address"
                  label={
                    <>
                      Alamat
                      {isGeocoding && (
                        <span className="ml-2 text-xs text-indigo-500 animate-pulse">
                          (Mencari koordinat...)
                        </span>
                      )}
                    </>
                  }
                  required
                >
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Textarea
                      id={id}
                      rows={2}
                      required
                      value={formData.address}
                      onChange={handleAddressChange}
                      placeholder="Ketik alamat (misal: Undiksha Singaraja)..."
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="location-latitude" label="Latitude" required>
                    {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                      <Input
                        id={id}
                        type="number"
                        step="any"
                        required
                        value={formData.latitude}
                        onChange={(e) =>
                          setFormData({ ...formData, latitude: parseFloat(e.target.value) })
                        }
                        aria-describedby={ariaDescribedBy}
                        aria-invalid={ariaInvalid}
                      />
                    )}
                  </FormField>
                  <FormField id="location-longitude" label="Longitude" required>
                    {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                      <Input
                        id={id}
                        type="number"
                        step="any"
                        required
                        value={formData.longitude}
                        onChange={(e) =>
                          setFormData({ ...formData, longitude: parseFloat(e.target.value) })
                        }
                        aria-describedby={ariaDescribedBy}
                        aria-invalid={ariaInvalid}
                      />
                    )}
                  </FormField>
                </div>
                <FormField id="location-radius" label="Radius (Meter)" required>
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <div className="flex items-center gap-4">
                      <input
                        id={id}
                        type="range"
                        min="10"
                        max="1000"
                        step="10"
                        value={formData.radius}
                        onChange={(e) =>
                          setFormData({ ...formData, radius: parseInt(e.target.value) })
                        }
                        className="flex-1 accent-indigo-600"
                        aria-label="Radius lokasi dalam meter"
                        aria-describedby={ariaDescribedBy}
                        aria-invalid={ariaInvalid}
                      />
                      <span className="w-16 rounded border border-border bg-muted px-2 py-1 text-center font-mono text-sm text-foreground">
                        {formData.radius}m
                      </span>
                    </div>
                  )}
                </FormField>
                <FormField
                  id="location-wifi"
                  label="IP/WiFi yang Diizinkan (Pisahkan dengan koma)"
                  description="Kosongkan jika tidak ada batasan IP"
                >
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      type="text"
                      value={formData.wifi_bssid}
                      onChange={(e) => setFormData({ ...formData, wifi_bssid: e.target.value })}
                      placeholder="192.168.1.1, 10.0.0.0/24"
                      className="font-mono"
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
              </div>

              <div className="flex min-h-[360px] flex-1 flex-col md:w-1/2">
                <div className="location-map-panel relative isolate z-0 min-h-[320px] flex-1 overflow-hidden bg-slate-100 bg-background md:min-h-[480px]">
                  {isModalOpen && leafletLoaded ? (
                    <Suspense
                      fallback={
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                          <span className="text-sm text-muted-foreground">Memuat peta…</span>
                        </div>
                      }
                    >
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
                        <MapEvents formData={formData} setFormData={setFormData} />
                        <MapResizeOnOpen when={isModalOpen} />
                      </MapContainer>
                    </Suspense>
                  ) : isModalOpen ? (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <span className="text-sm text-muted-foreground">Memuat peta…</span>
                    </div>
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
                    aria-label="Deteksi lokasi saya"
                  >
                    <LocateFixed
                      className={`w-5 h-5 ${isLocating ? 'animate-pulse text-indigo-500' : ''}`}
                    />
                  </Button>

                  <div className="absolute bottom-2 left-2 right-2 z-[1000] pointer-events-none">
                    <div className="pointer-events-auto rounded bg-card/95 px-3 py-2 text-xs text-foreground shadow backdrop-blur">
                      Klik pada peta untuk mengubah koordinat secara otomatis.
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 justify-end gap-3 p-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={saving}
                  >
                    Batal
                  </Button>
                  <SubmitButton
                    type="submit"
                    disabled={saving}
                    isLoading={saving}
                    label="Simpan Lokasi"
                    loadingLabel="Menyimpan…"
                  />
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
          loading={deleting}
          loadingText="Menghapus…"
        />
      </AdminPageShell>
    </>
  );
}
