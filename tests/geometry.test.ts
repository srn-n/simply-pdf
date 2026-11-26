import { PDFDocument, degrees } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { normalizeRotation, visualFrame } from '../src/lib/pdf/geometry';

describe('normalizeRotation', () => {
  it('wraps and snaps to quarter turns', () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(89)).toBe(90);
  });
});

describe('visualFrame', () => {
  const page = async (rotation: number) => {
    const doc = await PDFDocument.create();
    const p = doc.addPage([200, 100]);
    p.setRotation(degrees(rotation));
    return p;
  };

  it('swaps width and height for sideways pages', async () => {
    expect(visualFrame(await page(90))).toMatchObject({ width: 100, height: 200 });
    expect(visualFrame(await page(180))).toMatchObject({ width: 200, height: 100 });
  });

  it('maps the visual bottom-left corner to the right user-space corner', async () => {
    expect(visualFrame(await page(0)).toUser(0, 0)).toEqual({ x: 0, y: 0 });
    expect(visualFrame(await page(90)).toUser(0, 0)).toEqual({ x: 200, y: 0 });
    expect(visualFrame(await page(180)).toUser(0, 0)).toEqual({ x: 200, y: 100 });
    expect(visualFrame(await page(270)).toUser(0, 0)).toEqual({ x: 0, y: 100 });
  });

  it('keeps the visual centre at the user-space centre', async () => {
    for (const r of [0, 90, 180, 270]) {
      const f = visualFrame(await page(r));
      expect(f.toUser(f.width / 2, f.height / 2)).toEqual({ x: 100, y: 50 });
    }
  });
});
