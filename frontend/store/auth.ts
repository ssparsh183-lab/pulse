import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setHydrated: (v?: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isHydrated: false, // 🔥 FIX: Default false rakhenge taaki hydration se pehle guard trigger na ho
      setAuth: (user, token) => {
        if (!token || !user) {
          console.error("setAuth called without user/token", { user, token });
          return;
        }
        set({ user, token, isHydrated: true });
        try {
          localStorage.setItem(
            "pulse-auth",
            JSON.stringify({
              state: { user, token },
              version: 0,
            })
          );
        } catch (e) {
          console.error("persist write failed", e);
        }
      },
      logout: () => {
        set({ user: null, token: null });
        try {
          localStorage.removeItem("pulse-auth");
        } catch {}
      },
      setHydrated: (v = true) => set({ isHydrated: v }),
    }),
    {
      name: "pulse-auth",
      storage: createJSONStorage(() => localStorage),
      
      // 🔥 FIX: Zustand persist ka standard callback jo batata hai ki storage load ho chuki hai
      onRehydrateStorage: () => (state) => {
        if (state) {
          const raw = localStorage.getItem("pulse-auth");
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed?.state?.token) {
                state.token = parsed.state.token;
                state.user = parsed.state.user || null;
              }
            } catch {}
          }
          state.setHydrated(true);
        }
      },
      
      // NEVER persist null-only empties that wipe a good session mid-flight
      partialize: (s) => ({
        user: s.user,
        token: s.token,
      }),
      merge: (persisted: any, current) => {
        const p = persisted as Partial<AuthState> | undefined;
        // If storage has nulls, keep current in-memory if better
        if (p?.token) {
          return { ...current, ...p, isHydrated: true };
        }
        return { ...current, isHydrated: true };
      },
    }
  )
);