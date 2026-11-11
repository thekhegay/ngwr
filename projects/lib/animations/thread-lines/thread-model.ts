/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { MAX_DPR, seededRandom } from '../internal';

/**
 * The pure side of `<wr-thread-lines>`: how the strands are laid across the
 * bundle, how the bundle opens along its length, how the pointer parts it and
 * how that parting eases, how big the canvas is and how often it is drawn.
 * The shader in `thread-gl.ts` reads the numbers from here as uniforms and as
 * a per-strand texture; it owns only what has to be per pixel.
 */

/** The strands are laid from this seed, so two mounts and every spec see one ribbon. */
const SEED = 0x51c4e7;
/** The shader's loop bound: `count` is capped here. */
const COUNT_MAX = 128;
/** The gathered end's half width: this much of the height, never under the floor, in CSS px. */
const GATHER = 0.012;
const GATHER_MIN = 3;
/** How far a unit `fray` opens the far end's half width, as a share of the height. */
const SPREAD = 0.42;
/** How the bundle opens along its length: above one it stays a cord for a while, then lets go. */
const FRAY_POWER = 1.7;
/** A strand's slot is nudged by up to this much of the gap to its neighbour. */
const JITTER = 0.4;
/** The travelling wave's phase lags this far, in radians, from the bundle's middle to its edge. */
const WAVE_LAG = 1.1;
/** On top of the lag each strand is off by up to this, in radians, so neighbours are almost in step. */
const WAVE_SCATTER = 0.18;
/** A strand's own path bends through this many to this many radians along the length. */
const PATH_TURNS_MIN = 1.6;
const PATH_TURNS_MAX = 3.4;
/** A strand shows between this much and all of its brightness, from its seed. */
const GAIN_MIN = 0.55;
/** The parting's reach stretches this far along the ribbon for every px across it. */
const PART_STRETCH = 1.7;
/** How many frames a second at rest, and the gap between them, in ms: the waves need no more. */
const REST_FPS = 30;
const REST_FRAME_MS = 1000 / REST_FPS;
/**
 * The parting's spring: how fast it closes on its target, per second, and how
 * damped it is. Under one it overshoots a little on the way back, the slight
 * elastic return of silk let go.
 */
const SPRING_RATE = 9;
const SPRING_DAMPING = 0.72;
/** The parting's centre follows the pointer at this rate, critically damped. */
const FOLLOW_RATE = 18;
/** Under this a spring's value and speed count as at rest. */
const SPRING_EPS = 0.002;
/**
 * The most device px the canvas holds: the shader walks every strand per
 * pixel, so this is what bounds its cost. Under the backdrops' shared budget:
 * a hairline at two device px per CSS px is sharper, but not at this price.
 */
const PIXELS = 2_000_000;

/** Floats per strand in {@link threadStrands}' output. */
const STRAND_STRIDE = 6;
/** Rows in the strand texture: the slot and gains, then the wave's phase. */
const TEXTURE_ROWS = 2;

/**
 * The strands of a bundle of `count`, {@link STRAND_STRIDE} floats each:
 *
 * - `slot`, where the strand sits across the bundle, -1 at one edge to 1 at
 *   the other, evenly spaced with a little seeded jitter;
 * - `gain`, how bright it is, {@link GAIN_MIN} to 1;
 * - `turns`, how many radians its own path bends through along the length;
 * - `phase`, where that path starts, 0 to 2pi;
 * - `cos` and `sin` of its travelling-wave lag, {@link WAVE_LAG} times its
 *   slot plus up to {@link WAVE_SCATTER} of scatter, so the shader adds the
 *   lag to the wave with no trigonometry of its own.
 *
 * Pure: the same `count` and `seed` give the same strands.
 */
