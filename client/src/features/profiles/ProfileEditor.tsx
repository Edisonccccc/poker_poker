import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { uploadPhoto } from "@/lib/api";
import { computeDescriptor, loadImage } from "@/lib/face";
import {
  useCreateProfile,
  useDeleteProfile,
  useUpdateProfile,
} from "./hooks";
import { singular, type Profile, type ProfileKind } from "./api";

export function ProfileEditor({
  kind,
  existing,
  onClose,
}: {
  kind: ProfileKind;
  existing?: Profile;
  onClose: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCreateProfile(kind);
  const update = useUpdateProfile(kind);
  const remove = useDeleteProfile(kind);
  const noun = singular(kind);

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
          body: { name, photoId, ...(faceDescriptor ? { faceDescriptor } : {}) },
        });
      } else {
        await create.mutateAsync({
          name,
          photoId,
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
          ? `Can't delete ${noun} — they have game history.`
          : "Couldn't delete.",
      );
      console.error(e);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-felt-dark">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        <header className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-white/60">
            Cancel
          </button>
          <h2 className="text-base font-semibold capitalize">
            {existing ? `Edit ${noun}` : `New ${noun}`}
          </h2>
          <button
            onClick={save}
            disabled={busy}
            className="text-sm font-semibold text-emerald-400 disabled:opacity-50"
          >
            Save
          </button>
        </header>

        <CameraCapture
          onCapture={setDataUrl}
          existingPhotoId={existing?.photoId}
        />

        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-white/50">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`${noun} name`}
            className="min-h-tap w-full rounded-xl bg-white/10 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-felt-light"
          />
        </label>

        {error && <p className="text-sm text-amber-400">{error}</p>}

        <div className="flex-1" />

        {existing && (
          <button
            onClick={onDelete}
            disabled={busy}
            className="min-h-tap rounded-xl border border-red-500/40 px-4 py-3 text-sm font-semibold text-red-400 disabled:opacity-50"
          >
            Delete {noun}
          </button>
        )}
      </div>
    </div>
  );
}
