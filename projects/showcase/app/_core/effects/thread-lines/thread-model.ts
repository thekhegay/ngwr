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

/** Smooth noise in -1..1, continuous in all three arguments. */
type ThreadNoise = (x: number, y: number, z: number) => number;

/** `n` folded into the lattice's 0..255, for any integer. */
const wrap = (n: number): number => ((n % 256) + 256) % 256;
const fade = (t: number): number => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * A small generator in 0..1, the same run for the same seed: a linear
 * congruence on 2^32, in plain arithmetic, which stays exact under 2^53.
 */
function seeded(seed: number): () => number {
  let state = seed % 4294967296;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Value noise on a lattice shuffled from `seed`: smooth, in -1..1, and the
 * same function every time for the same seed, so a spec can pin a frame.
 */
function createThreadNoise(seed = SEED): ThreadNoise {
  const random = seeded(seed);
  const order = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const perm = new Uint8Array(512);
  const values = new Float32Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = order[wrap(i)];
    values[i] = random() * 2 - 1;
  }
  return (x, y, z) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const u = fade(x - xi);
    const v = fade(y - yi);
    const w = fade(z - zi);
    const yw = wrap(yi);
    const zw = wrap(zi);
    const a = perm[wrap(xi)] + yw;
    const b = perm[wrap(xi + 1)] + yw;
    const aa = perm[a] + zw;
    const ab = perm[a + 1] + zw;
    const ba = perm[b] + zw;
    const bb = perm[b + 1] + zw;
    return lerp(
      lerp(lerp(values[aa], values[ba], u), lerp(values[ab], values[bb], u), v),
      lerp(lerp(values[aa + 1], values[ba + 1], u), lerp(values[ab + 1], values[bb + 1], u), v),
      w
    );
  };
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
  const random = seeded(SEED + 0x9e37);
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
