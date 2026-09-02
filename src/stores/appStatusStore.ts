import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OFFLINE_USER_MESSAGE } from '@/lib/perf/networkEvents';

interface WizardDraft {
  wizardStep: number | null;
  draftSessionId: string | null;
  pendingPhotoIdbKey: string | null;
}

interface AppStatusState extends WizardDraft {
  isMaintenance: boolean;
  isOffline: boolean;
  reason?: string;
  setOffline: (offline: boolean) => void;
  setMaintenance: (reason?: string) => void;
  clearMaintenance: () => void;
  clearNetworkIssues: () => void;
  setWizardDraft: (partial: Partial<WizardDraft>) => void;
  clearWizardDraft: () => void;
}

export const useAppStatusStore = create<AppStatusState>()(
  persist(
    (set) => ({
      isMaintenance: false,
      isOffline: false,
      reason: undefined,
      wizardStep: null,
      draftSessionId: null,
      pendingPhotoIdbKey: null,
      setOffline: (offline) =>
        set(
          offline
            ? {
                isOffline: true,
                reason: OFFLINE_USER_MESSAGE,
                isMaintenance: false,
              }
            : { isOffline: false }
        ),
      setMaintenance: (reason) => set({ isMaintenance: true, isOffline: false, reason }),
      clearMaintenance: () => set({ isMaintenance: false, reason: undefined }),
      clearNetworkIssues: () => set({ isMaintenance: false, isOffline: false, reason: undefined }),
      setWizardDraft: (partial) => set((state) => ({ ...state, ...partial })),
      clearWizardDraft: () =>
        set({ wizardStep: null, draftSessionId: null, pendingPhotoIdbKey: null }),
    }),
    {
      name: 'app-status-storage',
      partialize: (state) => ({
        wizardStep: state.wizardStep,
        draftSessionId: state.draftSessionId,
        pendingPhotoIdbKey: state.pendingPhotoIdbKey,
      }),
    }
  )
);
