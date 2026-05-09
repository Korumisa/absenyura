import { useEffect, useState } from 'react';

export default function useFirstLoadOverlay(loading: boolean) {
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (!loadedOnce && !loading) setLoadedOnce(true);
  }, [loadedOnce, loading]);

  return loading && !loadedOnce;
}

