import { useEffect, useState } from 'react';
import api from '@/services/api';
import type {
  PublicGalleryAlbum,
  PublicProfile,
  PublicProgram,
  PublicRecruitment,
  PublicStructureGroup,
} from '@/types/publicSite';
import type { PublicPostItemsResponse } from '@/types/api';
import { useMockOrSwr } from '@/hooks/useMockOrSwr';
import {
  mockGalleries,
  mockPostsBeritaLatestPage1,
  mockPostsLombaPage1,
  mockProfile,
  mockPrograms,
  mockRecruitments,
  mockStructure,
  USE_MOCK_LANDING,
} from '@/lib/utils/mockLandingData';

const fetcher = (url: string) =>
  api.get(url).then((r) => {
    if (r.data && typeof r.data === 'object' && r.data.success === false) {
      throw new Error(r.data.error || 'Request failed');
    }
    return r.data;
  });
const postsFetcher = (url: string) =>
  api.get(url).then((r) => {
    if (r.data && typeof r.data === 'object' && r.data.success === false) {
      throw new Error(r.data.error || 'Request failed');
    }
    return r.data.data;
  });

type StructureResp = { data: PublicStructureGroup[]; cabinet: any; allCabinets: any[] };

const extract = <T>(hook: {
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
}) => hook;

/** Data fetching beranda publik — profil + section below-fold.
 *  If VITE_USE_MOCK_LANDING truthy: returns static MOCK DATA, 0 real API calls.
 */
export function usePublicHomeData() {
  const [loadBelowFold, setLoadBelowFold] = useState(false);

  const profile = useMockOrSwr<PublicProfile | null>({
    swrKey: '/public-site/profile',
    fetcher: (url) =>
      api.get(url).then((r) => {
        if (r.data && typeof r.data === 'object' && r.data.success === false) {
          throw new Error(r.data.error || 'Request failed');
        }
        return r.data.data;
      }),
    mockStatic: mockProfile,
  });

  useEffect(() => {
    if (profile.isPending && !profile.data) return;
    const run = () => setLoadBelowFold(true);
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: USE_MOCK_LANDING ? 300 : 1800 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(run, USE_MOCK_LANDING ? 150 : 400);
    return () => clearTimeout(t);
  }, [profile.isPending, profile.data]);

  const belowFoldKey = loadBelowFold;

  const programs = useMockOrSwr<PublicProgram[]>({
    swrKey: belowFoldKey ? '/public-site/programs' : null,
    fetcher: (url) =>
      api.get(url).then((r) => {
        if (r.data && typeof r.data === 'object' && r.data.success === false) {
          throw new Error(r.data.error || 'Request failed');
        }
        return r.data.data;
      }),
    mockStatic: () => (loadBelowFold ? mockPrograms : ([] as unknown as PublicProgram[])),
  });

  const structure = useMockOrSwr<StructureResp>({
    swrKey: belowFoldKey ? '/public-site/structure' : null,
    fetcher,
    mockStatic: () =>
      loadBelowFold
        ? mockStructure
        : ({ data: [], cabinet: null, allCabinets: [] } as unknown as StructureResp),
  });

  const latest = useMockOrSwr<PublicPostItemsResponse>({
    swrKey: belowFoldKey ? '/public-site/posts?type=BERITA&page=1&pageSize=3' : null,
    fetcher: postsFetcher,
    mockStatic: () =>
      loadBelowFold
        ? mockPostsBeritaLatestPage1
        : ({ items: [], total: 0, page: 1, pageSize: 3, totalPages: 1 } as PublicPostItemsResponse),
  });

  const recruitments = useMockOrSwr<PublicRecruitment[]>({
    swrKey: belowFoldKey ? '/public-site/recruitments' : null,
    fetcher,
    mockStatic: () => (loadBelowFold ? mockRecruitments : ([] as unknown as PublicRecruitment[])),
  });

  const galleries = useMockOrSwr<PublicGalleryAlbum[]>({
    swrKey: belowFoldKey ? '/public-site/galleries' : null,
    fetcher,
    mockStatic: () => (loadBelowFold ? mockGalleries : ([] as unknown as PublicGalleryAlbum[])),
  });

  const lombaPaged = useMockOrSwr<PublicPostItemsResponse>({
    swrKey: belowFoldKey ? '/public-site/posts?type=LOMBA&page=1&pageSize=6' : null,
    fetcher: postsFetcher,
    mockStatic: () =>
      loadBelowFold
        ? mockPostsLombaPage1
        : ({ items: [], total: 0, page: 1, pageSize: 6, totalPages: 1 } as PublicPostItemsResponse),
  });

  return {
    profile: extract(profile),
    programs: extract(programs),
    structure: extract(structure),
    latest: extract(latest),
    recruitments: extract(recruitments),
    galleries: extract(galleries),
    lombaPaged: extract(lombaPaged),
    loadBelowFold,
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
