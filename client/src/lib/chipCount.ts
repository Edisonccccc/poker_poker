/**
 * Deterministic chip-stack counter for a SINGLE-COLOR side-on stack.
 *
 * Idea: a stack photographed from the side is periodic along its axis — each chip
 * contributes one repeating unit (face band + seam). We find the vertical band
 * with the most horizontal-edge energy (that's the stack), build a 1-D brightness
 * profile down it, then use autocorrelation to find the repeat period (= one chip
 * in pixels) and divide the stack's length by it.
 *
 * This is an ESTIMATE — always shown for the host to confirm/edit. No ML, no
 * network; runs on a downscaled canvas.
 */

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = dataUrl;
  });
}

function movingAverage(arr: Float32Array, win: number): Float32Array {
  const out = new Float32Array(arr.length);
  let sum = 0;
  const half = Math.floor(win / 2);
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    if (i >= win) sum -= arr[i - win];
    out[Math.max(0, i - half)] = sum / Math.min(win, i + 1);
  }
  return out;
}

export interface StackEstimate {
  count: number;
  confidence: number; // 0..1, autocorrelation peak strength
}

export async function estimateStackCount(
  dataUrl: string,
): Promise<StackEstimate> {
  const img = await loadImage(dataUrl);
  const W = 300;
  const scale = W / img.naturalWidth;
  const H = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { count: 0, confidence: 0 };
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);

  const gray = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  // Column energy = sum of vertical gradients (the stack has many horizontal seams).
  const colEnergy = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    let e = 0;
    for (let y = 1; y < H; y++) e += Math.abs(gray[y * W + x] - gray[(y - 1) * W + x]);
    colEnergy[x] = e;
  }
  const band = 30;
  let bestX = 0;
  let bestE = -1;
  for (let x = 0; x + band <= W; x++) {
    let s = 0;
    for (let k = 0; k < band; k++) s += colEnergy[x + k];
    if (s > bestE) {
      bestE = s;
      bestX = x;
    }
  }

  // Brightness profile down the stack band.
  const P = new Float32Array(H);
  for (let y = 0; y < H; y++) {
    let s = 0;
    for (let k = 0; k < band; k++) s += gray[y * W + bestX + k];
    P[y] = s / band;
  }

  // Active (stack) extent: rows where local change is well above baseline.
  const grad = new Float32Array(H);
  for (let y = 1; y < H; y++) grad[y] = Math.abs(P[y] - P[y - 1]);
  const smooth = movingAverage(grad, 5);
  let maxG = 0;
  for (let y = 0; y < H; y++) maxG = Math.max(maxG, smooth[y]);
  const thr = maxG * 0.25;
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < H; y++) {
    if (smooth[y] > thr) {
      if (top === -1) top = y;
      bottom = y;
    }
  }
  if (top === -1 || bottom - top < 8) return { count: 0, confidence: 0 };
  const extent = bottom - top;

  // Detrend the profile over the active region.
  const seg = P.subarray(top, bottom);
  const trend = movingAverage(seg, 15);
  const d = new Float32Array(seg.length);
  for (let i = 0; i < seg.length; i++) d[i] = seg[i] - trend[i];

  // Autocorrelation → dominant period in [4 .. extent/2].
  let r0 = 0;
  for (let i = 0; i < d.length; i++) r0 += d[i] * d[i];
  if (r0 === 0) return { count: 0, confidence: 0 };

  const maxLag = Math.min(40, Math.floor(d.length / 2));
  let bestLag = 0;
  let bestR = 0;
  for (let lag = 4; lag <= maxLag; lag++) {
    let r = 0;
    for (let i = 0; i + lag < d.length; i++) r += d[i] * d[i + lag];
    r /= r0;
    if (r > bestR) {
      bestR = r;
      bestLag = lag;
    }
  }
  if (bestLag === 0) return { count: 0, confidence: 0 };

  const count = Math.max(1, Math.round(extent / bestLag));
  return { count, confidence: Math.max(0, Math.min(1, bestR)) };
}
