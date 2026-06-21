import * as faceapi from "@vladmandic/face-api";

// Model weights are loaded at runtime from a CDN so we don't bundle large
// binaries. Cached by the browser after first load.
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

// Distance below which two faces are considered the same. Tune on real photos.
export const MATCH_THRESHOLD = 0.5;

let loadPromise: Promise<void> | null = null;

export function loadFaceModels(): Promise<void> {
  if (!loadPromise) {
    loadPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  return loadPromise;
}

type FaceInput =
  | HTMLImageElement
  | HTMLVideoElement
  | HTMLCanvasElement;

/** Returns a 128-d descriptor for the single largest face, or null. */
export async function computeDescriptor(
  input: FaceInput,
): Promise<number[] | null> {
  await loadFaceModels();
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection ? Array.from(detection.descriptor) : null;
}

export interface Candidate {
  id: string;
  name: string;
  photoId: string | null;
  faceDescriptor: number[];
}

export interface MatchResult {
  candidate: Candidate;
  distance: number;
}

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Candidates that actually have a usable descriptor. */
export function enrolledCount(candidates: Candidate[]): number {
  return candidates.filter((c) => c.faceDescriptor && c.faceDescriptor.length > 0)
    .length;
}

/** Best matches under the threshold, closest first. */
export function rankMatches(
  query: number[],
  candidates: Candidate[],
  threshold = MATCH_THRESHOLD,
): MatchResult[] {
  return candidates
    .filter((c) => c.faceDescriptor && c.faceDescriptor.length === query.length)
    .map((c) => ({ candidate: c, distance: euclidean(query, c.faceDescriptor) }))
    .filter((m) => m.distance <= threshold)
    .sort((a, b) => a.distance - b.distance);
}

/** Closest N candidates regardless of threshold (host confirms manually). */
export function topMatches(
  query: number[],
  candidates: Candidate[],
  n = 3,
): MatchResult[] {
  return candidates
    .filter((c) => c.faceDescriptor && c.faceDescriptor.length === query.length)
    .map((c) => ({ candidate: c, distance: euclidean(query, c.faceDescriptor) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n);
}

/** Load an <img> from a data URL (for enrollment from a captured photo). */
export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = dataUrl;
  });
}
