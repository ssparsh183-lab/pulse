import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeName = "default" | "matrix" | "minimal" | "ocean" | "sunset";

interface ThemeState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "default",
      setTheme: (theme) => {
        set({ theme });
        if (typeof window !== "undefined") {
          const cls = theme === "default" ? "" : `theme-${theme}`;
          document.documentElement.className = cls;
        }
      },
    }),
    {
      name: "pulse-theme",
    }
  )
);