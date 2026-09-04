import type { PublicPost } from '@/types/publicSite';

export type PagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PublicPostItemsResponse = PagedResponse<PublicPost>;
