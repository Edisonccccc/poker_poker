import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">PokerPoker</h1>
          <p className="text-sm text-white/60">
            Welcome back, {user?.displayName}
            {user?.role === "admin" && (
              <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-xs uppercase tracking-wide text-white/70">
                admin
              </span>
            )}
          </p>
        </div>
        <button
          onClick={logout}
          className="min-h-tap rounded-xl bg-white/10 px-3 py-2 text-sm text-white/80"
        >
          Sign out
        </button>
      </header>

      <section className="rounded-2xl bg-white/5 p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-white/50">
          Quick start
        </h2>
        <p className="text-sm text-white/60">
          Create a game and add tables, or set up your players and dealers.
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            to="/games"
            className="min-h-tap flex-1 rounded-xl bg-felt-light px-4 py-3 text-center text-base font-semibold text-white"
          >
            Games
          </Link>
          <Link
            to="/profiles"
            className="min-h-tap flex-1 rounded-xl bg-white/10 px-4 py-3 text-center text-base font-semibold text-white"
          >
            Profiles
          </Link>
        </div>
      </section>
    </div>
  );
}
