// frontend/components/dashboard/header.tsx

"use client";

import { useAuthStore } from "@/store/auth";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { useRouter } from "next/navigation";
import { LogOut, Radio, PlayCircle } from "lucide-react";

interface HeaderProps {
  channelTitle?: string;
  isLive?: boolean;
  onRunDemo?: () => void;
  demoLoading?: boolean;
}

export function Header({
  channelTitle = "Pulse Control Room",
  isLive = false,
  onRunDemo,
  demoLoading = false,
}: HeaderProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

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
          {/* 🔥 Theme Switcher placed strictly to the LEFT of Starting Demo */}
          <ThemeSwitcher />

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