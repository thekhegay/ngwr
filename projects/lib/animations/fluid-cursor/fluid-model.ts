/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrFluidCursorQuality } from './types';

/**
 * The density under which a dye is not seen: the display pass maps it to an
 * alpha of about two percent. `trail` is the time a fresh splat takes to get
 * here, and the loop stops once the last splat is this far behind.
 */
const FLOOR = 0.012;

/** A splat lands denser than one where strokes overlap; the rest time allows for this much. */
const PEAK = 2.5;

/** The pointer is never read faster than this, in CSS px per second: a jump across the region is not a stroke. */
const SPEED_MAX = 4000;

/** How far the pointer travels for the palette to run one full cycle, in CSS px. */
const CYCLE_PX = 900;

/**
 * A fresh splat is laid every this many radii along a stroke, so a fast move
 * leaves a continuous line, and no more than this many per event.
 */
const SPLAT_GAP = 0.6;
const SPLATS_MAX = 12;

/** A click's splash: this many rays around the point, each this many splats long, at this speed in CSS px per second, leaning this far sideways. */
const SPLASH_RAYS = 7;
const SPLASH_STEPS = 3;
const SPLASH_SPEED = 900;
const SPLASH_SPIN = 0.6;

/** A grid never shrinks under this on a side. */
const SIDE_MIN = 2;

/** One quality step: the short side of the velocity grid and of the dye grid, in texels, and the pressure solve's Jacobi iterations. */
interface FluidQuality {
  readonly sim: number;
  readonly dye: number;
  readonly iterations: number;
}

/** The grids and the pressure solve per quality. */
const QUALITY: Readonly<Record<WrFluidCursorQuality, FluidQuality>> = {
  low: { sim: 96, dye: 384, iterations: 12 },
  medium: { sim: 128, dye: 640, iterations: 20 },
  high: { sim: 192, dye: 1024, iterations: 28 },
};

/** A grid's size in texels. */
interface FluidGrid {
  readonly width: number;
  readonly height: number;
}

/**
 * A grid over a `width` by `height` region with `short` texels on its short
 * side and the region's aspect ratio, held under `maxPixels` texels in all,
 * never under two a side.
 */
function fluidGrid(width: number, height: number, short: number, maxPixels: number): FluidGrid {
  if (!(width > 0) || !(height > 0)) return { width: SIDE_MIN, height: SIDE_MIN };
  const aspect = width / height;
  let w = aspect >= 1 ? short * aspect : short;
  let h = aspect >= 1 ? short : short / aspect;
  const over = (w * h) / maxPixels;
  if (over > 1) {
    const scale = 1 / Math.sqrt(over);
    w *= scale;
    h *= scale;
  }
  return { width: Math.max(SIDE_MIN, Math.round(w)), height: Math.max(SIDE_MIN, Math.round(h)) };
}

/**
 * The rate, per second, at which a field decays so that a unit of it reaches
 * {@link FLOOR} in `seconds`; a non-positive time means no decay at all.
 */
function fluidDecay(seconds: number): number {
  return seconds > 0 ? Math.log(1 / FLOOR) / seconds : 0;
}

/**
 * How long after the last input the dye is sure to be under {@link FLOOR}, in
 * ms: `trail` seconds for a unit splat, longer for the {@link PEAK} that
 * overlapping strokes reach.
 */
function fluidRestMs(trail: number): number {
  if (!(trail > 0)) return 0;
  return Math.round(trail * 1000 * (1 + Math.log(PEAK) / Math.log(1 / FLOOR)));
}

/**
 * The pointer's velocity in CSS px per second, from a move of `dx`, `dy` in
 * `dtMs`, the speed clamped at {@link SPEED_MAX}; a move with no time in it is
 * read as one ms. Written into `out`.
 */
function fluidVelocity(dx: number, dy: number, dtMs: number, out: Float32Array): void {
  const dt = Math.max(dtMs, 1) / 1000;
  let vx = dx / dt;
  let vy = dy / dt;
  const speed = Math.hypot(vx, vy);
  if (speed > SPEED_MAX) {
    vx *= SPEED_MAX / speed;
    vy *= SPEED_MAX / speed;
  }
  out[0] = vx;
  out[1] = vy;
}

/** How many splats a move of `distance` CSS px takes, at `radius`: one when still, one per {@link SPLAT_GAP} radii, at most {@link SPLATS_MAX}. */
function fluidSplats(distance: number, radius: number): number {
  if (!(distance > 0) || !(radius > 0)) return 1;
  return Math.min(SPLATS_MAX, Math.max(1, Math.ceil(distance / (radius * SPLAT_GAP))));
}

