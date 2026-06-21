import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { BottomNav } from "./BottomNav";

/** Protected shell: requires a signed-in host, renders nav + the active page. */
export function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-felt-dark text-white/60">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-full bg-felt-dark text-white">
      <main className="mx-auto max-w-md px-4 pb-24 pt-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
