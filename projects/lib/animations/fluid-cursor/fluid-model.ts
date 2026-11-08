/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type WrNoise, createNoise } from 'ngwr/animations/core';

/** How many particles live at once: past this a new one takes the slot of the oldest. */
const CAP = 256;
/** A particle about this often along the pointer's path, in px. */
const EMIT_GAP = 5;
/** The most particles one move may emit: a long jump spreads them out rather than bunching them at its start. */
const EMIT_MAX = 40;
/** How long a particle lives, in ms, drawn between the two. */
const LIFE_MIN = 700;
const LIFE_MAX = 1000;
/** A particle's radius at birth and at death, in px, before its own size jitter. */
const RADIUS = 16;
const RADIUS_END = 40;
/** How much of its size a particle is born larger or smaller, either way. */
const SIZE_JITTER = 0.2;
/** How far from the path a particle is born, in px, either way. */
const JITTER = 2;
/** How much of the pointer's velocity a particle is born with. */
const INHERIT = 0.35;
/** The pointer's velocity is clamped to this, in px per ms: a jump across the box is not a gust. */
const SPEED_MAX = 2.5;
/** How much velocity a particle is born with on its own, in px per ms, either way per axis. */
const SCATTER = 0.06;
/** How much of its own velocity a particle keeps per 60Hz frame. */
const DRAG = 0.92;
/** How long a particle takes to reach full strength after its birth, in ms, so it never pops. */
const FADE_IN = 60;
/** Noise cells per px of the flow field: one swirl every so many px. */
const NOISE_SCALE = 1 / 140;
/** Noise cells per ms: the field itself drifts, so a still trail does not sit in one eddy. */
const NOISE_DRIFT = 0.0004;
/** How fast the flow runs per unit of noise gradient, in px per ms. */
const CURL = 5;
/** Half the step the field's gradient is read over, in px. */
const CURL_EPS = 1;
/** How many colours the trail cycles through, from tint A to tint B. */
const TINTS = 5;
/** Over how many px of stroke the colour goes from A to B and back. */
const TINT_CYCLE = 1400;
/** The flow field is seeded, so a spec can pin a frame. */
const SEED = 0x51f1d;

/**
 * The particles, one slot each, in parallel arrays: a slot is live while its
 * `age` is under its `life`. Slots are taken in a ring, so the one a new
 * particle displaces when the pool is full is the oldest.
 */
interface FluidPool {
  readonly cap: number;
  readonly x: Float32Array<ArrayBuffer>;
  readonly y: Float32Array<ArrayBuffer>;
  readonly vx: Float32Array<ArrayBuffer>;
  readonly vy: Float32Array<ArrayBuffer>;
  readonly age: Float32Array<ArrayBuffer>;
  readonly life: Float32Array<ArrayBuffer>;
  /** A particle's own size, as a share of the common radius. */
  readonly size: Float32Array<ArrayBuffer>;
  /** Which of the `TINTS` colours a particle wears. */
  readonly tint: Uint8Array<ArrayBuffer>;
  /** The slot the next particle takes. */
  next: number;
  /** How many slots are live, as of the last advance or emission. */
  alive: number;
  /** How far past the last move's end the next particle is due, in px. */
  carry: number;
  /** How far the pointer has drawn in all, in px: the colour follows it. */
  phase: number;
  /** In 0..1, for the jitter; a spec passes its own. */
  readonly random: () => number;
}

/** An empty pool of `cap` slots. */
function fluidPool(cap = CAP, random: () => number = Math.random): FluidPool {
  const pool: FluidPool = {
    cap,
    x: new Float32Array(cap),
    y: new Float32Array(cap),
    vx: new Float32Array(cap),
    vy: new Float32Array(cap),
    age: new Float32Array(cap),
    life: new Float32Array(cap),
    size: new Float32Array(cap),
    tint: new Uint8Array(cap),
    next: 0,
    alive: 0,
    carry: 0,
    phase: 0,
    random,
  };
  fluidClear(pool);
  return pool;
}

