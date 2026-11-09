/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** How fast a ring travels, in px per second. */
export const SPEED = 600;
/** The wave's band, in px: from where a line starts to bend to where it is flat again. */
export const BAND = 80;
/** How far a line is pushed at the ring itself, at the source, in px. */
export const AMPLITUDE = 6;
/** How long a ripple lives, in ms; its strength is zero at the end. */
export const LIFE = 1500;
/** The distance over which a ring loses half its strength to travel, in px. */
export const REACH = 360;
/** How many ripples live at once: a new one past this drops the oldest. */
export const MAX_RIPPLES = 5;

/** One ring, from where and since when (in the scene's clock, ms). */
export interface Ripple {
  readonly x: number;
  readonly y: number;
  readonly born: number;
}

/** The ring's radius `age` ms after its tap. */
export function rippleRadius(age: number): number {
  return (SPEED * age) / 1000;
}

/**
 * How strong a ripple is at `age`, 0 to 1: it fades over its life, and the
 * farther the ring has travelled, so a wave dies out rather than hitting the
 * edge at full height.
 */
export function rippleStrength(age: number): number {
  if (age < 0 || age >= LIFE) return 0;
  const left = 1 - age / LIFE;
  return (left * left) / (1 + rippleRadius(age) / REACH);
}

/**
 * The wave's profile `offset` px from the ring: one on the ring, zero past
 * half the band, smooth in between, so a line bends in a soft hump and not a
 * step.
 */
export function rippleBand(offset: number): number {
  const u = Math.abs(offset) / (BAND / 2);
  if (u >= 1) return 0;
  const c = Math.cos((u * Math.PI) / 2);
  return c * c;
}

/**
 * What every live ripple does to the point (`x`, `y`) at `now`, summed into
 * `out`: the push along x and y in px, and the glow, 0 to 1 per ripple so it
 * can pass one where rings overlap. A line is pushed outward from each ring.
 */
export function rippleField(ripples: readonly Ripple[], now: number, x: number, y: number, out: Float32Array): void {
  let dx = 0;
  let dy = 0;
  let glow = 0;
  for (const ripple of ripples) {
    const strength = rippleStrength(now - ripple.born);
    if (strength === 0) continue;
    const rx = x - ripple.x;
    const ry = y - ripple.y;
    const d = Math.hypot(rx, ry);
    const band = rippleBand(d - rippleRadius(now - ripple.born));
    if (band === 0) continue;
    const w = band * strength;
    glow += w;
    if (d > 0) {
      const push = (AMPLITUDE * w) / d;
      dx += rx * push;
      dy += ry * push;
    }
  }
  out[0] = dx;
  out[1] = dy;
  out[2] = glow;
}

/** `ripples` with `ripple` added, never more than `max`: the oldest go first. */
export function rippleAdd(ripples: readonly Ripple[], ripple: Ripple, max = MAX_RIPPLES): Ripple[] {
  const next = [...ripples, ripple];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** The ripples of `ripples` still alive at `now`. */
export function rippleAlive(ripples: readonly Ripple[], now: number): Ripple[] {
  return ripples.filter(ripple => rippleStrength(now - ripple.born) > 0);
}

/**
 * Where the lines of a `width` by `height` grid sit, `spacing` apart and
 * centred: `xs` are the vertical lines, `ys` the horizontal ones.
 */
export function rippleGridLayout(
  width: number,
  height: number,
  spacing: number
): { xs: Float32Array<ArrayBuffer>; ys: Float32Array<ArrayBuffer> } {
  const gap = Math.max(8, spacing);
  if (width <= 0 || height <= 0) return { xs: new Float32Array(0), ys: new Float32Array(0) };
  const lines = (size: number): Float32Array<ArrayBuffer> => {
    const n = Math.floor(size / gap) + 1;
    const start = (size - (n - 1) * gap) / 2;
    return Float32Array.from({ length: n }, (_, i) => start + i * gap);
  };
  return { xs: lines(width), ys: lines(height) };
}
