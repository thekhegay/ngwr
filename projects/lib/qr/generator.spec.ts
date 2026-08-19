import { afterEach, describe, expect, it, vi } from 'vitest';

import { type DrawOptions, drawQrCode } from './generator';
import type { WrQrErrorLevel } from './interfaces';

/**
 * jsdom implements no canvas 2D context — `getContext('2d')` returns `null` — so the
 * component's painting is unobservable there and `drawQrCode` bails at its first line.
 * A recording context restores exactly the part ngwr owns: the encoder is vendored, but
 * the bitmap geometry, the error-level mapping and the order of the fills are this
 * repo's, and every one of them is a call this can count.
 */
interface Call {
  readonly op: 'fillRect' | 'drawImage';
  readonly args: readonly number[];
  readonly fill: string;
}

const stub = (): { canvas: HTMLCanvasElement; calls: Call[] } => {
  const calls: Call[] = [];
  const ctx = {
    fillStyle: '',
    fillRect(x: number, y: number, w: number, h: number): void {
      calls.push({ op: 'fillRect', args: [x, y, w, h], fill: String(this.fillStyle) });
    },
    drawImage(_img: unknown, x: number, y: number, w: number, h: number): void {
      calls.push({ op: 'drawImage', args: [x, y, w, h], fill: String(this.fillStyle) });
    },
  };
  const canvas = document.createElement('canvas');
  // One cast, at the boundary: the stub implements the two methods the generator calls
  // and nothing else, which is the point — a full `CanvasRenderingContext2D` would hide
  // what is actually being exercised.
  const getContext = (): CanvasRenderingContext2D => ctx as unknown as CanvasRenderingContext2D;
  canvas.getContext = getContext as unknown as HTMLCanvasElement['getContext'];
  return { canvas, calls };
};

const options = (over: Partial<DrawOptions> = {}): DrawOptions => ({
  value: 'https://ngwr.dev',
  size: 160,
  padding: 10,
  color: '#000000',
  bgColor: '#ffffff',
  level: 'M',
  ...over,
});

describe('drawQrCode', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sizes the bitmap from the code and the padding, and the box from `size`', () => {
    const { canvas, calls } = stub();
    drawQrCode(canvas, options());

    // One module is 10 bitmap pixels, plus the quiet zone on both sides. The CSS box is
    // what `size` controls — the bitmap is the resolution, not the layout.
    expect(canvas.style.width).toBe('160px');
    expect(canvas.style.height).toBe('160px');
    expect(canvas.width).toBe(canvas.height);
    expect((canvas.width - 20) % 10).toBe(0);

    // The background is laid down first and covers the whole bitmap.
    expect(calls[0]).toEqual({ op: 'fillRect', args: [0, 0, canvas.width, canvas.height], fill: '#ffffff' });
  });

  it('paints every dark module inside the quiet zone, in the ink colour', () => {
    const { canvas, calls } = stub();
    drawQrCode(canvas, options({ color: '#123456', padding: 4 }));

    const modules = calls.slice(1);
    expect(modules.length).toBeGreaterThan(100);
    for (const call of modules) {
      expect(call.fill).toBe('#123456');
      const [x, y, w, h] = call.args;
      expect(w).toBe(10);
      expect(h).toBe(10);
      expect(x).toBeGreaterThanOrEqual(4);
      expect(y).toBeGreaterThanOrEqual(4);
      expect(x + w).toBeLessThanOrEqual(canvas.width - 4);
      expect(y + h).toBeLessThanOrEqual(canvas.height - 4);
    }
  });

  it('grows the code as the error correction level climbs', () => {
    // Higher redundancy needs more modules for the same payload — which is the whole
    // point of the level, and the one observable proof that it is wired to the encoder
    // rather than ignored.
    const sizes = (['L', 'M', 'Q', 'H'] as const).map(level => {
      const { canvas } = stub();
      drawQrCode(canvas, options({ value: 'x'.repeat(120), level }));
      return canvas.width;
    });

    expect(sizes[0]).toBeLessThan(sizes[3]);
    expect([...sizes]).toEqual([...sizes].sort((a, b) => a - b));
  });

  it('needs a bigger code for a longer payload', () => {
    const short = stub();
    const long = stub();
    drawQrCode(short.canvas, options({ value: 'hi' }));
    drawQrCode(long.canvas, options({ value: 'x'.repeat(400) }));

    expect(long.canvas.width).toBeGreaterThan(short.canvas.width);
  });

  it('clears to the background and draws nothing for an empty value', () => {
    const { canvas, calls } = stub();
    drawQrCode(canvas, options({ value: '' }));

    expect(calls).toHaveLength(1);
    expect(calls[0].fill).toBe('#ffffff');
  });

  it('does nothing at all when there is no 2d context', () => {
    // The real jsdom case, and the SSR one: `getContext` hands back null and the whole
    // function has to be a no-op rather than throwing on the way to the first fill.
    const canvas = document.createElement('canvas');
    canvas.getContext = (() => null) as HTMLCanvasElement['getContext'];

    expect(() => drawQrCode(canvas, options())).not.toThrow();
    expect(canvas.style.width).toBe('');
  });

  it('blanks the code instead of throwing on a payload past the QR capacity', () => {
    // A version-40 code holds about 1273 bytes at level H, and the encoder answers a
    // longer one with `RangeError: Data too long`. `WrQr` calls this from an `effect()`,
    // where an exception escapes into `runEffectsInView` and abandons the rest of the
    // view's effects — so one over-long string used to stop every other QR code on the
    // page from repainting. The deliberate answer is an empty quiet zone plus a report.
    const reported = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { canvas, calls } = stub();

    expect(() => drawQrCode(canvas, options({ value: 'a'.repeat(1300), level: 'H' }))).not.toThrow();

    // Exactly the empty-value shape: one full-bitmap fill in the background colour, and
    // no modules. Painting the whole surface is also what clears a previously drawn code —
    // `canvas.width` is only reassigned once an encode succeeds.
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ op: 'fillRect', args: [0, 0, canvas.width, canvas.height], fill: '#ffffff' });
    expect(reported).toHaveBeenCalledOnce();
  });

  it('still fits a payload just inside the capacity', () => {
    // The guard must not turn into a length cap of its own: 1273 bytes at level H is the
    // documented limit and has to keep encoding.
    const { canvas, calls } = stub();
    drawQrCode(canvas, options({ value: 'a'.repeat(1273), level: 'H' }));

    expect(calls.length).toBeGreaterThan(1);
  });

  it('lets a real encoder failure through rather than blanking the canvas', () => {
    // Only `RangeError: Data too long` is a value problem. An unmapped level reaches the
    // encoder as `undefined` and fails on its own terms; swallowing that would make a bug
    // in the vendored encoder look exactly like an over-long payload.
    const { canvas } = stub();

    expect(() => drawQrCode(canvas, options({ level: 'X' as WrQrErrorLevel }))).toThrow();
  });

  it('reserves a centred plate for an icon before drawing it', () => {
    const { canvas, calls } = stub();
    drawQrCode(canvas, options({ iconUrl: '/logo.png', iconSize: 42 }));

    // The overlay itself waits for the image to load, so nothing is drawn yet — what is
    // observable is that the module pass finished untouched.
    expect(calls.every(call => call.op === 'fillRect')).toBe(true);
    expect(calls.some(call => call.op === 'drawImage')).toBe(false);
  });
});