/** Every slot dead, the ring and the path forgotten. */
function fluidClear(pool: FluidPool): void {
  pool.age.fill(1);
  pool.life.fill(0);
  pool.next = 0;
  pool.alive = 0;
  pool.carry = 0;
  pool.phase = 0;
}

/** Whether slot `i` holds a live particle. */
function fluidLive(pool: FluidPool, i: number): boolean {
  return pool.age[i] < pool.life[i];
}

/** The smooth flow field the particles ride, in -1..1, continuous in place and time. */
function createFluidNoise(seed = SEED): WrNoise {
  return createNoise(seed);
}

/**
 * The pointer's velocity over a move of `dx`, `dy` px in `dt` ms, into `out`,
 * in px per ms and never faster than `SPEED_MAX`; a move with no time to it
 * counts as a slow one.
 */
function fluidVelocity(dx: number, dy: number, dt: number, out: Float32Array): void {
  const ms = Math.max(dt, 8);
  let vx = dx / ms;
  let vy = dy / ms;
  const speed = Math.hypot(vx, vy);
  if (speed > SPEED_MAX) {
    vx *= SPEED_MAX / speed;
    vy *= SPEED_MAX / speed;
  }
  out[0] = vx;
  out[1] = vy;
}

/** Which colour a particle born `phase` px into the stroke wears: A to B and back over one cycle. */
function fluidTint(phase: number): number {
  const u = (phase / TINT_CYCLE) % 1;
  const tri = u < 0.5 ? u * 2 : 2 - u * 2;
  return Math.round(tri * (TINTS - 1));
}

/**
 * Emits particles along the pointer's move from (`x0`, `y0`) to (`x1`, `y1`),
 * one every `EMIT_GAP` px, carrying the remainder from the last move so a
 * stroke is one even run across events; never more than `EMIT_MAX`, spread
 * over the whole move when it would be. A move of no length is the start of
 * a stroke and emits one. Each particle is born with `INHERIT` of the
 * pointer's velocity (`vx`, `vy`, px per ms) plus a little scatter, a jittered
 * place and size, a life of its own and the colour the stroke is at. Returns
 * how many were emitted.
 */
function fluidEmit(pool: FluidPool, x0: number, y0: number, x1: number, y1: number, vx: number, vy: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) {
    spawn(pool, x1, y1, vx, vy);
    pool.carry = EMIT_GAP;
    return 1;
  }
  const step = Math.max(EMIT_GAP, dist / EMIT_MAX);
  let s = pool.carry;
  let n = 0;
  while (s <= dist && n < EMIT_MAX) {
    const t = s / dist;
    spawn(pool, x0 + dx * t, y0 + dy * t, vx, vy);
    s += step;
    n++;
  }
  pool.carry = Math.min(EMIT_GAP, s - dist);
  pool.phase += dist;
  return n;
}

function spawn(pool: FluidPool, x: number, y: number, vx: number, vy: number): void {
  const i = pool.next;
  const random = pool.random;
  if (!fluidLive(pool, i)) pool.alive++;
  pool.x[i] = x + (random() * 2 - 1) * JITTER;
  pool.y[i] = y + (random() * 2 - 1) * JITTER;
  pool.vx[i] = vx * INHERIT + (random() * 2 - 1) * SCATTER;
  pool.vy[i] = vy * INHERIT + (random() * 2 - 1) * SCATTER;
  pool.age[i] = 0;
  pool.life[i] = LIFE_MIN + random() * (LIFE_MAX - LIFE_MIN);
  pool.size[i] = 1 + (random() * 2 - 1) * SIZE_JITTER;
  pool.tint[i] = fluidTint(pool.phase);
  pool.next = (i + 1) % pool.cap;
}

/**
 * The flow at (`x`, `y`) `time` ms in, into `out`, in px per ms: the curl of
 * the noise, read as a central difference, so the field turns in eddies and
 * never gathers the particles into a heap or thins them out.
 */
