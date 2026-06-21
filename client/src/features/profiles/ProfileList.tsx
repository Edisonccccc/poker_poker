import { useState } from "react";
import { AuthImage } from "@/components/AuthImage";
import { RoleBadges } from "@/components/RoleBadges";
import { useProfiles } from "./hooks";
import { ProfileEditor } from "./ProfileEditor";
import { singular, type Profile, type ProfileKind } from "./api";

export function ProfileList({ kind }: { kind: ProfileKind }) {
  const { data, isLoading, isError } = useProfiles(kind);
  const [editing, setEditing] = useState<Profile | "new" | null>(null);
  const noun = singular(kind);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setEditing("new")}
        className="min-h-tap w-full rounded-xl bg-violet-600 text-white px-4 py-3 text-base font-semibold"
      >
        + New {noun}
      </button>

      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      {isError && (
        <p className="text-sm text-amber-600">Couldn't load {kind}.</p>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-slate-400">
          No {kind} yet. Add your first {noun}.
        </p>
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
                    className="aspect-square w-full rounded-2xl object-cover"
                  />
                  {p.roles.length > 0 && (
                    <RoleBadges
                      roles={p.roles}
                      className="absolute bottom-1 right-1 rounded-full bg-white/90 px-1.5 py-0.5 text-xs shadow-sm"
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
          kind={kind}
          existing={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
