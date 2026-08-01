import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  // Auth / session
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  userRole: string | null;
  organizationId: string | null;
  organizationName: string | null;
  licenseType: string | null;
  mfaEnabled: boolean;
  // UI
  advanceMode: boolean;
  // Session timeout
  lastActivity: number | null;
  showSessionWarning: boolean;
  // Actions
  setSession: (s: Partial<Omit<AppState, "setSession" | "setAdvanceMode" | "reset" | "touchActivity" | "setShowSessionWarning">>) => void;
  setAdvanceMode: (v: boolean) => void;
  reset: () => void;
  touchActivity: () => void;
  setShowSessionWarning: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userId: null,
      userEmail: null,
      userName: null,
      userRole: null,
      organizationId: null,
      organizationName: null,
      licenseType: null,
      mfaEnabled: false,
      advanceMode: false,
      lastActivity: null,
      showSessionWarning: false,
      setSession: (s) => set(s),
      setAdvanceMode: (v) => set({ advanceMode: v }),
      reset: () =>
        set({
          userId: null,
          userEmail: null,
          userName: null,
          userRole: null,
          organizationId: null,
          organizationName: null,
          licenseType: null,
          mfaEnabled: false,
          advanceMode: false,
          lastActivity: null,
          showSessionWarning: false,
        }),
      touchActivity: () => set({ lastActivity: Date.now() }),
      setShowSessionWarning: (v) => set({ showSessionWarning: v }),
    }),
    {
      name: "forensiq-session",
      // Only persist auth + UI prefs
      partialize: (s) => ({
        userId: s.userId,
        userEmail: s.userEmail,
        userName: s.userName,
        userRole: s.userRole,
        organizationId: s.organizationId,
        organizationName: s.organizationName,
        licenseType: s.licenseType,
        mfaEnabled: s.mfaEnabled,
        advanceMode: s.advanceMode,
      }),
    }
  )
);
