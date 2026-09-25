import api from '@/services/api';
import type {
  PublicGalleryAlbum,
  PublicProfile,
  PublicProgram,
  PublicRecruitment,
} from '@/types/publicSite';
import type {
  PublicHomePayload,
  PublicPostItemsResponse,
  PublicStructureResponse,
} from '@/types/api';
import { useMockOrSwr } from '@/hooks/useMockOrSwr';
import {
  mockGalleries,
  mockPostsBeritaLatestPage1,
  mockPostsLombaPage1,
  mockProfile,
  mockPrograms,
  mockRecruitments,
  mockStructure,
} from '@/lib/utils/mockLandingData';

const emptyPosts = (pageSize: number): PublicPostItemsResponse => ({
  items: [],
  total: 0,
  page: 1,
  pageSize,
  totalPages: 1,
});

const emptyStructure: PublicStructureResponse = {
  data: [],
  cabinet: null,
  allCabinets: [],
};

const mockHome: PublicHomePayload = {
  profile: mockProfile,
  programs: mockPrograms,
  structure: mockStructure as PublicStructureResponse,
  latest: mockPostsBeritaLatestPage1,
  lomba: mockPostsLombaPage1,
  galleries: mockGalleries,
  recruitments: mockRecruitments,
};

const homeFetcher = (url: string) =>
  api.get(url).then((r) => {
    if (r.data && typeof r.data === 'object' && r.data.success === false) {
      throw new Error(r.data.error || 'Request failed');
    }
    return r.data.data as PublicHomePayload;
  });

type Slice<T> = {
  data: T | undefined;
  isPending: boolean;
  error: unknown;
  isError: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isEmpty: boolean;
  isSlowLoading: boolean;
  showSlowLoadingHint: boolean;
  mutate: any;
  retry: () => void;
  swr: any;
};

function slice<T>(home: Slice<PublicHomePayload>, value: T | undefined): Slice<T> {
  return { ...home, data: value };
}

/** Data fetching beranda publik — satu GET /public-site/home (satu koneksi pooler). */
export function usePublicHomeData(opts?: { cabinetId?: string | null }) {
  const cabinetId = opts?.cabinetId?.trim() || '';
  const swrKey = `/public-site/home${cabinetId ? `?cabinetId=${encodeURIComponent(cabinetId)}` : ''}`;

  const home = useMockOrSwr<PublicHomePayload>({
    swrKey,
    fetcher: homeFetcher,
    swrConfig: {
      errorRetryCount: 2,
      errorRetryInterval: 1500,
      dedupingInterval: 10_000,
      keepPreviousData: true,
    },
    mockStatic: mockHome,
  });

  const payload = home.data;

  return {
    profile: slice<PublicProfile | null>(home, payload ? payload.profile : undefined),
    programs: slice<PublicProgram[]>(home, payload?.programs),
    structure: slice<PublicStructureResponse>(
      home,
      payload?.structure ?? (home.isPending ? undefined : emptyStructure)
    ),
    latest: slice<PublicPostItemsResponse>(
      home,
      payload?.latest ?? (home.isPending ? undefined : emptyPosts(3))
    ),
    recruitments: slice<PublicRecruitment[]>(home, payload?.recruitments),
    galleries: slice<PublicGalleryAlbum[]>(home, payload?.galleries),
    lombaPaged: slice<PublicPostItemsResponse>(
      home,
      payload?.lomba ?? (home.isPending ? undefined : emptyPosts(6))
    ),
    loadBelowFold: Boolean(payload) || !home.isPending,
  };
}

/** Apakah profil CMS masih kosong/minimal (beranda terlihat belum diisi) */
export function isPublicProfileSparse(profile: PublicProfile | null | undefined): boolean {
  if (!profile) return false;
  const hasIdentity = Boolean(
    String(profile.org_name ?? '').trim() ||
    String(profile.kabinet_name ?? '').trim() ||
    profile.home_image_url ||
    profile.logo_light_url
  );
  return !hasIdentity;
}