function threadStrands(count: number, seed = SEED): Float32Array<ArrayBuffer> {
  const n = threadCount(count);
  const random = seededRandom(seed);
  const out = new Float32Array(n * STRAND_STRIDE);
  for (let i = 0; i < n; i++) {
    const slot = ((i + 0.5 + (random() * 2 - 1) * JITTER) / n) * 2 - 1;
    const gain = GAIN_MIN + (1 - GAIN_MIN) * random();
    const turns = PATH_TURNS_MIN + (PATH_TURNS_MAX - PATH_TURNS_MIN) * random();
    const phase = random() * Math.PI * 2;
    const lag = WAVE_LAG * slot + (random() * 2 - 1) * WAVE_SCATTER;
    const base = i * STRAND_STRIDE;
    out[base] = slot;
    out[base + 1] = gain;
    out[base + 2] = turns;
    out[base + 3] = phase;
    out[base + 4] = Math.cos(lag);
    out[base + 5] = Math.sin(lag);
  }
  return out;
}

/** `count` as the shader takes it: a whole number, one at least, {@link COUNT_MAX} at most. */
function threadCount(count: number): number {
  return Math.min(COUNT_MAX, Math.max(1, Math.round(count) || 1));
}

/**
 * The strands as the texture the shader reads them from: `count` texels wide,
 * {@link TEXTURE_ROWS} high, RGBA bytes. Row 0 holds the slot in sixteen bits
 * (red high, green low), the gain and the turns as a share of
 * {@link PATH_TURNS_MAX}; row 1 the phase as a share of 2pi and the lag's
 * cos and sin lifted into 0..1. Bytes, since a float texture is an extension
 * WebGL1 may not have, and a slot a quarter of a per-mille across is finer
 * than a pixel.
 */
function threadStrandTexture(strands: Float32Array): Uint8Array<ArrayBuffer> {
  const n = strands.length / STRAND_STRIDE;
  const out = new Uint8Array(n * TEXTURE_ROWS * 4);
  const byte = (value: number): number => Math.round(Math.min(1, Math.max(0, value)) * 255);
  for (let i = 0; i < n; i++) {
    const base = i * STRAND_STRIDE;
    const slot = Math.round(((strands[base] + 1) / 2) * 65535);
    const row0 = i * 4;
    out[row0] = Math.floor(slot / 256);
    out[row0 + 1] = slot % 256;
    out[row0 + 2] = byte(strands[base + 1]);
    out[row0 + 3] = byte(strands[base + 2] / PATH_TURNS_MAX);
    const row1 = (n + i) * 4;
    out[row1] = byte(strands[base + 3] / (Math.PI * 2));
    out[row1 + 1] = byte((strands[base + 4] + 1) / 2);
    out[row1 + 2] = byte((strands[base + 5] + 1) / 2);
    out[row1 + 3] = 255;
  }
  return out;
}

/** The bundle's half width at the gathered end and how far it opens by the far end, in CSS px, for a region `height` tall. */
interface ThreadWidths {
  readonly gather: number;
  readonly spread: number;
}

/** How wide the bundle is for a region `height` tall under `fray`: a cord at the start, `fray` times {@link SPREAD} of the height wider at the end. */
function threadWidths(height: number, fray: number): ThreadWidths {
  const gather = Math.max(GATHER_MIN, GATHER * height);
  return { gather, spread: Math.max(0, fray) * SPREAD * height };
}

/**
 * The bundle's half width `u` (0..1) of the way along, in CSS px: the
 * {@link threadWidths} opened along the fray curve, `u` to the
 * {@link FRAY_POWER}, so the strands hold together for a while and then part.
 * The shader has the same curve.
 */
function threadHalfWidth(u: number, widths: ThreadWidths): number {
  const t = Math.min(1, Math.max(0, u));
  return widths.gather + widths.spread * t ** FRAY_POWER;
}

/**
 * How long the ribbon is: the region's extent along its own axis, turned by
 * `angle` radians, so the gathered end and the frayed one both reach the
 * region's edge whatever the tilt.
 */
function threadLength(width: number, height: number, angle: number): number {
  return Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle));
}

