export type FrameCaptureHandle = {
  captureFrame: () => HTMLCanvasElement | null;
};

export type PracticeCaptureHandle = FrameCaptureHandle & {
  isCameraActive: () => boolean;
};

const SIZE = 1080;
const PAD = 40;
const HEADER = 88;
const FOOTER = 168;
const GAP = 20;

function sourceSize(source: CanvasImageSource): { w: number; h: number } | null {
  if (source instanceof HTMLVideoElement) {
    if (!source.videoWidth || !source.videoHeight) return null;
    return { w: source.videoWidth, h: source.videoHeight };
  }
  if (source instanceof HTMLCanvasElement) {
    if (!source.width || !source.height) return null;
    return { w: source.width, h: source.height };
  }
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    return { w: source.width, h: source.height };
  }
  return null;
}

function drawFitted(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  mode: 'cover' | 'contain',
): boolean {
  const size = sourceSize(source);
  if (!size) return false;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const scale =
    mode === 'cover' ? Math.max(w / size.w, h / size.h) : Math.min(w / size.w, h / size.h);
  const dw = size.w * scale;
  const dh = size.h * scale;
  ctx.drawImage(source, 0, 0, size.w, size.h, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
  return true;
}

/** Draw `source` into `x,y,w,h` with object-cover cropping. */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  return drawFitted(ctx, source, x, y, w, h, 'cover');
}

/** Draw `source` into `x,y,w,h` with object-contain (no crop). */
export function drawImageContain(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  return drawFitted(ctx, source, x, y, w, h, 'contain');
}

export function captureCameraFrame(
  video: HTMLVideoElement,
  overlay: HTMLCanvasElement | null,
  mirrored: boolean,
): HTMLCanvasElement | null {
  const srcW = video.videoWidth;
  const srcH = video.videoHeight;
  if (!srcW || !srcH) return null;
  const destW = 960;
  const destH = 540;
  const canvas = document.createElement('canvas');
  canvas.width = destW;
  canvas.height = destH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, destW, destH);
  ctx.save();
  if (mirrored) {
    ctx.translate(destW, 0);
    ctx.scale(-1, 1);
  }
  drawImageCover(ctx, video, 0, 0, destW, destH);
  if (overlay && overlay.width > 0 && overlay.height > 0) {
    drawImageCover(ctx, overlay, 0, 0, destW, destH);
  }
  ctx.restore();
  return canvas;
}

export function practiceShareUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${window.location.origin}${base}/practice`;
}

export function compareCaption(gloss: string): string {
  return `Practicing ${gloss} on SignFlow — 3D teacher vs my hand. Score is a handshape guide, not a grade. ${practiceShareUrl()}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  fit: 'cover' | 'contain',
) {
  ctx.fillStyle = '#1e293b';
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.save();
  roundRect(ctx, x, y, w, h, 16);
  ctx.clip();
  if (fit === 'contain') {
    const inset = 16;
    drawImageContain(ctx, source, x + inset, y + inset, w - inset * 2, h - inset * 2);
  } else {
    drawImageCover(ctx, source, x, y, w, h);
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.fillRect(x + 14, y + 14, 72, 32);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '600 18px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 26, y + 30);
}

export function composeCompareCard(options: {
  teacher: HTMLCanvasElement;
  you: HTMLCanvasElement;
  gloss: string;
  handshapePercent?: number;
}): Promise<Blob> {
  const { teacher, you, gloss, handshapePercent } = options;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Could not create the compare card.'));

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 22px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('SIGNFLOW', PAD, PAD + 28);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 42px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(gloss, PAD, PAD + 74);

  const panelY = PAD + HEADER;
  const panelH = SIZE - PAD * 2 - HEADER - FOOTER;
  const panelW = (SIZE - PAD * 2 - GAP) / 2;
  drawPanel(ctx, teacher, PAD, panelY, panelW, panelH, '3D', 'contain');
  drawPanel(ctx, you, PAD + panelW + GAP, panelY, panelW, panelH, 'You', 'cover');

  const footerY = panelY + panelH + 36;
  if (typeof handshapePercent === 'number' && Number.isFinite(handshapePercent)) {
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 28px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`Handshape match ${Math.round(handshapePercent)}%`, PAD, footerY);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 20px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('A guide, not a fluency grade', PAD, footerY + 36);
  } else {
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 22px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('3D teacher vs your hand', PAD, footerY);
  }
  ctx.fillStyle = '#64748b';
  ctx.font = '500 18px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('signflow · entangleit.com/ASLTutor', PAD, footerY + 78);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Could not create the compare card.'));
      else resolve(blob);
    }, 'image/png');
  });
}

export function downloadCompareCard(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareCompareCard(
  blob: Blob,
  text: string,
  filename = 'signflow-compare.png',
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });
  const payload = { files: [file], title: 'SignFlow', text };
  if (typeof navigator.share === 'function') {
    const canFiles =
      typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] });
    if (canFiles) {
      try {
        await navigator.share(payload);
        return 'shared';
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
      }
    }
  }
  downloadCompareCard(blob, filename);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard can be blocked; the file is still saved.
  }
  return 'downloaded';
}
