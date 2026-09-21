import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { flushSync } from 'react-dom';
import api from '@/services/api';
import { Plus, Edit2, Trash2, Search, MapPin, LocateFixed } from 'lucide-react';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AdminPageShell from '@/components/AdminPageShell';
import type { Location } from '@/types/location';
import { fixLeafletDefaultIcons } from '@/lib/media/leafletIcon';
import { useAuthStore } from '@/stores/authStore';
import { toastErrorMessage } from '@/lib/utils/toastMessage';
import { useMutationToast } from '@/hooks/useMutationToast';
import { LastSavedIndicator } from '@/components/admin/LastSavedIndicator';
import { useFormDirtyGuard } from '@/hooks/useFormDirtyGuard';
// ── Leaflet systemic hardening (shared pattern) ──────────────────────────
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
        // @ts-expect-error — same internal expando reason
        if (node._leaflet_events !== undefined) delete node._leaflet_events;
        // @ts-expect-error — same internal expando reason
        if (node._leaflet_tile_loaded !== undefined) delete node._leaflet_tile_loaded;
      } catch {
        /* defensive — older engines can throw on delete of non-configurable */
      }
    }
    node = walker.nextNode();
  }
}

/** Safe Leaflet panel sanitizer — **never wipes innerHTML**, and MUST NEVER
 *  sweep global L registries when a MapContainer is still mounted in the DOM.
 *  The global `pruneLeafletGlobals` helper deletes entries from `window.L.*`
 *  caches that the LIVE map instance still needs. Calling it during a normal
 *  form update caused the same production crash that hit Attend page:
 *    "Map container is being reused by another instance at e.remove"
 *    bubbled all the way to the route-level error boundary.
 *
 *  This local helper therefore ONLY strips per-DOM-node expandos
 *  (`_leaflet_id`, `_leaflet_events`, `_leaflet_tile_loaded`) via the local
 *  TreeWalker helper. Global registry cleanup is reserved EXCLUSIVELY for the
 *  MapSelfHealingBoundary error-recovery code path and the unmount effect
 *  (both of which are guaranteed to run AFTER the old <MapContainer> has
 *  been fully torn down from the DOM).
 */
function pruneLeafletPanel(root: HTMLElement | null) {
  if (!root) return;
  stripLeafletDomSignatures(root);
}

const MapContainer = lazy(() => import('react-leaflet').then((m) => ({ default: m.MapContainer })));
const TileLayer = lazy(() => import('react-leaflet').then((m) => ({ default: m.TileLayer })));
const Marker = lazy(() => import('react-leaflet').then((m) => ({ default: m.Marker })));
const Circle = lazy(() => import('react-leaflet').then((m) => ({ default: m.Circle })));
import { useMapEvents } from 'react-leaflet';

