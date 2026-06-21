import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { uploadPhoto } from "@/lib/api";
import { computeDescriptor, loadImage } from "@/lib/face";
import { useAuth } from "@/features/auth/AuthContext";
import {
  useCreateProfile,
  useDeleteProfile,
  useUpdateProfile,
} from "./hooks";
import type { Profile } from "./api";
import { PROFILE_ROLES, roleMeta } from "@/lib/format";

export function ProfileEditor({
  existing,
  onClose,
}: {
  existing?: Profile;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const canEditRoles = user?.role === "admin" || user?.role === "host";

  const [name, setName] = useState(existing?.name ?? "");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>(existing?.roles ?? ["player"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRole = (r: string) =>
    setRoles((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));

  const create = useCreateProfile();
  const update = useUpdateProfile();
  const remove = useDeleteProfile();

  async function save() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let photoId = existing?.photoId ?? null;
      let faceDescriptor: number[] | undefined;
      if (dataUrl) {
        photoId = await uploadPhoto(dataUrl);
        // Best-effort face enrollment; saving still succeeds without a face.
        try {
          const img = await loadImage(dataUrl);
          faceDescriptor = (await computeDescriptor(img)) ?? undefined;
        } catch {
          faceDescriptor = undefined;
        }
      }
      if (existing) {
        await update.mutateAsync({
          id: existing.id,
          body: {
            name,
            photoId,
            ...(canEditRoles ? { roles } : {}),
            ...(faceDescriptor ? { faceDescriptor } : {}),
          },
        });
      } else {
        await create.mutateAsync({
          name,
          photoId,
          roles,
          ...(faceDescriptor ? { faceDescriptor } : {}),
        });
      }
      onClose();
    } catch (e) {
      setError("Couldn't save. Please try again.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!existing) return;
    if (!confirm(`Delete ${existing.name}?`)) return;
    setBusy(true);
    try {
      await remove.mutateAsync(existing.id);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg.includes("API 409")
          ? "Can't delete this person — they have game history."
          : "Couldn't delete.",
      );
      console.error(e);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-slate-500">
            Cancel
          </button>
          <h2 className="text-base font-semibold">
            {existing ? "Edit person" : "New person"}
          </h2>
          <button
            onClick={save}
            disabled={busy}
            className="text-sm font-semibold text-emerald-600 disabled:opacity-50"
          >
            Save
          </button>
        </header>

        <CameraCapture
          onCapture={setDataUrl}
          existingPhotoId={existing?.photoId}
          facingMode="user"
        />

        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Person name"
            className="min-h-tap w-full rounded-xl bg-slate-100 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-violet-300"
          />
        </label>

        <div className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Type
          </span>
          <div className="flex flex-wrap gap-2">
            {PROFILE_ROLES.map((r) => (
              <button
                key={r}
                type="button"
                disabled={!canEditRoles}
                onClick={() => toggleRole(r)}
                className={`min-h-tap rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                  roles.includes(r)
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {roleMeta[r].label}
              </button>
            ))}
          </div>
          {!canEditRoles && (
            <p className="text-xs text-slate-400">
              Only a host or admin can change a person's type.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-amber-600">{error}</p>}

        <div className="flex-1" />

        {existing && (
          <button
            onClick={onDelete}
            disabled={busy}
            className="min-h-tap rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-500 disabled:opacity-50"
          >
            Delete person
          </button>
        )}
      </div>
    </div>
  );
}
