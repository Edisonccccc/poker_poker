import { useEffect, useRef, useState } from "react";
import {
  loadFaceModels,
  computeDescriptor,
  topMatches,
  enrolledCount,
  type Candidate,
  type MatchResult,
} from "@/lib/face";
import { AuthImage } from "./AuthImage";

type State = "preparing" | "ready" | "scanning" | "error";

/**
 * Live camera face scan. Matches against the given candidates and surfaces the
 * closest people for one-tap confirm. Falls back to manual search.
 */
export function FaceScan({
  candidates,
  onMatch,
  onManual,
  busy,
}: {
  candidates: Candidate[];
  onMatch: (profileId: string) => void;
  onManual: () => void;
  busy?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<State>("preparing");
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [noFace, setNoFace] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const enrolled = enrolledCount(candidates);

  async function startCamera(value: "user" | "environment") {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      await loadFaceModels();
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
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    startCamera("environment");
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function scan() {
    if (!videoRef.current) return;
    setState("scanning");
    setResults(null);
    setNoFace(false);
    try {
      const descriptor = await computeDescriptor(videoRef.current);
      if (!descriptor) {
        setNoFace(true);
        setResults([]);
        setState("ready");
        return;
      }
      setResults(topMatches(descriptor, candidates, 3));
      setState("ready");
    } catch {
      setState("error");
    }
  }

  if (state === "error") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-amber-600">
          Camera or face models unavailable.
        </p>
        <button
          onClick={onManual}
          className="min-h-tap w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold"
        >
          Search by name instead
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black/40">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
        {state === "preparing" && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
            Preparing camera…
          </div>
        )}
      </div>

      {results && results.length > 0 && (
        <ul className="space-y-1">
          {results.map((m) => (
            <li key={m.candidate.id}>
              <button
                disabled={busy}
                onClick={() => onMatch(m.candidate.id)}
                className="flex w-full items-center gap-3 rounded-xl bg-slate-100 p-2 text-left disabled:opacity-50"
              >
                <AuthImage
                  photoId={m.candidate.photoId}
                  alt={m.candidate.name}
                  className="h-11 w-11 rounded-full object-cover"
                />
                <span className="flex-1 font-medium">{m.candidate.name}</span>
                <span className="text-xs text-slate-400">
                  {Math.max(0, Math.round((1 - m.distance) * 100))}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {results && results.length === 0 && (
        <p className="text-sm text-slate-500">
          {noFace
            ? "No face detected — center your face in the frame and scan again."
            : enrolled === 0
              ? "No enrolled faces yet. Open a profile and save it with a clear photo to enroll, then scan."
              : "No match — try again or search by name."}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={scan}
          disabled={state !== "ready"}
          className="min-h-tap flex-1 rounded-xl bg-violet-600 text-white px-4 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {state === "scanning" ? "Scanning…" : "Scan face"}
        </button>
        <button
          onClick={() => startCamera(facing === "user" ? "environment" : "user")}
          disabled={state === "scanning"}
          className="min-h-tap rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold disabled:opacity-50"
          aria-label="Flip camera"
        >
          🔄 {facing === "user" ? "Rear" : "Front"}
        </button>
      </div>
      <button
        onClick={onManual}
        className="min-h-tap w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold"
      >
        Search by name
      </button>
    </div>
  );
}
