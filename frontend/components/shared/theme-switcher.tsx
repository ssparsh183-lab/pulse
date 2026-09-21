// frontend/components/shared/theme-switcher.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { useThemeStore, ThemeName } from "@/store/theme";
import { Palette, Check } from "lucide-react";

const THEMES: { key: ThemeName; label: string; emoji: string; color: string }[] = [
  { key: "default", label: "Cyberpunk", emoji: "🔮", color: "text-purple-400" },
  { key: "matrix", label: "Matrix Green", emoji: "🟢", color: "text-emerald-400" },
  { key: "ocean", label: "Ocean Blue", emoji: "🌊", color: "text-blue-400" },
  { key: "sunset", label: "Sunset Orange", emoji: "🌅", color: "text-orange-400" },
  { key: "minimal", label: "Minimal Mono", emoji: "⚪", color: "text-zinc-200" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const currentTheme = THEMES.find((t) => t.key === theme) || THEMES[0];

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/95 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 hover:border-zinc-700 transition shadow-sm"
        title="Switch UI Theme Palette"
      >
        <Palette className="w-3.5 h-3.5 text-purple-400" />
        <span className="hidden sm:inline">{currentTheme.emoji} {currentTheme.label}</span>
        <span className="sm:hidden">{currentTheme.emoji}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-zinc-900 bg-zinc-900/50">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Global UI Theme Palette
            </p>
          </div>
          <div className="p-1 space-y-0.5">
            {THEMES.map((t) => {
              const isSelected = theme === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    setTheme(t.key);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                    isSelected 
                      ? "bg-purple-500/10 text-purple-300 font-bold border border-purple-500/20" 
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{t.emoji}</span>
                    <span>{t.label}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}