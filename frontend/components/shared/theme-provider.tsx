"use client";

import { useEffect, useState } from "react";
import { useThemeStore } from "@/store/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const themeClass = theme === "default" ? "" : `theme-${theme}`;
    document.documentElement.className = `dark ${themeClass}`;
  }, [theme, mounted]);

  if (!mounted) {
    return <div className="invisible">{children}</div>;
  }

  return <>{children}</>;
}