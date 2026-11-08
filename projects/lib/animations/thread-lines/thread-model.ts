/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type WrNoise, createNoise, seededRandom } from 'ngwr/animations/core';

/** The lattice is shuffled from this seed, so two mounts and every spec see one ribbon. */
const SEED = 0x7e1a9d;
/** The gathered end's spread: this much of the height, never under the floor, in px. */
const GATHER = 0.045;
const GATHER_MIN = 18;
/** The frayed end's spread, as a share of the height: past one, the outer threads leave the box. */
const FAN = 1.15;
/** Where the ribbon's centre sits at the gathered end and at the frayed end, as a share of the height. */
const CENTRE_START = 0.24;
const CENTRE_END = 0.52;
/** How fast the fan opens along the length: above one it stays tight for a while, then lets go. */
const FAN_POWER = 1.6;
/** A thread's place in the ribbon is nudged by up to this much of the gap to its neighbour. */
const JITTER = 0.35;
/** How far a point sways at the gathered end and at the frayed end, in px. */
const SWAY_MIN = 3;
const SWAY_MAX = 22;
/** Noise cells per px along a thread: one bump every few hundred px. */
const NOISE_ALONG = 1 / 420;
/** Noise cells per thread across the ribbon: about six neighbours share a cell, so they move together, not in step. */
const NOISE_ACROSS = 0.16;
/** Noise cells per ms: one cell drifts past in about six seconds. */
const NOISE_DRIFT = 0.00016;
/** How far a point is pulled at the pointer itself, in px, and how much of its distance it may close. */
const PULL = 30;
const PULL_CLOSE = 0.5;
/** A point about this often along a thread, in px, within the bounds. */
const POINT_GAP = 72;
const POINTS_MIN = 10;
const POINTS_MAX = 24;
/** Every `TINT_EVERY`th thread, from `TINT_FROM`, takes the tint. */
const TINT_EVERY = 6;
const TINT_FROM = 2;

/** Smooth noise in -1..1, continuous in all three arguments: the core's, under the ribbon's name. */
type ThreadNoise = WrNoise;

const fade = (t: number): number => t * t * (3 - 2 * t);

/** The ribbon's noise: the core's value noise on the ribbon's seed, so two mounts and every spec see one ribbon. */
function createThreadNoise(seed = SEED): ThreadNoise {
  return createNoise(seed);
}

/** How many points a thread `width` px long is drawn through. */
function threadPoints(width: number): number {
  return Math.min(POINTS_MAX, Math.max(POINTS_MIN, Math.round(width / POINT_GAP) + 1));
}

/** How wide the ribbon is `u` (0..1) of the way along, in px: gathered at the start, frayed at the end. */
function threadSpread(u: number, height: number): number {
  const gather = Math.max(GATHER_MIN, GATHER * height);
  return gather + (FAN * height - gather) * u ** FAN_POWER;
}

/** Where the ribbon's centre line sits `u` of the way along, in px from the top. */
function threadCentre(u: number, height: number): number {
  return (CENTRE_START + (CENTRE_END - CENTRE_START) * fade(u)) * height;
}

/** The still ribbon: `count` threads through `points` each, in logical px from the start edge. */
interface ThreadLayout {
  readonly count: number;
  readonly points: number;
  /** Each point's distance along, shared by every thread; the last sits on the far edge. */
  readonly x: Float32Array<ArrayBuffer>;
  /** Each thread's points top-down, thread after thread, at rest. */
  readonly y: Float32Array<ArrayBuffer>;
  /** Which threads take the tint. */
  readonly tinted: Uint8Array<ArrayBuffer>;
}

/**
 * Lays `count` threads across a `width` by `height` box: evenly spaced in the
 * ribbon with a little seeded jitter, close together at the start edge and
 * fanned apart toward the far edge, the ribbon dipping as it opens.
 */
function threadLayout(width: number, height: number, count: number, points = threadPoints(width)): ThreadLayout {
  const n = width > 0 && height > 0 ? Math.max(1, Math.round(count)) : 0;
  const random = seededRandom(SEED + 0x9e37);
  const x = new Float32Array(points);
  for (let k = 0; k < points; k++) x[k] = (width * k) / (points - 1);
  const y = new Float32Array(n * points);
  const tinted = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const slot = (i + 0.5) / n + ((random() * 2 - 1) * JITTER) / n;
    const offset = slot * 2 - 1;
    for (let k = 0; k < points; k++) {
      const u = k / (points - 1);
      y[i * points + k] = threadCentre(u, height) + (offset * threadSpread(u, height)) / 2;
    }
    tinted[i] = i % TINT_EVERY === TINT_FROM ? 1 : 0;
  }
  return { count: n, points, x, y, tinted };
}

/**
 * How far thread `index` sways at `x` px along, `time` ms in, in px: small at
 * the gathered end, wide at the frayed one, from noise smooth along the
 * thread, across the ribbon and in time, so neighbours move together but not
 * in step. Pure, given the noise: the same arguments give the same sway.
 */
function threadSway(noise: ThreadNoise, x: number, u: number, index: number, time: number): number {
  const amplitude = SWAY_MIN + (SWAY_MAX - SWAY_MIN) * u;
  return amplitude * noise(x * NOISE_ALONG, index * NOISE_ACROSS, time * NOISE_DRIFT);
}

/**
 * The pull on a point `dx`, `dy` px from the pointer, into `out`: toward the
 * pointer, `PULL * strength` at the pointer itself, falling off smoothly to
 * nothing at `reach`, and never closing more than half the distance, so a
 * point near the pointer leans in rather than snapping onto it.
 */
function threadPull(dx: number, dy: number, reach: number, strength: number, out: Float32Array): void {
  const d = Math.hypot(dx, dy);
  if (d <= 0 || d >= reach || strength <= 0) {
    out[0] = 0;
    out[1] = 0;
    return;
  }
  const w = (1 - d / reach) ** 2;
  const magnitude = Math.min(PULL * strength * w, d * PULL_CLOSE);
  out[0] = (-dx / d) * magnitude;
  out[1] = (-dy / d) * magnitude;
}

/**
 * `value` moved toward `target` by `rate` of the gap per 60Hz frame, over
 * `scale` such frames: an exponential ease that never overshoots and takes
 * the same path on a fast and a slow screen.
 */
function threadApproach(value: number, target: number, rate: number, scale: number): number {
  return value + (target - value) * (1 - (1 - rate) ** scale);
}

export {
  CENTRE_END,
  CENTRE_START,
  FAN,
  FAN_POWER,
  GATHER,
  GATHER_MIN,
  JITTER,
  NOISE_ACROSS,
  NOISE_ALONG,
  NOISE_DRIFT,
  POINT_GAP,
  POINTS_MAX,
  POINTS_MIN,
  PULL,
  PULL_CLOSE,
  SEED,
  SWAY_MAX,
  SWAY_MIN,
  TINT_EVERY,
  TINT_FROM,
  createThreadNoise,
  threadApproach,
  threadCentre,
  threadLayout,
  threadPoints,
  threadPull,
  threadSpread,
  threadSway,
};
export type { ThreadLayout, ThreadNoise };
