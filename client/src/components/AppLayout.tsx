import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { BottomNav } from "./BottomNav";

/** Protected shell: requires a signed-in host, renders nav + the active page. */
export function AppLayout() {
  const { user, loading, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Clear cached assets/data and reload so the newest deploy from the server is
  // picked up in one tap (otherwise the PWA cache can serve a stale build).
  async function refresh() {
    setRefreshing(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update()));
      }
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // best effort — reload regardless
    }
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-full">
      <header
        className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <span className="font-extrabold tracking-tight text-violet-600">
            PokerPoker
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">{user.displayName}</span>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="flex items-center justify-center rounded-lg bg-violet-100 p-2 text-violet-700 active:scale-95 disabled:opacity-60"
              aria-label="Refresh"
              title="Refresh to latest"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 active:scale-95"
              aria-label="Sign out"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pb-24 pt-5">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
