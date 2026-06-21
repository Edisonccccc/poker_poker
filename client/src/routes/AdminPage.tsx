import { useQuery } from "@tanstack/react-query";
import { listHosts } from "@/features/admin/api";
import { useAuth } from "@/features/auth/AuthContext";
import { money } from "@/lib/format";

export function AdminPage() {
  const { user } = useAuth();
  const hosts = useQuery({
    queryKey: ["admin", "hosts"],
    queryFn: listHosts,
    enabled: user?.role === "admin",
  });

  if (user?.role !== "admin") {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-slate-500">Admins only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
      <p className="text-sm text-slate-500">All hosts on this system.</p>

      {hosts.isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      {hosts.isError && (
        <p className="text-sm text-amber-600">Couldn't load hosts.</p>
      )}

      {hosts.data && (
        <ul className="space-y-2">
          {hosts.data.map((h) => (
            <li key={h.id} className="rounded-2xl bg-slate-100 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{h.displayName}</span>
                {h.role === "admin" && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase tracking-wide text-slate-600">
                    admin
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-500">{h.email}</div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {h.games} session{h.games === 1 ? "" : "s"} · {h.tables} table
                  {h.tables === 1 ? "" : "s"} · {h.players} player
                  {h.players === 1 ? "" : "s"}
                </span>
                <span
                  className={h.hostNet >= 0 ? "text-emerald-600" : "text-red-500"}
                >
                  {money(h.hostNet)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
