import { useState } from "react";
import { AuthImage } from "@/components/AuthImage";
import { RoleBadges } from "@/components/RoleBadges";
import { useProfiles } from "./hooks";
import { ProfileEditor } from "./ProfileEditor";
import type { Profile } from "./api";

export function ProfileList() {
  const { data, isLoading, isError } = useProfiles();
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
              <button
                onClick={() => setEditing(p)}
                className="block w-full text-left"
              >
                <div className="relative">
                  <AuthImage
                    photoId={p.photoId}
                    alt={p.name}
                    fallback="avatar"
                    className="aspect-square w-full rounded-2xl object-cover"
                  />
                  {p.roles.length > 0 && (
                    <RoleBadges
                      roles={p.roles}
                      className="absolute bottom-1 left-1"
                    />
                  )}
                </div>
                <span className="mt-1 block truncate text-xs text-slate-700">
                  {p.name}
                </span>
              </button>
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
