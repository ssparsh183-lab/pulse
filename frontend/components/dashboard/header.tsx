"use client";

import { useAuthStore } from "@/store/auth";
import { useThemeStore, ThemeName } from "@/store/theme";
import { useRouter } from "next/navigation";
import { LogOut, Radio, PlayCircle, Palette, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface HeaderProps {
  channelTitle?: string;
  isLive?: boolean;
  onRunDemo?: () => void;
  demoLoading?: boolean;
}

const THEMES: { key: ThemeName; label: string; emoji: string; color: string }[] = [
  { key: "default", label: "Cyberpunk", emoji: "🔮", color: "text-purple-400" },
  { key: "matrix", label: "Matrix", emoji: "🟢", color: "text-emerald-400" },
  { key: "ocean", label: "Ocean", emoji: "🌊", color: "text-blue-400" },
  { key: "sunset", label: "Sunset", emoji: "🌅", color: "text-orange-400" },
  { key: "minimal", label: "Minimal", emoji: "⚪", color: "text-zinc-200" },
];

export function Header({
  channelTitle = "Pulse Control Room",
  isLive = false,
  onRunDemo,
  demoLoading = false,
}: HeaderProps) {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const router = useRouter();
  const [themeOpen, setThemeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setThemeOpen(false);
      }
    };
    if (themeOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [themeOpen]);

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  const currentTheme = THEMES.find((t) => t.key === theme) || THEMES[0];

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[var(--bg-solid)]/80 backdrop-blur-xl px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background: `linear-gradient(135deg, var(--brand), var(--brand-dark))`,
                boxShadow: `0 4px 12px var(--brand-glow-soft)`,
              }}
            >
              <span className="text-sm font-bold text-white">P</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-100">
              PULSE
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          <span className="text-sm text-zinc-300 font-medium truncate max-w-[200px] sm:max-w-[300px]">
            {channelTitle}
          </span>

          {isLive ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              <span>LIVE ANALYZING</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Ready</span>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {onRunDemo && (
            <button
              onClick={onRunDemo}
              disabled={demoLoading}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold transition-all shadow-md disabled:opacity-50"
              style={{
                background: `linear-gradient(90deg, var(--brand), var(--brand-dark))`,
                boxShadow: `0 4px 12px var(--brand-glow-soft)`,
              }}
            >
              <PlayCircle className="w-4 h-4" />
              <span>{demoLoading ? "Starting Demo..." : "RUN DEMO STREAM"}</span>
            </button>
          )}

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* THEME SELECTOR */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setThemeOpen((v) => !v)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-[var(--brand-light)] hover:bg-zinc-800/60 transition flex items-center gap-1.5 border border-zinc-800 hover:border-zinc-700"
              title="Change Theme"
            >
              <Palette className="w-4 h-4" />
              <span className="text-xs hidden md:inline">{currentTheme.emoji}</span>
            </button>

            {themeOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/50">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                    Theme Palette
                  </p>
                </div>
                <div className="p-1">
                  {THEMES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => {
                        setTheme(t.key);
                        setThemeOpen(false);
                      }}
                      className={`w-full text-xs text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition-all flex items-center justify-between ${
                        theme === t.key ? `${t.color} font-bold bg-zinc-800/50` : "text-zinc-300"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base">{t.emoji}</span>
                        {t.label}
                      </span>
                      {theme === t.key && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {user && (
            <div className="flex items-center gap-3 pl-1">
              <img
                src={user.picture_url || "https://avatar.vercel.sh/user"}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-zinc-700 object-cover"
              />
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-zinc-200">
                  {user.name}
                </span>
                <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                  {user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}