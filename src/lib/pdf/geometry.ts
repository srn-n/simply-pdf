import type { PDFPage } from 'pdf-lib';

/**
 * Pages can carry a /Rotate value, so "the bottom of the page" as a reader
 * sees it is not always the bottom of the MediaBox. These helpers work in
 * *visual* coordinates (origin bottom-left of the page as displayed) and map
 * them to PDF user space, so stamps, numbers and signatures land where the
 * person put them and read the right way up.
 */

export interface VisualFrame {
  /** Width of the page as displayed */
  width: number;
  /** Height of the page as displayed */
  height: number;
  rotation: 0 | 90 | 180 | 270;
  toUser: (vx: number, vy: number) => { x: number; y: number };
}

export function normalizeRotation(angle: number): 0 | 90 | 180 | 270 {
  const r = (((Math.round(angle / 90) * 90) % 360) + 360) % 360;
  return r as 0 | 90 | 180 | 270;
}

export function visualFrame(page: PDFPage): VisualFrame {
  const box = page.getCropBox();
  const { x: x0, y: y0, width: w, height: h } = box;
  const rotation = normalizeRotation(page.getRotation().angle);
  const swapped = rotation === 90 || rotation === 270;

  const toUser = (vx: number, vy: number) => {
    switch (rotation) {
      case 90:
        return { x: x0 + w - vy, y: y0 + vx };
      case 180:
        return { x: x0 + w - vx, y: y0 + h - vy };
      case 270:
        return { x: x0 + vy, y: y0 + h - vx };
      default:
        return { x: x0 + vx, y: y0 + vy };
    }
  };

  return { width: swapped ? h : w, height: swapped ? w : h, rotation, toUser };
}
