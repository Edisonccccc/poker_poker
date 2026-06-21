/** Image helpers: downscale camera frames / chosen files to small JPEG data URLs. */

function sourceToDataUrl(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  max: number,
  quality: number,
): string {
  const scale = Math.min(1, max / Math.max(srcW, srcH));
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d canvas context");
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export function videoFrameToDataUrl(
  video: HTMLVideoElement,
  max = 640,
  quality = 0.8,
): string {
  return sourceToDataUrl(video, video.videoWidth, video.videoHeight, max, quality);
}

export function fileToDownscaledDataUrl(
  file: File,
  max = 640,
  quality = 0.8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const out = sourceToDataUrl(
          img,
          img.naturalWidth,
          img.naturalHeight,
          max,
          quality,
        );
        URL.revokeObjectURL(url);
        resolve(out);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}
