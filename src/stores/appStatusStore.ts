import { create } from 'zustand';
import { OFFLINE_USER_MESSAGE } from '@/lib/perf/networkEvents';

interface AppStatusState {
  isMaintenance: boolean;
  isOffline: boolean;
  reason?: string;
  setOffline: (offline: boolean) => void;
  setMaintenance: (reason?: string) => void;
  clearMaintenance: () => void;
  clearNetworkIssues: () => void;
}

export const useAppStatusStore = create<AppStatusState>((set) => ({
  isMaintenance: false,
  isOffline: false,
  reason: undefined,
  setOffline: (offline) =>
    set({
      isOffline: offline,
      reason: offline ? OFFLINE_USER_MESSAGE : undefined,
      ...(offline ? { isMaintenance: false } : {}),
    }),
  setMaintenance: (reason) => set({ isMaintenance: true, isOffline: false, reason }),
  clearMaintenance: () => set({ isMaintenance: false, reason: undefined }),
  clearNetworkIssues: () => set({ isMaintenance: false, isOffline: false, reason: undefined }),
}));