/**
 * How much of its dye each of the `splats` a move of `distance` is laid as
 * carries: the share of a full gap it covers, so a stroke lays the same ink
 * per px travelled whether the pointer crawls or sweeps, and a still pointer
 * lays none.
 */
function fluidDyeScale(distance: number, splats: number, radius: number): number {
  if (!(radius > 0) || !(splats > 0)) return 1;
  return Math.min(1, Math.max(0, distance / splats / (radius * SPLAT_GAP)));
}

/** A colour as three channels in 0..1. */
type FluidColor = readonly [number, number, number];

/**
 * The palette's colour at `phase`, the cycle position with a period of one:
 * a blend of two neighbours, with the brightness of a blend held between
 * theirs, so a cool and a warm ink do not meet in grey. Written into `out`.
 */
function fluidPaletteColor(phase: number, palette: readonly FluidColor[], out: Float32Array): void {
  const n = palette.length;
  if (n === 0) {
    out[0] = out[1] = out[2] = 0;
    return;
  }
  const t = ((phase % 1) + 1) % 1;
  const slot = t * n;
  const i = Math.floor(slot) % n;
  const j = (i + 1) % n;
  const f = slot - Math.floor(slot);
  const a = palette[i];
  const b = palette[j];
  const peak = Math.max(a[0], a[1], a[2]) * (1 - f) + Math.max(b[0], b[1], b[2]) * f;
  let r = a[0] * (1 - f) + b[0] * f;
  let g = a[1] * (1 - f) + b[1] * f;
  let bl = a[2] * (1 - f) + b[2] * f;
  const max = Math.max(r, g, bl);
  if (max > 0) {
    const k = peak / max;
    r *= k;
    g *= k;
    bl *= k;
  }
  out[0] = r;
  out[1] = g;
  out[2] = bl;
}

/** A saturated hue at `phase`, the hue circle with a period of one, written into `out`. */
function fluidRainbowColor(phase: number, out: Float32Array): void {
  const h = (((phase % 1) + 1) % 1) * 6;
  const x = 1 - Math.abs((h % 2) - 1);
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 1) [r, g] = [1, x];
  else if (h < 2) [r, g] = [x, 1];
  else if (h < 3) [g, b] = [1, x];
  else if (h < 4) [g, b] = [x, 1];
  else if (h < 5) [r, b] = [x, 1];
  else [r, b] = [1, x];
  // Pulled a little toward white, so the pure corners of the hue circle sit with the theme inks.
  const s = 0.9;
  out[0] = r * s + (1 - s);
  out[1] = g * s + (1 - s);
  out[2] = b * s + (1 - s);
}

/** Whether a surface is light, so the dye is laid as ink over it rather than lit on it. */
function fluidInk(surface: FluidColor): boolean {
  return 0.2126 * surface[0] + 0.7152 * surface[1] + 0.0722 * surface[2] > 0.5;
}

/**
 * The rays of a click's splash: {@link SPLASH_RAYS} directions around the
 * point, each as a velocity of {@link SPLASH_SPEED} CSS px per second scaled
 * by `force`, leaning {@link SPLASH_SPIN} of that sideways, so the splash
 * turns as it spreads and the vorticity curls each ray; written into `out`
 * two numbers a ray. `seed` turns the fan so two splashes do not match.
 */
function fluidSplash(force: number, seed: number, out: Float32Array): number {
  for (let i = 0; i < SPLASH_RAYS; i++) {
    const angle = ((i + seed) / SPLASH_RAYS) * Math.PI * 2;
    const c = Math.cos(angle);
    const sn = Math.sin(angle);
    out[i * 2] = (c - sn * SPLASH_SPIN) * SPLASH_SPEED * force;
    out[i * 2 + 1] = (sn + c * SPLASH_SPIN) * SPLASH_SPEED * force;
  }
  return SPLASH_RAYS;
}

export {
  FLOOR,
  PEAK,
  SPEED_MAX,
  CYCLE_PX,
  SPLAT_GAP,
  SPLATS_MAX,
  SPLASH_RAYS,
  SPLASH_STEPS,
  SPLASH_SPEED,
  SPLASH_SPIN,
  QUALITY,
  fluidGrid,
  fluidDecay,
  fluidRestMs,
  fluidVelocity,
  fluidSplats,
  fluidDyeScale,
  fluidPaletteColor,
  fluidRainbowColor,
  fluidInk,
  fluidSplash,
};
export type { FluidQuality, FluidGrid, FluidColor };
