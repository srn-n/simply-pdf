import { PdfError, type PreparedImage } from './pdf/engine';

const MAX_SIDE = 3508; // A4 at 300 dpi; plenty for print, keeps files sane.

/**
 * Turns any image the browser can decode into JPEG or PNG bytes that pdf-lib
 * can embed, with camera (EXIF) rotation applied so phone photos are upright.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    const heic = /hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type);
    throw new PdfError(
      heic
        ? `${file.name} is a HEIC photo, which this browser can't open. Share it as JPG from your Photos app first.`
        : `${file.name} could not be opened as an image.`,
    );
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const keepAlpha = file.type === 'image/png' || file.type === 'image/gif' || file.type === 'image/webp';
  const ctx = canvas.getContext('2d', { alpha: keepAlpha })!;
  if (!keepAlpha) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const format = keepAlpha && hasTransparency(ctx, width, height) ? 'png' : 'jpg';
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, format === 'png' ? 'image/png' : 'image/jpeg', 0.9));
  canvas.width = canvas.height = 0;
  if (!blob) throw new PdfError(`${file.name} could not be converted.`);
  return { bytes: new Uint8Array(await blob.arrayBuffer()), format, width, height };
}

function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  // Sample a grid rather than every pixel; enough to catch logos and cut-outs.
  const step = Math.max(1, Math.floor(Math.min(w, h) / 64));
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) if (data[(y * w + x) * 4 + 3] < 250) return true;
  }
  return false;
}
