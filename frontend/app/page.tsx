// frontend/app/page.tsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Hero } from "@/components/landing/hero";
import { FeatureCards } from "@/components/landing/feature-cards";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    // 🔥 AUTO-REDIRECT: If already logged in, skip landing page and jump straight to Master Gateway!
    if (isHydrated && token) {
      router.replace("/dashboard");
    }
  }, [isHydrated, token, router]);

  return (
    <main className="min-h-screen gradient-bg overflow-hidden">
      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-30 px-6 py-5 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/40 blur-lg" />
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <span className="text-sm font-bold text-white">P</span>
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-100">PULSE</span>
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest ml-1 hidden sm:inline">
            v0.1
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-emerald-400/80">System Online</span>
          </div>
          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
          <a
            href="https://github.com"
            target="_blank"
            className="hover:text-zinc-200 transition text-xs"
          >
            GitHub
          </a>
          <Link
            href="/dashboard"
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition"
          >
            Sign in →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <Hero />

      {/* Beam divider */}
      <div className="beam-divider max-w-4xl mx-auto" />

      {/* Features */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-6">
            <span>◆</span>
            Core capabilities
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-100 mb-4 tracking-tight">
            Built for streams that{" "}
            <span className="text-gradient">actually scale</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed">
            Not a chatbot. Not a summarizer.
            <br />
            <span className="text-zinc-500">An engine that thinks in signals.</span>
          </p>
        </div>
        <FeatureCards />
      </section>

      {/* Big quote */}
      <section className="relative py-24 px-6 border-t border-zinc-900/60">
        <div className="max-w-4xl mx-auto text-center">
          <blockquote className="text-2xl md:text-4xl font-semibold text-zinc-200 leading-tight tracking-tight">
            <span className="text-purple-400">"</span>
            1 speaker can address 1000 viewers.
            <br />
            But 1000 viewers can't reach 1 speaker.
            <br />
            <span className="text-gradient">PULSE fixes that.</span>
            <span className="text-purple-400">"</span>
          </blockquote>
          <p className="text-xs text-zinc-500 mt-6 font-mono uppercase tracking-widest">
            — The problem we solve
          </p>
        </div>
      </section>

      {/* Beam divider */}
      <div className="beam-divider max-w-4xl mx-auto" />

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-400 to-fuchsia-600 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">P</span>
              </div>
              <span className="text-sm text-zinc-400">
                Built for <span className="text-zinc-200 font-semibold">SIH 2026</span> · Audience Signal Engine
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
              <span className="inline-flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-purple-500" />
                LaBSE
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                FastAPI
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-blue-500" />
                Next.js
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-sky-500" />
                Supabase
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}