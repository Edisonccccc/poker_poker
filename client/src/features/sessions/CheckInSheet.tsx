import { useState } from "react";
import { AuthImage } from "@/components/AuthImage";
import { FaceScan } from "@/components/FaceScan";
import { useProfiles, useProfileDescriptors } from "@/features/profiles/hooks";
import { singular, type ProfileKind } from "@/features/profiles/api";

/** Pick a player/dealer to check in — by face scan or name search. */
export function CheckInSheet({
  kind,
  onPick,
  onClose,
  busy,
}: {
  kind: ProfileKind;
  onPick: (profileId: string) => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const [mode, setMode] = useState<"search" | "scan">("search");
  const { data } = useProfiles(kind);
  const descriptors = useProfileDescriptors(kind, mode === "scan");
  const [q, setQ] = useState("");
  const noun = singular(kind);

  const filtered = (data ?? []).filter((p) =>
    p.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-felt-dark">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-6">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-white/60">
            Cancel
          </button>
          <h2 className="text-base font-semibold capitalize">
            Check in {noun}
          </h2>
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
              className="min-h-tap w-full rounded-xl bg-felt-light px-4 py-3 text-sm font-semibold"
            >
              📷 Scan face
            </button>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${kind}…`}
              className="input"
            />
            <ul className="flex-1 space-y-1 overflow-y-auto">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    disabled={busy}
                    onClick={() => onPick(p.id)}
                    className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-2 text-left disabled:opacity-50"
                  >
                    <AuthImage
                      photoId={p.photoId}
                      alt={p.name}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                    <span className="font-medium">{p.name}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="py-6 text-center text-sm text-white/50">
                  No {kind} found. Add them under Profiles.
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
