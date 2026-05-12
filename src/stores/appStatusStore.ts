import { create } from 'zustand';

interface AppStatusState {
  isMaintenance: boolean;
  reason?: string;
  setMaintenance: (reason?: string) => void;
  clearMaintenance: () => void;
}

export const useAppStatusStore = create<AppStatusState>((set) => ({
  isMaintenance: false,
  reason: undefined,
  setMaintenance: (reason) => set({ isMaintenance: true, reason }),
  clearMaintenance: () => set({ isMaintenance: false, reason: undefined }),
}));

