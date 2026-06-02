import { useEffect, useState } from 'react';

/**
 * @deprecated Gunakan skeleton inline di halaman. Overlay full-screen menimbulkan loading ganda.
 */
export default function useFirstLoadOverlay(loading: boolean) {
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (!loadedOnce && !loading) setLoadedOnce(true);
  }, [loadedOnce, loading]);

  return loading && !loadedOnce;
}