function fluidCurl(noise: WrNoise, x: number, y: number, time: number, out: Float32Array): void {
  const s = NOISE_SCALE;
  const t = time * NOISE_DRIFT;
  const e = CURL_EPS;
  const dndx = (noise((x + e) * s, y * s, t) - noise((x - e) * s, y * s, t)) / (2 * e);
  const dndy = (noise(x * s, (y + e) * s, t) - noise(x * s, (y - e) * s, t)) / (2 * e);
  out[0] = CURL * dndy;
  out[1] = -CURL * dndx;
}

/** A particle's radius `age` ms into a life of `life` ms, in px: it grows as it dissolves. */
function fluidRadius(age: number, life: number): number {
  const t = Math.min(1, Math.max(0, age / life));
  return RADIUS + (RADIUS_END - RADIUS) * t;
}

/** How much of its colour a particle shows `age` ms into a life of `life` ms, 0 to 1: in fast, out slow. */
function fluidAlpha(age: number, life: number): number {
  if (age < 0 || age >= life) return 0;
  const t = age / life;
  const fadeIn = Math.min(1, age / FADE_IN);
  return (1 - t) ** 1.6 * fadeIn;
}

/**
 * One step of `dt` ms on slot `i`: the particle ages, its own velocity
 * decays by `DRAG`, and it moves by that velocity plus the flow at its place.
 * Returns whether it is still alive.
 */
function fluidStep(pool: FluidPool, i: number, dt: number, noise: WrNoise, time: number, flow: Float32Array): boolean {
  const age = pool.age[i] + dt;
  if (age >= pool.life[i]) {
    pool.age[i] = pool.life[i];
    return false;
  }
  pool.age[i] = age;
  const drag = DRAG ** (dt / 16.7);
  pool.vx[i] *= drag;
  pool.vy[i] *= drag;
  fluidCurl(noise, pool.x[i], pool.y[i], time, flow);
  pool.x[i] += (pool.vx[i] + flow[0]) * dt;
  pool.y[i] += (pool.vy[i] + flow[1]) * dt;
  return true;
}

/** Every live particle moved `dt` ms on; sets and returns how many are left. */
function fluidAdvance(pool: FluidPool, dt: number, noise: WrNoise, time: number, flow: Float32Array): number {
  let alive = 0;
  for (let i = 0; i < pool.cap; i++) {
    if (!fluidLive(pool, i)) continue;
    if (fluidStep(pool, i, dt, noise, time, flow)) alive++;
  }
  pool.alive = alive;
  return alive;
}

/** How the trail is laid over the page, per scheme. */
interface FluidBlend {
  /** The canvas composite the particles are drawn with. */
  readonly composite: GlobalCompositeOperation;
  /** How much of its colour a particle shows at most. */
  readonly strength: number;
}

/**
 * The blend for a surface of the given 0..1 sRGB channels. On a dark surface
 * the particles add up (`lighter`), so a trail glows where it is thick; added
 * colour on a light surface only saturates to white, so there they are laid
 * over one another at a lower strength instead, and pool like ink.
 */
function fluidBlend(surface: ArrayLike<number>): FluidBlend {
  const luminance = 0.2126 * surface[0] + 0.7152 * surface[1] + 0.0722 * surface[2];
  return luminance < 0.5 ? { composite: 'lighter', strength: 0.18 } : { composite: 'source-over', strength: 0.14 };
}

export {
  CAP,
  CURL,
  DRAG,
  EMIT_GAP,
  EMIT_MAX,
  FADE_IN,
  INHERIT,
  JITTER,
  LIFE_MAX,
  LIFE_MIN,
  NOISE_DRIFT,
  NOISE_SCALE,
  RADIUS,
  RADIUS_END,
  SCATTER,
  SEED,
  SIZE_JITTER,
  SPEED_MAX,
  TINTS,
  TINT_CYCLE,
  createFluidNoise,
  fluidAdvance,
  fluidAlpha,
  fluidBlend,
  fluidClear,
  fluidCurl,
  fluidEmit,
  fluidLive,
  fluidPool,
  fluidRadius,
  fluidStep,
  fluidTint,
  fluidVelocity,
};
export type { FluidBlend, FluidPool };
