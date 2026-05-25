import { useEffect, useState } from 'react';
import api from '@/services/api';
import type {
  PublicGalleryAlbum,
  PublicPost,
  PublicProfile,
  PublicProgram,
  PublicRecruitment,
  PublicStructureGroup,
} from '@/types/publicSite';
import { usePublicSectionSwr } from '@/hooks/usePublicSectionSwr';

const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
const postsFetcher = (url: string) => api.get(url).then((r) => r.data.data);

/** Data fetching beranda publik — profil + section below-fold */
export function usePublicHomeData() {
  const profile = usePublicSectionSwr<PublicProfile | null>('/public-site/profile', fetcher);

  const [loadBelowFold, setLoadBelowFold] = useState(false);
  useEffect(() => {
    if (profile.isPending && !profile.data) return;
    const run = () => setLoadBelowFold(true);
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 1800 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(run, 400);
    return () => clearTimeout(t);
  }, [profile.isPending, profile.data]);

  const belowFoldKey = loadBelowFold ? true : null;

  const programs = usePublicSectionSwr<PublicProgram[]>(
    belowFoldKey ? '/public-site/programs' : null,
    fetcher,
  );
  const structure = usePublicSectionSwr<PublicStructureGroup[]>(
    belowFoldKey ? '/public-site/structure' : null,
    fetcher,
  );
  const latest = usePublicSectionSwr<{ items: PublicPost[] }>(
    belowFoldKey ? '/public-site/posts?type=BERITA&page=1&pageSize=3' : null,
    postsFetcher,
  );
  const recruitments = usePublicSectionSwr<PublicRecruitment[]>(
    belowFoldKey ? '/public-site/recruitments' : null,
    fetcher,
  );
  const galleries = usePublicSectionSwr<PublicGalleryAlbum[]>(
    belowFoldKey ? '/public-site/galleries' : null,
    fetcher,
  );
  const lombaPaged = usePublicSectionSwr<{ items: PublicPost[] }>(
    belowFoldKey ? '/public-site/posts?type=LOMBA&page=1&pageSize=6' : null,
    postsFetcher,
  );

  return {
    profile,
    programs,
    structure,
    latest,
    recruitments,
    galleries,
    lombaPaged,
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
      profile.logo_light_url,
  );
  return !hasIdentity;
}
