import { useState } from "react";
import { Globe } from "lucide-react";
import { AuthImage } from "@/components/AuthImage";
import { RoleBadges } from "@/components/RoleBadges";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfiles, useUpdateProfile } from "./hooks";
import { ProfileEditor } from "./ProfileEditor";
import type { Profile } from "./api";

export function ProfileList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading, isError } = useProfiles();
  const toggleShared = useUpdateProfile();
  const [editing, setEditing] = useState<Profile | "new" | null>(null);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setEditing("new")}
        className="min-h-tap w-full rounded-xl bg-violet-600 text-white px-4 py-3 text-base font-semibold"
      >
        + New person
      </button>

      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      {isError && <p className="text-sm text-amber-600">Couldn't load people.</p>}
      {data && data.length === 0 && (
        <p className="text-sm text-slate-400">No people yet. Add your first one.</p>
      )}

      {data && data.length > 0 && (
        <ul className="grid grid-cols-3 gap-3">
          {data.map((p) => (
            <li key={p.id}>
              <div className="relative">
                <button
                  onClick={() => setEditing(p)}
                  className="block w-full text-left"
                >
                  <AuthImage
                    photoId={p.photoId}
                    alt={p.name}
                    fallback="avatar"
                    className="aspect-square w-full rounded-2xl object-cover"
                  />
                  <span className="mt-1 block truncate text-sm font-medium text-slate-800">
                    {p.name}
                  </span>
                  {p.roles.length > 0 && (
                    <RoleBadges
                      roles={p.roles}
                      variant="label"
                      className="mt-0.5"
                    />
                  )}
                </button>

                {isAdmin ? (
                  <button
                    onClick={() =>
                      toggleShared.mutate({
                        id: p.id,
                        body: { shared: !p.shared },
                      })
                    }
                    disabled={toggleShared.isPending}
                    title={p.shared ? "Shared with all accounts" : "Make shared"}
                    aria-label={p.shared ? "Unshare" : "Share"}
                    className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition active:scale-90 ${
                      p.shared
                        ? "bg-violet-600 text-white"
                        : "bg-white/90 text-slate-400 ring-1 ring-black/5"
                    }`}
                  >
                    <Globe size={15} />
                  </button>
                ) : (
                  p.shared && (
                    <span
                      title="Shared"
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm"
                    >
                      <Globe size={15} />
                    </span>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ProfileEditor
          existing={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
