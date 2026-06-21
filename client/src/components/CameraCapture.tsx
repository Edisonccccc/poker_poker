import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { videoFrameToDataUrl, fileToDownscaledDataUrl } from "@/lib/image";
import { AuthImage } from "./AuthImage";

/**
 * Capture a photo from the camera, or choose one from the library. Calls
 * onCapture with a downscaled JPEG data URL. Manual file fallback always works.
 */
export function CameraCapture({
  onCapture,
  existingPhotoId,
  facingMode = "user",
  maxSize = 640,
  quality = 0.8,
}: {
  onCapture: (dataUrl: string) => void;
  existingPhotoId?: string | null;
  /** "user" = front (faces/profiles), "environment" = rear (chips on table). */
  facingMode?: "user" | "environment";
  /** Max long-edge px for the captured image (larger = more detail). */
  maxSize?: number;
  quality?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">(facingMode);

  useEffect(() => {
    return () => stopStream();
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }

  async function startStream(value: "user" | "environment") {
    setError(null);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: value } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setFacing(value);
      setStreaming(true);
    } catch {
      setError("Camera unavailable — choose a photo instead.");
    }
  }

  const start = () => startStream(facing);
  const flip = () => startStream(facing === "user" ? "environment" : "user");

  function capture() {
    if (!videoRef.current) return;
    const dataUrl = videoFrameToDataUrl(videoRef.current, maxSize, quality);
    setPreview(dataUrl);
    onCapture(dataUrl);
    stopStream();
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDownscaledDataUrl(file, maxSize, quality);
      setPreview(dataUrl);
      onCapture(dataUrl);
    } catch {
      setError("Couldn't read that image.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black/40">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover ${
            streaming ? "" : "hidden"
          }`}
        />
        {!streaming &&
          (preview ? (
            <img
              src={preview}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : existingPhotoId ? (
            <AuthImage
              photoId={existingPhotoId}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
              No photo
            </div>
          ))}
      </div>

      {error && <p className="text-sm text-amber-600">{error}</p>}

      <div className="flex gap-2">
        {streaming ? (
          <>
            <button
              type="button"
              onClick={capture}
              className="min-h-tap flex-1 rounded-xl bg-violet-600 text-white px-4 py-3 text-sm font-semibold"
            >
              Capture
            </button>
            <button
              type="button"
              onClick={flip}
              className="min-h-tap rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold"
              aria-label="Flip camera"
            >
              🔄 {facing === "user" ? "Rear" : "Front"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={start}
              className="min-h-tap flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold"
            >
              {preview || existingPhotoId ? "Retake" : "Use camera"}
            </button>
            <label className="min-h-tap flex flex-1 cursor-pointer items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold">
              Choose
              <input
                type="file"
                accept="image/*"
                onChange={onFile}
                className="hidden"
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
