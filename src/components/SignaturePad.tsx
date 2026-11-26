import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Undo2 } from 'lucide-react';
import { Button, cx } from './ui';

export interface Signature {
  dataUrl: string;
  /** width / height */
  ratio: number;
}

type Point = { x: number; y: number; w: number };

const INKS = [
  { value: '#15161a', label: 'Black' },
  { value: '#1f3a8a', label: 'Blue' },
];

/** Crops a canvas to the bounding box of its non-transparent pixels. */
export function cropToInk(src: HTMLCanvasElement, pad = 8): Signature | null {
  const ctx = src.getContext('2d')!;
  const { width, height } = src;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d')!.drawImage(src, minX, minY, w, h, 0, 0, w, h);
  return { dataUrl: out.toDataURL('image/png'), ratio: w / h };
}

export function DrawPad({ onChange }: { onChange: (s: Signature | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const current = useRef<Point[] | null>(null);
  const [ink, setInk] = useState(INKS[0].value);
  const [count, setCount] = useState(0);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of [...strokes.current, ...(current.current ? [current.current] : [])]) {
      if (s.length === 1) {
        ctx.beginPath();
        ctx.arc(s[0].x, s[0].y, s[0].w / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      for (let i = 1; i < s.length; i++) {
        const a = s[i - 1];
        const b = s[i];
        const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        ctx.lineWidth = (a.w + b.w) / 2;
        ctx.beginPath();
        ctx.moveTo(i === 1 ? a.x : (s[i - 2].x + a.x) / 2, i === 1 ? a.y : (s[i - 2].y + a.y) / 2);
        ctx.quadraticCurveTo(a.x, a.y, m.x, m.y);
        ctx.stroke();
      }
    }
  }, [ink]);

  // Match the canvas to its on-screen size at full device resolution.
  useEffect(() => {
    const c = canvasRef.current!;
    const fit = () => {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const rect = c.getBoundingClientRect();
      if (!rect.width || !rect.height) return; // hidden: keep what's drawn
      // Rotating the phone changes the width but not the height, so each axis
      // scales on its own; line weight follows the smaller change.
      const scaleX = (rect.width * dpr) / (c.width || 1);
      const scaleY = (rect.height * dpr) / (c.height || 1);
      if (c.width && c.height && (Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01)) {
        const sw = Math.min(scaleX, scaleY);
        strokes.current = strokes.current.map((s) => s.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY, w: p.w * sw })));
      }
      c.width = Math.round(rect.width * dpr);
      c.height = Math.round(rect.height * dpr);
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => {
    redraw();
    if (strokes.current.length) onChange(cropToInk(canvasRef.current!));
  }, [ink, redraw, onChange]);

  const point = (e: React.PointerEvent): Point => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const dpr = c.width / rect.width;
    const pressure = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5;
    return { x: (e.clientX - rect.left) * dpr, y: (e.clientY - rect.top) * dpr, w: (1.6 + pressure * 3.2) * dpr };
  };

  const finish = () => {
    if (!current.current) return;
    strokes.current.push(current.current);
    current.current = null;
    setCount(strokes.current.length);
    redraw();
    onChange(cropToInk(canvasRef.current!));
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <canvas
          ref={canvasRef}
          aria-label="Signature drawing area. Draw with your finger, mouse or pen."
          className="h-44 w-full touch-none rounded-2xl border border-rule bg-white"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            current.current = [point(e)];
            redraw();
          }}
          onPointerMove={(e) => {
            if (!current.current) return;
            const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
            for (const ev of events) current.current.push(point(ev as unknown as React.PointerEvent));
            redraw();
          }}
          onPointerUp={finish}
          onPointerCancel={finish}
        />
        <div className="pointer-events-none absolute inset-x-6 bottom-10 border-b border-dashed border-black/15" />
        {count === 0 && <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-black/35">Sign here</p>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Ink colour">
          {INKS.map((i) => (
            <button
              key={i.value}
              role="radio"
              aria-checked={ink === i.value}
              aria-label={i.label}
              onClick={() => setInk(i.value)}
              className={cx('size-8 rounded-full border-2 transition-transform', ink === i.value ? 'scale-110 border-ink' : 'border-transparent')}
            >
              <span className="block size-full rounded-full border-2 border-sheet" style={{ background: i.value }} />
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={count === 0}
            icon={<Undo2 className="size-4" aria-hidden />}
            onClick={() => {
              strokes.current.pop();
              setCount(strokes.current.length);
              redraw();
              onChange(strokes.current.length ? cropToInk(canvasRef.current!) : null);
            }}
          >
            Undo
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={count === 0}
            icon={<Eraser className="size-4" aria-hidden />}
            onClick={() => {
              strokes.current = [];
              setCount(0);
              redraw();
              onChange(null);
            }}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}

const TYPE_FONTS = [
  { value: 'script', label: 'Handwritten', css: "'Caveat', cursive", weight: 600 },
  { value: 'sans', label: 'Plain', css: "'Hanken Grotesk Variable', sans-serif", weight: 500 },
] as const;

export async function renderTyped(text: string, font: (typeof TYPE_FONTS)[number], color: string): Promise<Signature | null> {
  if (!text.trim()) return null;
  const size = 140;
  const spec = `${font.weight} ${size}px ${font.css}`;
  try {
    await document.fonts.load(spec, text);
  } catch {
    /* falls back to whatever is available */
  }
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  ctx.font = spec;
  const w = Math.ceil(ctx.measureText(text).width) + 80;
  c.width = Math.min(4000, w);
  c.height = size * 1.8;
  ctx.font = spec;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 40, c.height / 2);
  return cropToInk(c, 12);
}

export function TypePad({ onChange }: { onChange: (s: Signature | null) => void }) {
  const [text, setText] = useState('');
  const [font, setFont] = useState<(typeof TYPE_FONTS)[number]['value']>('script');
  const def = TYPE_FONTS.find((f) => f.value === font)!;

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const s = await renderTyped(text, def, '#15161a');
      if (!cancelled) onChange(s);
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [text, def, onChange]);

  return (
    <div className="space-y-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Your name"
        aria-label="Type your name"
        autoComplete="name"
        className="h-24 w-full rounded-2xl border border-rule bg-white px-5 text-center text-4xl text-[#15161a] placeholder:text-black/25 focus:border-ink focus:outline-none"
        style={{ fontFamily: def.css, fontWeight: def.weight }}
      />
      <div className="flex gap-2">
        {TYPE_FONTS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFont(f.value)}
            aria-pressed={font === f.value}
            className={cx(
              'h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
              font === f.value ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-2 hover:border-ink',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function UploadPad({ onChange }: { onChange: (s: Signature | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [removeBg, setRemoveBg] = useState(true);
  const [preview, setPreview] = useState<Signature | null>(null);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    (async () => {
      try {
        const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas');
        c.width = Math.round(bmp.width * scale);
        c.height = Math.round(bmp.height * scale);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(bmp, 0, 0, c.width, c.height);
        bmp.close();
        if (removeBg) {
          const img = ctx.getImageData(0, 0, c.width, c.height);
          const d = img.data;
          for (let i = 0; i < d.length; i += 4) {
            const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            // Paper goes fully clear; the ink edge fades smoothly instead of going jagged.
            const alpha = lum > 200 ? 0 : lum < 120 ? 255 : Math.round(((200 - lum) / 80) * 255);
            d[i + 3] = Math.min(d[i + 3], alpha);
          }
          ctx.putImageData(img, 0, 0);
        }
        const s = cropToInk(c, 6);
        if (!cancelled) {
          setPreview(s);
          onChange(s);
        }
      } catch {
        if (!cancelled) {
          setPreview(null);
          onChange(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, removeBg, onChange]);

  return (
    <div className="space-y-3">
      <label className="flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-rule-strong bg-white p-4 hover:border-ink">
        {preview ? (
          <img src={preview.dataUrl} alt="Your signature" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-center text-sm text-black/45">
            Choose a photo of your signature
            <br />
            <span className="text-xs">dark ink on white paper works best</span>
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} className="size-4 accent-[var(--ink)]" />
        Remove the paper background
      </label>
    </div>
  );
}
