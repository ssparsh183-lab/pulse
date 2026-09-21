// frontend/app/dashboard/telegram/page.tsx

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { api, TelegramChannelItem } from "@/lib/api";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { Loader } from "@/components/shared/loader";
import { 
  Send, Radio, ArrowLeft, LogOut, ShieldCheck, ArrowRight, 
  Phone, KeyRound, Lock, CheckCircle2
} from "lucide-react";

function TelegramHubContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);

  // Telegram Phone Auth State
  const [tgStep, setTgStep] = useState<"phone" | "otp">("phone");
  const [tgPhone, setTgPhone] = useState("+91");
  const [tgCodeHash, setTgCodeHash] = useState("");
  const [tgOtp, setTgOtp] = useState("");
  const [tgPassword, setTgPassword] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [tgAuthLoading, setTgAuthLoading] = useState(false);

  // Channels State
  const [createdChannels, setCreatedChannels] = useState<TelegramChannelItem[]>([]);
  const [joinedChannels, setJoinedChannels] = useState<TelegramChannelItem[]>([]);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const res: any = await api.getTelegramChannels();
      if (res && typeof res === "object" && !Array.isArray(res)) {
        const created = res.created || [];
        const joined = res.joined || [];
        setCreatedChannels(created);
        setJoinedChannels(joined);
        if (created.length === 0 && joined.length === 0) {
          setNeedsAuth(true);
        } else {
          setNeedsAuth(false);
        }
      } else {
        setNeedsAuth(true);
      }
    } catch (err: any) {
      setNeedsAuth(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleSendTgCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tgPhone || tgPhone.length < 10) {
      toast.error("Please enter a valid international phone number.");
      return;
    }
    setTgAuthLoading(true);
    try {
      const res = await api.sendTelegramCode(tgPhone);
      setTgCodeHash(res.phone_code_hash);
      setTgStep("otp");
      setRequires2FA(false);
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err.message || "Failed to send code.");
    } finally {
      setTgAuthLoading(false);
    }
  };

  const handleVerifyTgCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tgOtp || tgOtp.length < 5) {
      toast.error("Enter the 5 or 6 digit code received on Telegram.");
      return;
    }
    if (requires2FA && !tgPassword) {
      toast.error("Please enter your Telegram 2FA Cloud Password.");
      return;
    }

    setTgAuthLoading(true);
    try {
      await api.verifyTelegramCode({
        phone_number: tgPhone,
        phone_code_hash: tgCodeHash,
        code: tgOtp,
        password: tgPassword || undefined
      });
      toast.success("Telegram Node Authenticated & Synced!");
      await fetchChannels();
      setRequires2FA(false);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Two-Step Verification") || msg.includes("2FA")) {
        setRequires2FA(true);
        toast.info("Account has 2FA enabled. Please enter your Cloud Password below.");
      } else {
        toast.error(msg || "Invalid Telegram code.");
      }
    } finally {
      setTgAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("pulse-auth");
    logout();
    router.replace("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center">
        <Loader label="Synchronizing MTProto Telegram Hub..." />
      </main>
    );
  }

  return (
    <main className="min-h-screen gradient-bg pb-20 font-sans relative z-10">
      {/* Top Navbar */}
      <nav className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Master Gateway
            </button>
            <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-xl">
              <Send className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-sky-300 tracking-wide">Telegram Intelligence Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            {user && (
              <div className="hidden sm:flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-xl">
                <img src={user.picture_url || ""} alt="" className="w-5 h-5 rounded-full object-cover" />
                <span className="text-xs font-semibold text-zinc-200">{user.name}</span>
              </div>
            )}
            <button onClick={handleLogout} className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-500/10 hover:text-rose-400 text-zinc-400 border border-zinc-800 transition" title="Sign Out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-12">
        {/* Header Aligned Perfectly with Sign Out Button on Right Symmetry */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight mb-2 flex items-center gap-3">
              <Send className="w-7 h-7 text-sky-400" /> Telegram Command Station
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Direct MTProto connection. Select any channel or supergroup to launch live intelligence surveillance.
            </p>
          </div>

          {!needsAuth && (
            <div className="flex items-center self-start md:self-auto">
              <button
                onClick={async () => {
                  try {
                    await api.disconnectTelegram();
                    setNeedsAuth(true);
                    setTgStep("phone");
                    setCreatedChannels([]);
                    setJoinedChannels([]);
                    toast.success("Successfully signed out from Telegram node!");
                  } catch (e: any) {
                    toast.error(e?.message || "Disconnect failed");
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-zinc-800 text-xs font-semibold transition font-mono shadow-md"
              >
                <Send className="w-3.5 h-3.5 text-sky-400" /> Sign Out From Telegram
              </button>
            </div>
          )}
        </div>

        {/* IF NEEDS AUTH */}
        {needsAuth ? (
          <div className="glass-panel max-w-md mx-auto rounded-3xl p-8 border border-sky-500/30 shadow-2xl bg-zinc-950/80">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mx-auto mb-5 shadow-lg">
              <Send className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100 text-center mb-1">Telegram MTProto Login</h2>
            <p className="text-[11px] text-zinc-500 text-center font-mono mb-6 uppercase tracking-wider">Secure Phone Gateway</p>

            {tgStep === "phone" ? (
              <form onSubmit={handleSendTgCode} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Telegram Phone (+91...)</label>
                  <input
                    type="text"
                    value={tgPhone}
                    onChange={(e) => setTgPhone(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-zinc-100 focus:outline-none focus:border-sky-500 font-mono shadow-inner"
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={tgAuthLoading} className="w-full bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold py-3.5 rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-2">
                  {tgAuthLoading ? "Requesting Code..." : "Send Verification Code"} <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyTgCode} className="space-y-4">
                <p className="text-xs text-zinc-400 text-center mb-2">Code sent to Telegram app for <span className="text-sky-400 font-mono">{tgPhone}</span></p>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">5-Digit Telegram Code</label>
                  <input
                    type="text"
                    value={tgOtp}
                    onChange={(e) => setTgOtp(e.target.value)}
                    placeholder="12345"
                    maxLength={6}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-center text-zinc-100 tracking-[0.4em] focus:outline-none focus:border-sky-500 font-mono shadow-inner"
                    autoFocus={!requires2FA}
                  />
                </div>

                {requires2FA && (
                  <div>
                    <label className="block text-[10px] font-mono text-amber-400 uppercase mb-1.5">2-Step Cloud Password</label>
                    <input
                      type="password"
                      value={tgPassword}
                      onChange={(e) => setTgPassword(e.target.value)}
                      placeholder="Enter 2-Step Cloud password"
                      className="w-full bg-zinc-900 border border-amber-500/50 rounded-2xl px-4 py-3 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                      autoFocus={requires2FA}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="button" onClick={() => setTgStep("phone")} className="px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs rounded-2xl">Back</button>
                  <button type="submit" disabled={tgAuthLoading} className="flex-1 bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold py-3 rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-2">
                    {tgAuthLoading ? "Verifying..." : "Verify & Load Channels"} <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* IF AUTHENTICATED */
          <div className="space-y-12">
            
            {/* SECTION 1: CHANNELS CREATED */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Channels Created by You ({createdChannels.length})
                </h2>
              </div>

              {createdChannels.length === 0 ? (
                <div className="glass-panel p-6 rounded-3xl text-zinc-500 text-xs font-mono border border-zinc-800">
                  No channels created under this MTProto session.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {createdChannels.map((chn) => (
                    <div
                      key={chn.id}
                      onClick={() => router.push(`/dashboard/telegram/channel?channelId=${chn.id}`)}
                      className="group cursor-pointer glass-panel p-6 rounded-3xl border border-emerald-500/30 hover:border-emerald-500 transition-all flex flex-col justify-between shadow-lg bg-gradient-to-br from-emerald-500/5 to-transparent"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">ADM</div>
                        <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase">Owner</span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate mb-1">{chn.title}</h3>
                        <p className="text-xs text-zinc-400 font-mono">{chn.username || "@channel"} · {chn.members_count.toLocaleString()} members</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-emerald-400 font-mono font-bold">
                        <span>Launch Station</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: CHANNELS JOINED */}
            <div>
              <h2 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-4 font-mono flex items-center gap-2">
                <Radio className="w-4 h-4" /> Channels & Groups Joined ({joinedChannels.length})
              </h2>

              {joinedChannels.length === 0 ? (
                <div className="glass-panel p-6 rounded-3xl text-zinc-500 text-xs font-mono border border-zinc-800">
                  No joined channels found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {joinedChannels.map((chn) => (
                    <div
                      key={chn.id}
                      onClick={() => router.push(`/dashboard/telegram/channel?channelId=${chn.id}`)}
                      className="group cursor-pointer glass-panel p-6 rounded-3xl border border-zinc-800 hover:border-sky-500/50 transition-all flex flex-col justify-between shadow-lg bg-zinc-900/40"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">PUB</div>
                        <span className="text-[9px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase font-bold">Subscriber</span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-zinc-100 group-hover:text-sky-400 transition-colors truncate mb-1">{chn.title}</h3>
                        <p className="text-xs text-zinc-400 font-mono">{chn.username || "@supergroup"} · {chn.members_count.toLocaleString()} members</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-sky-400 font-mono font-bold">
                        <span>Launch Intelligence</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </main>
  );
}

export default function TelegramHubPage() {
  return (
    <Suspense fallback={<main className="min-h-screen gradient-bg flex items-center justify-center"><Loader label="Loading Telegram Hub..." /></main>}>
      <TelegramHubContent />
    </Suspense>
  );
}