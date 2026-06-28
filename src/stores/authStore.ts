import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
  department?: string | null;
}

type SessionStatus = 'guest' | 'unknown' | 'verifying' | 'verified';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  sessionStatus: SessionStatus;
  setAuth: (user: User) => void;
  logout: () => void;
  markHydrated: () => void;
  markSessionUnknown: () => void;
  startSessionVerification: () => void;
  completeSessionVerification: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      sessionStatus: 'guest',
      setAuth: (user) =>
        set({
          user,
          isAuthenticated: true,
          sessionStatus: 'verified',
        }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          sessionStatus: 'guest',
        }),
      markHydrated: () => set({ hasHydrated: true }),
      markSessionUnknown: () =>
        set((state) => ({
          sessionStatus: state.isAuthenticated && state.user ? 'unknown' : 'guest',
        })),
      startSessionVerification: () =>
        set((state) => ({
          sessionStatus: state.isAuthenticated && state.user ? 'verifying' : 'guest',
        })),
      completeSessionVerification: () =>
        set((state) => ({
          sessionStatus: state.isAuthenticated && state.user ? 'verified' : 'guest',
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
        state?.markSessionUnknown();
      },
    }
  )
);
