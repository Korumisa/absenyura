import type {
  PublicGalleryAlbum,
  PublicPost,
  PublicProfile,
  PublicProgram,
  PublicRecruitment,
  PublicStructureGroup,
} from '@/types/publicSite';

export type PagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PublicPostItemsResponse = PagedResponse<PublicPost>;

export type PublicStructureResponse = {
  data: PublicStructureGroup[];
  cabinet: {
    id: string;
    name: string;
    period: string;
    is_active: boolean;
    sort_order?: number;
    /** Optional UI fields (mock / future CMS); not always returned by API */
    tagline?: string | null;
    motto?: string | null;
    groups?: PublicStructureGroup[];
  } | null;
  allCabinets: Array<{
    id: string;
    name: string;
    period: string;
    is_active: boolean;
    sort_order?: number;
    tagline?: string | null;
    motto?: string | null;
  }>;
};

export type PublicHomePayload = {
  profile: PublicProfile | null;
  programs: PublicProgram[];
  structure: PublicStructureResponse;
  latest: PublicPostItemsResponse;
  lomba: PublicPostItemsResponse;
  galleries: PublicGalleryAlbum[];
  recruitments: PublicRecruitment[];
};