// ── Self-healing error boundary for Leaflet ────────────────────────────────
// Final safety net: IF Leaflet ever throws during render (e.g. "already
// initialized", "being reused"), this boundary catches it, renders a short
// "loading…" placeholder, then forces a key-change remount ONCE via the callback.
// This guarantees the user never sees a route-level error boundary (the
// "Konten mengalami kendala" card with the retry buttons anymore) for map
// issues.
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
  // remount sequence below. Leave all state transitions to componentDidCatch.
  static getDerivedStateFromError(
    _: unknown,
    state: MapSelfHealingBoundaryState
  ): MapSelfHealingBoundaryState {
    return state;
  }

  componentDidCatch(error: any) {
    // Only remap the specific map errors — ignore other unrelated errors
    // to the parent boundary that should bubble up to the route boundary.
    const msg: string = String(error?.message ?? '');
    if (/Map container (is already initialized|is being reused)/i.test(msg)) {
      // ── STEP 1 ──────────────────────────────────────────────────────────
      // Force a SYNCHRONOUS React commit that swaps the tree to the skeleton
      // panel. This unmounts <MapContainer> right now, which triggers React-
      // leaflet's native L.Map.remove() + our cleanup effect that calls
      // pruneLeafletPanel (strip _leaflet_id expandos). Without flushSync
      // here React would batch this update together with step 3 and the old
      // map instance would still be attached to the DOM when the new one
      // tries to initialize.
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

            // ── STEP 3 ──────────────────────────────────────────────────
            // Now ask the parent to regenerate its `mapInstanceKey` random
            // UUID then flip hasError off synchronously so React builds a
            // FRESH <MapContainer> subtree into a truly clean container.
            flushSync(() => {
              this.props.onRemount();
              this.setState({ hasError: false });
            });
          });
        });
      }, 120);
    } else {
      // Re-throw non-Leaflet-initialization errors up the chain.
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

  // Lazy-load Leaflet only when the user opens the form dialog, then apply
  // the default icon fix. Guard with the SAME __attendLeafletIconsInstalled__
  // window flag used by AttendLocationMap so StrictMode double-mount and
  // HMR re-evaluation never re-patch L.Icon.Default.prototype more than once.
  useEffect(() => {
    let cancelled = false;
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(() => {
      if (cancelled) return;
      const w = window as any;
      if (!w.__attendLeafletIconsInstalled__) {
        w.__attendLeafletIconsInstalled__ = true;
        fixLeafletDefaultIcons();
      }
      setLeafletLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Delete Confirmation Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [formBaseline, setFormBaseline] = useState<string>('');

  // Custom Map hook state to force re-render map center
  const [mapCenter, setMapCenter] = useState<[number, number]>([-8.11475, 115.08865]);
  const [isLocating, setIsLocating] = useState(false);

  // Bumped every time the modal opens so MapContainer always gets a brand-new
  // key. Prevents "Map container is already initialized" errors from Leaflet
  // when the dialog is closed and reopened (for the same location, or for a
  // new location) faster than the previous map instance can be torn down.
  // Uses crypto.randomUUID() — identity is globally unique across mounts.
  const [mapInstanceKey, setMapInstanceKey] = useState<string>(() => crypto.randomUUID());
  // Holds the map panel wrapper DOM so we can strip Leaflet's custom DOM
  // expandos (`_leaflet_id` etc.) before every fresh mount.
  const mapPanelRef = React.useRef<HTMLDivElement | null>(null);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  // ONLY HERE, AFTER React reconciler has confirmed the full component tree
  // (including its lazy <MapContainer>) is being torn down, do we call the
  // global Leaflet registry sweep. This is the ONLY normal-lifecycle call
  // site that touches window.pruneLeafletGlobals; all others are gated
  // inside MapSelfHealingBoundary.componentDidCatch (which similarly waits
  // for flushSync unmount commit before sweeping).
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

  // Pre-mount strip: every time the mapInstanceKey changes (fresh mount
  // attempt after error / dialog close/reopen), strip residual Leaflet DOM
  // expandos BEFORE React commits the new MapContainer. Deliberately a
  // LIGHTWEIGHT operation — we never sweep window.L.* registries here,
  // doing so would wipe the caches of a concurrently-mounted map instance
  // and produce the "being reused by another instance" crash.
  useEffect(() => {
    pruneLeafletPanel(mapPanelRef.current);
    // Depends on mapInstanceKey only — run once per remount cycle.
  }, [mapInstanceKey]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: -8.11475,
    longitude: 115.08865,
    radius: 100,
    wifi_bssid: '',
  });
  const [dirty, setDirty] = useState(false);
  const { confirmIfDirty } = useFormDirtyGuard(dirty);

  const setFormDataDirty = useMemo(
    () => (updater: React.SetStateAction<typeof formData>) => {
      setDirty(true);
      setFormData(updater);
    },
    []
  );

  const [isGeocoding, setIsGeocoding] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetcher = (url: string) => api.get(url).then((res) => res.data.data);
  const swr = useSWR<Location[]>('/locations', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
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
      onSuccess: () => setLastSavedAt(new Date()),
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

  const handleOpenModal = async (location: Location | null = null) => {
    if (isModalOpen) {
      const ok = await confirmIfDirty();
      if (!ok) return;
    }
    if (location) {
      if (!canManageLocation(location)) {
        toast.error('Lokasi ini hanya bisa dikelola oleh pembuatnya (Super Admin).');
        return;
      }
      const initial = {
        name: location.name,
        address: location.address || '',
        latitude: location.latitude,
        longitude: location.longitude,
        radius: location.radius,
        wifi_bssid: location.wifi_bssid.join(', '),
      };
      setEditingLocation(location);
      setMapCenter([location.latitude, location.longitude]);
      setFormData(initial);
      setFormBaseline(JSON.stringify(initial));
    } else {
      const initial = {
        name: '',
        address: '',
        latitude: -8.11475,
        longitude: 115.08865,
        radius: 100,
        wifi_bssid: '',
      };
      setEditingLocation(null);
      // Center map to Undiksha coordinate by default
      setMapCenter([-8.11475, 115.08865]);
      setFormData(initial);
      setFormBaseline(JSON.stringify(initial));
    }
    setDirty(false);
    setLastSavedAt(null);
    // ── Robust Leaflet re-init sequence ────────────────────────────────
    // 0) Nuke every `_leaflet_id` / internal expando from the map panel
    //    DOM subtree. Leaflet throws "Map container is already initialized"
    //    when it sees a node with this signature already on it.
    stripLeafletDomSignatures(mapPanelRef.current);
    // 1) Close the dialog first so React can fully flush the unmount of the
    //    old MapContainer (and its DOM div). We then wait **two animation
    //    frames** (~32 ms) instead of a microtask — this guarantees the
    //    browser's layout engine has finished detaching the previous DOM
    //    node (including React-leaflet's native `remove()` on unmount).
    //    Using a microtask caused double-cleanup races under React
    //    StrictMode, leading to the brand-new "being reused by another
    //    instance" Leaflet 1.9 error.
    setIsModalOpen(false);
    window.setTimeout(() => {
      setMapInstanceKey(crypto.randomUUID());
      setIsModalOpen(true);
    }, 32);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const result = await doSaveLocation();
      if (result !== undefined) {
        setDirty(false);
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
        setFormDataDirty({
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
    setFormDataDirty({ ...formData, address: value });

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
            setFormDataDirty((prev) => ({
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

  const formIsDirty = JSON.stringify(formData) !== formBaseline;

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
                  aria-label="Cari lokasi absensi"
                />
              </div>
              <Select value={wifiFilter} onValueChange={setWifiFilter}>
                <SelectTrigger
                  className="w-full sm:w-[200px]"
                  aria-label="Filter batasan WiFi lokasi"
                >
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
                  <li key={i} className="rounded-2xl border border-border p-4">
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
        <Dialog
          open={isModalOpen}
          onOpenChange={async (open) => {
            if (!open) {
              const ok = await confirmIfDirty();
              if (!ok) return;
            }
            setIsModalOpen(open);
          }}
        >
          <DialogContent className="max-w-4xl p-0">
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-foreground">
                    {editingLocation ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}
                  </DialogTitle>
                  <DialogDescription className="sr-only">Form lokasi geofencing</DialogDescription>
                </DialogHeader>
                <LastSavedIndicator
                  lastSavedAt={lastSavedAt}
                  isDirty={formIsDirty}
                  isSaving={saving}
                />
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col overflow-hidden md:flex-row md:items-stretch"
            >
              <div className="relative z-10 shrink-0 space-y-4 overflow-y-auto border-r border-border bg-card p-6 md:w-1/2 md:max-h-[min(72vh,680px)]">
                <FormField id="location-name" label="Nama Lokasi" required>
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormDataDirty({ ...formData, name: e.target.value })}
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
                          setFormDataDirty({ ...formData, latitude: parseFloat(e.target.value) })
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
                          setFormDataDirty({ ...formData, longitude: parseFloat(e.target.value) })
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
                          setFormDataDirty({
                            ...formData,
                            radius: parseInt(e.target.value, 10) || 100,
                          })
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
                      onChange={(e) =>
                        setFormDataDirty({ ...formData, wifi_bssid: e.target.value })
                      }
                      placeholder="192.168.1.1, 10.0.0.0/24"
                      className="font-mono"
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
              </div>

              <div className="flex min-h-[360px] flex-1 flex-col md:w-1/2">
                <div
                  ref={mapPanelRef}
                  id={`locations-map-panel-${mapInstanceKey}`}
                  className="location-map-panel relative isolate z-0 min-h-[320px] flex-1 overflow-hidden bg-slate-100 bg-background md:min-h-[480px]"
                >
                  {isModalOpen && leafletLoaded ? (
                    <MapSelfHealingBoundary
                      key={mapInstanceKey}
                      onRemount={() => setMapInstanceKey(crypto.randomUUID())}
                    >
                      <Suspense
                        fallback={
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <span className="text-sm text-muted-foreground">Memuat peta…</span>
                          </div>
                        }
                      >
                        <MapContainer
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
                    </MapSelfHealingBoundary>
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
                    onClick={async () => {
                      const ok = await confirmIfDirty();
                      if (!ok) return;
                      setIsModalOpen(false);
                    }}
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
                    className={
                      formIsDirty
                        ? 'ring-2 ring-offset-2 ring-sky-500/70 focus-visible:outline-none dark:ring-offset-slate-900'
                        : undefined
                    }
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
