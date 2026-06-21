import { useState } from "react";
import { AuthImage } from "@/components/AuthImage";
import { FaceScan } from "@/components/FaceScan";
import { useProfiles, useProfileDescriptors } from "@/features/profiles/hooks";
import type { Role } from "@/features/profiles/api";

/** Pick a player/dealer to check in — by face scan or name search. */
export function CheckInSheet({
  role,
  onPick,
  onClose,
  busy,
}: {
  role: Role;
  onPick: (profileId: string) => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const [mode, setMode] = useState<"search" | "scan">("search");
  const { data } = useProfiles(role);
  const descriptors = useProfileDescriptors(role, mode === "scan");
  const [q, setQ] = useState("");
  const noun = role; // "player" | "dealer"

  const filtered = (data ?? []).filter((p) =>
    p.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-6">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-slate-500">
            Cancel
          </button>
          <h2 className="text-base font-semibold capitalize">Check in {noun}</h2>
          <span className="w-12" />
        </header>

        {mode === "scan" ? (
          <FaceScan
            candidates={descriptors.data ?? []}
            busy={busy}
            onMatch={onPick}
            onManual={() => setMode("search")}
          />
        ) : (
          <>
            <button
              onClick={() => setMode("scan")}
              className="min-h-tap w-full rounded-xl bg-violet-600 text-white px-4 py-3 text-sm font-semibold"
            >
              📷 Scan face
            </button>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${noun}s…`}
              className="input"
            />
            <ul className="flex-1 space-y-1 overflow-y-auto">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    disabled={busy}
                    onClick={() => onPick(p.id)}
                    className="flex w-full items-center gap-3 rounded-xl bg-slate-100 p-2 text-left disabled:opacity-50"
                  >
                    <AuthImage
                      photoId={p.photoId}
                      alt={p.name}
                      fallback="avatar"
                      className="h-11 w-11 rounded-full object-cover"
                    />
                    <span className="font-medium">{p.name}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="py-6 text-center text-sm text-slate-400">
                  No {noun}s found. Add them under People.
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
