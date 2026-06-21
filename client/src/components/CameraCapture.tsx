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
}: {
  onCapture: (dataUrl: string) => void;
  existingPhotoId?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => stopStream();
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch {
      setError("Camera unavailable — choose a photo instead.");
    }
  }

  function capture() {
    if (!videoRef.current) return;
    const dataUrl = videoFrameToDataUrl(videoRef.current);
    setPreview(dataUrl);
    onCapture(dataUrl);
    stopStream();
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDownscaledDataUrl(file);
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
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/40">
              No photo
            </div>
          ))}
      </div>

      {error && <p className="text-sm text-amber-400">{error}</p>}

      <div className="flex gap-2">
        {streaming ? (
          <button
            type="button"
            onClick={capture}
            className="min-h-tap flex-1 rounded-xl bg-felt-light px-4 py-3 text-sm font-semibold"
          >
            Capture
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="min-h-tap flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold"
          >
            {preview || existingPhotoId ? "Retake" : "Use camera"}
          </button>
        )}
        <label className="min-h-tap flex flex-1 cursor-pointer items-center justify-center rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold">
          Choose
          <input
            type="file"
            accept="image/*"
            onChange={onFile}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
