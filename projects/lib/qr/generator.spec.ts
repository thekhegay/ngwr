import { afterEach, describe, expect, it, vi } from 'vitest';

import { type DrawOptions, drawQrCode } from './generator';
import type { WrQrErrorLevel } from './types';

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

  it('refuses an icon URL whose scheme an image must not fetch', () => {
    // A security audit of 13.0.0 bound each of these to `[iconUrl]` and recorded a
    // real outbound request from the app's origin: the value reached
    // `new Image().src` verbatim, which is precisely what Angular sanitises when a
    // template writes `[src]` itself. Loading is done here, so the app never got
    // that check. The payloads are the audit's own.
    const loaded: string[] = [];
    class Probe {
      crossOrigin = '';
      onload: (() => void) | null = null;
      set src(value: string) {
        loaded.push(value);
      }
    }
    vi.stubGlobal('Image', Probe);

    for (const url of [
      'javascript:fetch("https://beacon.example")',
      'data:text/html,<script>x</script>',
      'data:image/svg+xml,<svg onload=x>',
    ]) {
      const { canvas } = stub();
      drawQrCode(canvas, options({ iconUrl: url, iconSize: 42 }));
    }
    expect(loaded).toEqual([]);

    // And every shape a real logo takes still loads, including a raster data URI.
    for (const url of ['/logo.png', 'https://cdn.example/logo.webp', 'data:image/png;base64,iVBORw0KGgo=']) {
      const { canvas } = stub();
      drawQrCode(canvas, options({ iconUrl: url, iconSize: 42 }));
    }
    expect(loaded).toHaveLength(3);

    vi.unstubAllGlobals();
  });

  it('ignores an icon that finishes loading after a newer draw', () => {
    const images: { onload: (() => void) | null }[] = [];
    class Probe {
      crossOrigin = '';
      onload: (() => void) | null = null;
      constructor() {
        images.push(this);
      }
      set src(_value: string) {
        // never fetches
      }
    }
    vi.stubGlobal('Image', Probe);

    const { canvas, calls } = stub();
    drawQrCode(canvas, options({ iconUrl: '/a.png' }));
    drawQrCode(canvas, options({ value: 'https://ngwr.dev/next', iconUrl: '/b.png' }));
    const before = calls.length;

    images[0].onload?.();
    expect(calls).toHaveLength(before);

    images[1].onload?.();
    expect(calls.some(call => call.op === 'drawImage')).toBe(true);

    vi.unstubAllGlobals();
  });

  describe('the icon inset', () => {
    const paintIcon = (iconSize: number): { box: readonly number[]; scale: number } => {
      class Probe {
        static last: Probe;
        crossOrigin = '';
        onload: (() => void) | null = null;
        constructor() {
          Probe.last = this;
        }
        set src(_value: string) {
          // never fetches
        }
      }
      vi.stubGlobal('Image', Probe);
      const { canvas, calls } = stub();
      drawQrCode(canvas, options({ iconUrl: '/a.png', iconSize }));
      Probe.last.onload?.();
      vi.unstubAllGlobals();
      return { box: calls.find(call => call.op === 'drawImage')!.args, scale: canvas.width / 160 };
    };

    it('scales with the bitmap, so the icon keeps its share of the tile', () => {
      const { box, scale } = paintIcon(42);

      expect(box[2]).toBeCloseTo(22 * scale, 5);
      expect(box[3]).toBeCloseTo(22 * scale, 5);
    });

    it('never draws a negative size for a tiny icon', () => {
      const { box } = paintIcon(4);

      expect(box[2]).toBeGreaterThan(0);
      expect(box[3]).toBeGreaterThan(0);
    });
  });

  /** Draws with an icon and lets it load: the calls after the module pass are the overlay's. */
  const withIcon = (over: Partial<DrawOptions>): { calls: Call[]; canvas: HTMLCanvasElement } => {
    class Probe {
      static last: Probe;
      crossOrigin = '';
      onload: (() => void) | null = null;
      constructor() {
        Probe.last = this;
      }
      set src(_value: string) {
        // never fetches
      }
    }
    vi.stubGlobal('Image', Probe);
    const { canvas, calls } = stub();
    drawQrCode(canvas, options({ iconUrl: '/a.png', ...over }));
    const before = calls.length;
    Probe.last.onload?.();
    vi.unstubAllGlobals();
    return { calls: calls.slice(before), canvas };
  };

  describe('the square under the icon', () => {
    it('is the background colour when no colour is given', () => {
      const { calls, canvas } = withIcon({ bgColor: '#eeeeee', level: 'H', iconSize: 20 });
      const side = (20 * canvas.width) / 160;

      expect(calls.map(call => call.op)).toEqual(['fillRect', 'drawImage']);
      expect(calls[0].fill).toBe('#eeeeee');
      expect(calls[0].args[2]).toBeCloseTo(side, 5);
      expect(calls[0].args[0]).toBeCloseTo((canvas.width - side) / 2, 5);
    });

    it('takes its own colour, under the same box', () => {
      const { calls, canvas } = withIcon({ level: 'H', iconSize: 20, iconBackground: 'rgb(1, 2, 3)' });

      expect(calls.map(call => call.op)).toEqual(['fillRect', 'drawImage']);
      expect(calls[0].fill).toBe('rgb(1, 2, 3)');
      expect(calls[0].args[2]).toBeCloseTo((20 * canvas.width) / 160, 5);
    });

    it.each(['transparent', 'rgba(0, 0, 0, 0)', 'color(srgb 1 1 1 / 0)'])('is not drawn for %s', iconBackground => {
      const { calls } = withIcon({ level: 'H', iconSize: 20, iconBackground });

      expect(calls.map(call => call.op)).toEqual(['drawImage']);
    });

    it('is drawn for a colour that is only partly transparent', () => {
      const { calls } = withIcon({ level: 'H', iconSize: 20, iconBackground: 'rgba(0, 0, 0, 0.5)' });

      expect(calls[0]).toMatchObject({ op: 'fillRect', fill: 'rgba(0, 0, 0, 0.5)' });
    });
  });

  describe('the icon coverage warning', () => {
    // Reported once per configuration for the life of the module, so every case here
    // draws a level and icon size no other case uses.
    const warned = (): string[] => {
      const messages: string[] = [];
      vi.spyOn(console, 'warn').mockImplementation((message: unknown) => {
        messages.push(String(message));
      });
      return messages;
    };

    it('names the level, the share and a size that fits for a large icon at L', () => {
      const warn = warned();
      const { canvas } = withIcon({ level: 'L', iconSize: 80 });

      expect(warn).toHaveLength(1);
      const message = warn[0];
      // The box is half the canvas a side; the quiet zone is not part of the symbol.
      const modules = (canvas.width - 20) / 10;
      const share = Math.round((canvas.width / 20 / modules) ** 2 * 1000) / 10;
      expect(message).toContain('level "L"');
      expect(message).toContain(`covers ${share}%`);
      expect(message).toContain('about 7%');

      // The size it names is one the level accepts, and one more is not.
      const fit = Number(/\[iconSize\] to (\d+)/.exec(message)![1]);
      expect(fit).toBeGreaterThan(0);
      expect(fit).toBeLessThan(80);
      withIcon({ level: 'L', iconSize: fit });
      expect(warn).toHaveLength(1);
      withIcon({ level: 'L', iconSize: fit + 1 });
      expect(warn).toHaveLength(2);
    });

    it('stays quiet for a small icon at H', () => {
      const warn = warned();
      withIcon({ level: 'H', iconSize: 24 });

      expect(warn).toHaveLength(0);
    });

    it('speaks once for a configuration, however often it is redrawn', () => {
      const warn = warned();
      withIcon({ level: 'L', iconSize: 90 });
      withIcon({ level: 'L', iconSize: 90, color: '#111111' });

      expect(warn).toHaveLength(1);
    });

    it('measures the image, not the box, when the square is transparent', () => {
      const warn = warned();
      // At M the limit is a side of about 57 CSS px here: a 70 px square is over it,
      // the 50 px image inside it is not.
      withIcon({ level: 'M', iconSize: 70, iconBackground: 'transparent' });
      expect(warn).toHaveLength(0);

      withIcon({ level: 'M', iconSize: 70 });
      expect(warn).toHaveLength(1);

      // And the size it names for a bare image accounts for the inset.
      withIcon({ level: 'M', iconSize: 100, iconBackground: 'transparent' });
      const fit = Number(/\[iconSize\] to (\d+)/.exec(warn[1])![1]);
      withIcon({ level: 'M', iconSize: fit, iconBackground: 'transparent' });
      expect(warn).toHaveLength(2);
      withIcon({ level: 'M', iconSize: fit + 1, iconBackground: 'transparent' });
      expect(warn).toHaveLength(3);
    });

    it('says nothing for an icon URL it refuses to load', () => {
      const warn = warned();
      const { canvas } = stub();
      drawQrCode(canvas, options({ level: 'L', iconSize: 100, iconUrl: 'javascript:void(0)' }));

      expect(warn).toHaveLength(0);
    });
  });
});
