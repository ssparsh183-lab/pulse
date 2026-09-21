// frontend/app/auth/twitter/callback/page.tsx

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Loader } from "@/components/shared/loader";

function TwitterCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Authorizing with X / Twitter...");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const err = searchParams.get("error");

    if (err) {
      toast.error(`Twitter Auth Error: ${err}`);
      window.location.href = "/dashboard/twitter";
      return;
    }

    if (!code || !state) {
      toast.error("Missing authorization code or state");
      window.location.href = "/dashboard/twitter";
      return;
    }

    const lockKey = `pulse_tw_lock_${code}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(lockKey)) return;
    if (typeof window !== "undefined") sessionStorage.setItem(lockKey, "1");

    (async () => {
      try {
        setStatus("Exchanging tokens with Twitter API v2...");
        const res: any = await api.twitterCallback(code, state);
        toast.success(`Authenticated as ${res.handle}! 🚀`);
        
        // 🔥 DOUBLE-LOCK PERSISTENCE: Save in localStorage permanently!
        if (typeof window !== "undefined" && res?.handle) {
          localStorage.setItem("pulse_twitter_handle", res.handle);
        }

        // Seedha user ke handle dashboard par redirect!
        window.location.href = `/dashboard/twitter/channel?handle=${encodeURIComponent(res.handle)}`;
      } catch (e: any) {
        toast.error(e?.message || "Failed to authenticate Twitter account.");
        setTimeout(() => {
          window.location.href = "/dashboard/twitter";
        }, 1500);
      }
    })();
  }, [searchParams]);

  return (
    <main className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="text-center">
        <Loader label={status} />
        <p className="text-xs text-zinc-500 font-mono mt-2">
          PULSE Sovereign Intelligence Handshake
        </p>
      </div>
    </main>
  );
}

export default function TwitterCallbackPage() {
  return (
    <Suspense fallback={<main className="min-h-screen gradient-bg flex items-center justify-center"><Loader label="Connecting to X..." /></main>}>
      <TwitterCallbackInner />
    </Suspense>
  );
}