/**
 * How far a strand `across` px from the pointer across the ribbon and `along`
 * px from it along the ribbon is pushed, as a share of the parting's full
 * push: whole at the pointer, falling smoothly, as a squared bell, to nothing
 * at `radius` across or {@link PART_STRETCH} times that along, so the gap is
 * a lens drawn out along the threads. The shader has the same bell.
 */
function threadParting(across: number, along: number, radius: number): number {
  if (radius <= 0) return 0;
  const q = Math.hypot(across / radius, along / (radius * PART_STRETCH));
  if (q >= 1) return 0;
  const bell = 1 - q * q;
  return bell * bell;
}

/** A damped spring's value and speed. */
interface ThreadSpring {
  value: number;
  speed: number;
}

/** A spring step never covers more than this much of a period at once: semi-implicit Euler is stable well under it. */
const SPRING_SUBSTEP = 0.25;

/**
 * `spring` moved `dt` seconds toward `target` at `rate` per second under
 * `damping`: critically damped at one, so it never overshoots; under one it
 * swings a little past and back. Semi-implicit Euler in substeps no longer
 * than {@link SPRING_SUBSTEP} of the rate, so a long frame (a throttled tab,
 * a slow screen) moves the spring the same way as many short ones instead of
 * flinging it; it reaches the target to {@link SPRING_EPS}.
 */
function threadSpringStep(spring: ThreadSpring, target: number, dt: number, rate: number, damping: number): void {
  const steps = Math.max(1, Math.ceil((rate * dt) / SPRING_SUBSTEP));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const gap = target - spring.value;
    spring.speed += (gap * rate * rate - 2 * damping * rate * spring.speed) * h;
    spring.value += spring.speed * h;
  }
  if (Math.abs(target - spring.value) < SPRING_EPS && Math.abs(spring.speed) < SPRING_EPS * rate) {
    spring.value = target;
    spring.speed = 0;
  }
}

/** Whether the parting is at rest at nothing: no gap and nothing moving. */
function threadSpringStill(spring: ThreadSpring): boolean {
  return spring.value === 0 && spring.speed === 0;
}

/**
 * How many device px per CSS px the canvas renders at: the device's ratio,
 * capped at {@link MAX_DPR} and by {@link PIXELS}, never under one.
 */
function threadRatio(width: number, height: number, devicePixelRatio: number): number {
  const area = Math.max(1, width * height);
  return Math.max(1, Math.min(MAX_DPR, devicePixelRatio, Math.sqrt(PIXELS / area)));
}

/**
 * The least time between two frames, in ms: {@link REST_FRAME_MS} while only
 * the waves move, since they are slow; none while the parting is live, since
 * a gap that follows the pointer at thirty frames a second stutters.
 */
function threadFrameMs(parting: boolean): number {
  return parting ? 0 : REST_FRAME_MS;
}

/** Whether `surface` is light, so the strands are laid as ink on it rather than lit over it. */
function threadInk(surface: ArrayLike<number>): boolean {
  return 0.2126 * surface[0] + 0.7152 * surface[1] + 0.0722 * surface[2] > 0.5;
}

export {
  COUNT_MAX,
  FOLLOW_RATE,
  FRAY_POWER,
  GAIN_MIN,
  GATHER,
  GATHER_MIN,
  JITTER,
  PART_STRETCH,
  PATH_TURNS_MAX,
  PATH_TURNS_MIN,
  PIXELS,
  REST_FRAME_MS,
  SEED,
  SPREAD,
  SPRING_DAMPING,
  SPRING_EPS,
  SPRING_RATE,
  SPRING_SUBSTEP,
  STRAND_STRIDE,
  TEXTURE_ROWS,
  WAVE_LAG,
  WAVE_SCATTER,
  threadCount,
  threadFrameMs,
  threadHalfWidth,
  threadInk,
  threadLength,
  threadParting,
  threadRatio,
  threadSpringStep,
  threadSpringStill,
  threadStrandTexture,
  threadStrands,
  threadWidths,
};
export type { ThreadSpring, ThreadWidths };
