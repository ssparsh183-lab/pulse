"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Loader } from "@/components/shared/loader";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [status, setStatus] = useState("Exchanging authorization code...");

  useEffect(() => {
    const code = searchParams.get("code");
    const err = searchParams.get("error");

    if (err) {
      toast.error(`Google Login: ${err}`);
      router.replace("/");
      return;
    }

    if (!code) {
      toast.error("No authorization code");
      router.replace("/");
      return;
    }

    // Global session-lock to prevent React 18 Strict Mode double-POST
    const lockKey = `pulse_oauth_code_${code}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(lockKey)) {
      console.log("[PULSE Auth] Code already processing/processed. Skipping duplicate run.");
      return;
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem(lockKey, "processing");
    }

    (async () => {
      try {
        setStatus("Verifying credentials with Google");
        const response = await api.googleCallback(code);
        const { access_token, user } = response;

        if (!access_token || !user) {
          throw new Error("Invalid response from auth backend");
        }

        // 1. Save to Zustand
        setAuth(user, access_token);

        // 2. Save to localStorage directly
        localStorage.setItem(
          "pulse-auth",
          JSON.stringify({
            state: { user, token: access_token, isHydrated: true },
            version: 0,
          })
        );

        sessionStorage.setItem(lockKey, "success");
        toast.success(`Welcome, ${user.name?.split(" ")[0] || "Creator"}! 🎉`);

        // 3. Hard redirect so all components read fresh token
        window.location.href = "/dashboard";
      } catch (e: any) {
        console.error("[PULSE Auth] Exchange Error:", e);
        
        // Only error & wipe if we don't already have a valid session
        const existingToken = useAuthStore.getState().token;
        if (!existingToken) {
          if (typeof window !== "undefined") sessionStorage.removeItem(lockKey);
          toast.error(e?.message || "Login failed. Please try again.");
          setTimeout(() => router.replace("/"), 1500);
        } else {
          window.location.href = "/dashboard";
        }
      }
    })();
  }, [searchParams, setAuth, router]);

  return (
    <main className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="text-center">
        <Loader label={status} />
        <p className="text-xs text-zinc-500 font-mono mt-2">
          PULSE One-Click OAuth Sync
        </p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen gradient-bg flex items-center justify-center">
          <Loader label="Connecting..." />
        </main>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}