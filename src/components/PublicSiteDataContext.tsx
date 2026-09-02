import React from 'react';
import type { PublicProfile } from '@/types/publicSite';

type PublicSiteDataContextValue = {
  profile: PublicProfile | null;
  loading: boolean;
  error: Error | null;
};

const PublicSiteDataContext = React.createContext<PublicSiteDataContextValue | undefined>(
  undefined
);

export function PublicSiteDataProvider({
  profile,
  loading,
  error,
  children,
}: {
  profile: PublicProfile | null;
  loading: boolean;
  error: Error | null;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ profile, loading, error }), [profile, loading, error]);
  return <PublicSiteDataContext.Provider value={value}>{children}</PublicSiteDataContext.Provider>;
}

export function usePublicSiteData(): PublicSiteDataContextValue {
  const ctx = React.useContext(PublicSiteDataContext);
  if (ctx === undefined) {
    return { profile: null, loading: false, error: null };
  }
  return ctx;
}
