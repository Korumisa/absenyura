import useSWR from 'swr';
import type { SWRConfiguration } from 'swr';
import { useSwrPageState } from './useSwrPageState';

/** SWR + useSwrPageState — pola standar halaman publik dan admin */
export function usePublicSectionSwr<T>(
  key: string | null,
  fetcher: (url: string) => Promise<T>,
  config?: SWRConfiguration<T>,
) {
  const swr = useSWR<T>(key, fetcher, { revalidateOnFocus: false, ...config });
  const pageState = useSwrPageState(swr);
  return { swr, ...pageState };
}
