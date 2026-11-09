/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { MAX_DPR } from 'ngwr/animations/core';

/**
 * The pure side of `<wr-flow-lines>`: the spring every pushed point follows,
 * the wake the pointer leaves as a list of weighted segments, the ripples a
 * click sends out, the intro's head, the canvas size and the frame cap. The
 * shader in `flow-gl.ts` reads the numbers from here as uniforms; it owns
 * only what has to be per pixel.
 *
 * The wake is the one idea worth a note. A pushed point follows a damped
 * spring toward where the pointer wants it, and a spring is linear, so the
 * field under a moving pointer is the sum of the field under every place
 * the pointer has been, each weighted by the spring's response to a push
 * that began when the pointer arrived there and ended when it moved on.
 * That response is the step response, which has a closed form, so no state
 * is integrated frame by frame: the frame computes one weight per segment
 * from the clock alone, which makes a slow or jumpy frame rate harmless.
 */

/** A line is never closer to its neighbour than this, in CSS px. */
const SPACING_MIN = 4;
/** The shader's loop bound over the wake's segments: the oldest fall off beyond it. */
const WAKE_MAX = 32;
/** The shader's loop bound over live ripples: a fourth click drops the oldest. */
const RIPPLE_MAX = 3;
/** A new wake segment opens no more often than this, in seconds, and only once the pointer moved {@link SEGMENT_MOVE}. */
const SEGMENT_S = 0.032;
const SEGMENT_MOVE = 2;
/** The spring's natural rate in rad/s: a swing is about two thirds of a second, settled in about one and a half. */
const SPRING_RATE = 10;
/** The spring's damping ratio under a unit `bounce`, and its floor and ceiling. */
const DAMPING_UNIT = 0.26;
const DAMPING_MIN = 0.08;
/** A segment laid at speed pushes harder, by one for every this many CSS px/s, up to the cap: a sweep leaves a wake a crawl does not. */
const BOOST_PER_SPEED = 1 / 1200;
const BOOST_MAX = 1.6;
/** A closed segment is dropped once its envelope falls under this share of a unit push. */
const SETTLE = 0.01;
/** How far a unit `push` moves a line at most, as a share of `reach`, and the most any push may, so the lines never fold. */
const PUSH = 0.14;
const PUSH_MAX = 0.18;
/** The lens the push makes: `(1 - q)^2 * sqrt(q)` of the reach peaks at this inverse, so the peak is the push itself. */
const LENS = 1 / (0.64 * Math.sqrt(0.2));
/** The step response overshoots by this much at most at the unit damping: the spring's own peak. */
const OVERSHOOT = 1 + Math.exp((-DAMPING_UNIT * Math.PI) / Math.sqrt(1 - DAMPING_UNIT * DAMPING_UNIT));
/** A ripple's ring: how fast it travels in CSS px/s, its half width in CSS px, how long it lives in seconds and how far it pushes at its crest. */
const RIPPLE_SPEED = 380;
const RIPPLE_WIDTH = 70;
const RIPPLE_LIFE = 2.2;
const RIPPLE_PUSH = 34;
/** The intro's length in seconds, the stagger between lines in CSS px of head and the head's softness. */
const INTRO_S = 1.6;
const INTRO_STAGGER = 180;
const INTRO_SOFT = 120;
/** How many frames a second at rest, and the gap between them, in ms: the drift needs no more. */
const REST_FPS = 30;
const REST_FRAME_MS = 1000 / REST_FPS;
/** The most device pixels the canvas may hold: a wide hero at a high device ratio renders at a lower one. */
const PIXELS = 2_500_000;
/** The field fades out over this share of the shorter side at every edge, within these bounds, in CSS px. */
const FADE_SHARE = 0.12;
const FADE_MIN = 24;
const FADE_MAX = 96;

/** `spacing` as the shader takes it: a finite number, {@link SPACING_MIN} at least. */
function flowSpacing(spacing: number): number {
  return Math.max(SPACING_MIN, Number.isFinite(spacing) ? spacing : SPACING_MIN);
}

/** The spring's damping ratio under `bounce`: none is critically damped, one is the unit, more swings further. */
function flowDamping(bounce: number): number {
  const b = Number.isFinite(bounce) ? Math.max(0, bounce) : 1;
  return Math.min(1, Math.max(DAMPING_MIN, 1 - (1 - DAMPING_UNIT) * b));
}

/**
 * The unit step response of the spring at `t` seconds: how far a point has
 * gone toward where a push that began at zero wants it. Zero before the push,
 * climbing through one and settling back on it; at the critical damping it
 * never crosses one.
 */
function flowStep(t: number, rate: number, damping: number): number {
  if (t <= 0) return 0;
  const a = damping * rate;
  if (damping >= 1) {
    // Critically damped: the oscillating form divides by zero here.
    return 1 - Math.exp(-a * t) * (1 + a * t);
  }
  const b = rate * Math.sqrt(1 - damping * damping);
  return 1 - Math.exp(-a * t) * (Math.cos(b * t) + (a / b) * Math.sin(b * t));
}

/** How long after a push ends its response is under {@link SETTLE}, in seconds. */
function flowSettle(rate: number, damping: number): number {
  return Math.log(1 / SETTLE) / (damping * rate);
}

/** How far a unit `push` moves a line at most under `reach`, in CSS px, within the fold bound. */
function flowPush(push: number, reach: number): number {
  const p = Number.isFinite(push) ? Math.max(0, push) : 1;
  return Math.min(PUSH * p, PUSH_MAX) * Math.max(0, reach);
}

/**
 * How far a push moves a line `distance` from its centre, as a share of the
 * push: nothing at the centre, so the field never folds there, the whole
 * push at about 0.45 of `reach`, and nothing again at the reach. The
 * shader's own lens, kept here so a spec can read it.
 */
function flowLensAt(distance: number, reach: number): number {
  if (reach <= 0 || distance >= reach) return 0;
  const q = (distance * distance) / (reach * reach);
  return LENS * (1 - q) * (1 - q) * (distance / reach);
}

/** One stretch of the pointer's path: where it was and when, `end` infinite while it is still there, and how much harder it pushes for the speed it was laid at. */
interface FlowSegment {
  x: number;
  y: number;
  start: number;
  end: number;
  boost: number;
}

/** How much harder a segment pushes when the pointer came `distance` CSS px in `seconds` to lay it. */
function flowBoost(distance: number, seconds: number): number {
  if (!(seconds > 0)) return 1;
  return Math.min(BOOST_MAX, 1 + (distance / seconds) * BOOST_PER_SPEED);
}

/**
 * The pointer's wake: the segments of its path still pushing on the field,
 * and the weights the shader reads for them. `move` and `release` record the
 * pointer; `update` turns the clock into weights, drops the settled and
 * returns how many are live. Every time is in seconds.
 */
class FlowWake {
  readonly segments: FlowSegment[] = [];
  /** `x`, `y`, weight and nothing, per segment, in the order of {@link segments}; the shader's uniform. */
  readonly data = new Float32Array(WAKE_MAX * 4);
  /** How many of {@link data}'s entries are live after the last `update`. */
  count = 0;
  /** The box the live segments reach, min x, min y, max x, max y, in CSS px, after the last `update`. */
  readonly box = new Float32Array(4);

  /** The pointer is at `x`, `y` now. */
  move(x: number, y: number, now: number): void {
    const live = this.segments[this.segments.length - 1];
    if (live?.end === Infinity) {
      const moved = Math.hypot(x - live.x, y - live.y);
      if (moved < SEGMENT_MOVE) return;
      // A young segment has next to no weight yet: it slides rather than splits.
      if (now - live.start < SEGMENT_S) {
        live.x = x;
        live.y = y;
        return;
      }
      live.end = now;
    }
    const boost = live ? flowBoost(Math.hypot(x - live.x, y - live.y), now - live.start) : 1;
    if (this.segments.length === WAKE_MAX) this.segments.shift();
    this.segments.push({ x, y, start: now, end: Infinity, boost });
  }

  /** The pointer has left. */
  release(now: number): void {
    const live = this.segments[this.segments.length - 1];
    if (live?.end === Infinity) live.end = now;
  }

  /** Whether a segment is still open under the pointer. */
  pressed(): boolean {
    const live = this.segments[this.segments.length - 1];
    return live?.end === Infinity;
  }

  /** Forgets every segment at once: the still frame and a resize. */
  clear(): void {
    this.segments.length = 0;
    this.count = 0;
  }

  /**
   * The weights at `now` for a push of `push` CSS px at the heart, reaching
   * `reach` px, on a spring of `rate` and `damping`; the settled segments are
   * dropped first. Returns the live count, which is also {@link count}.
   */
  update(now: number, push: number, reach: number, rate: number, damping: number): number {
    const settle = flowSettle(rate, damping);
    const segments = this.segments;
    let kept = 0;
    for (const segment of segments) {
      if (now - segment.end > settle) continue;
      segments[kept++] = segment;
    }
    segments.length = kept;

    const data = this.data;
    const box = this.box;
    box[0] = box[1] = Infinity;
    box[2] = box[3] = -Infinity;
    for (let i = 0; i < kept; i++) {
      const segment = segments[i];
      const weight =
        push *
        segment.boost *
        (flowStep(now - segment.start, rate, damping) - flowStep(now - segment.end, rate, damping));
      const at = i * 4;
      data[at] = segment.x;
      data[at + 1] = segment.y;
      data[at + 2] = weight;
      data[at + 3] = 0;
      if (segment.x - reach < box[0]) box[0] = segment.x - reach;
      if (segment.y - reach < box[1]) box[1] = segment.y - reach;
      if (segment.x + reach > box[2]) box[2] = segment.x + reach;
      if (segment.y + reach > box[3]) box[3] = segment.y + reach;
    }
    if (kept === 0) box[0] = box[1] = box[2] = box[3] = 0;
    this.count = kept;
    return kept;
  }
}

/** One ripple: where the click was and when. */
interface FlowRipple {
  x: number;
  y: number;
  start: number;
}

/**
 * The ripples live from clicks: {@link RIPPLE_MAX} at most, the oldest giving
 * way. `update` drops the spent and lays `x`, `y`, age and crest push per
 * ripple into `data`.
 */
class FlowRipples {
  readonly ripples: FlowRipple[] = [];
  readonly data = new Float32Array(RIPPLE_MAX * 4);
  count = 0;

  add(x: number, y: number, now: number): void {
    if (this.ripples.length === RIPPLE_MAX) this.ripples.shift();
    this.ripples.push({ x, y, start: now });
  }

  clear(): void {
    this.ripples.length = 0;
    this.count = 0;
  }

  update(now: number): number {
    const ripples = this.ripples;
    let kept = 0;
    for (const ripple of ripples) {
      if (now - ripple.start >= RIPPLE_LIFE) continue;
      ripples[kept++] = ripple;
    }
    ripples.length = kept;
    for (let i = 0; i < kept; i++) {
      const ripple = ripples[i];
      const at = i * 4;
      this.data[at] = ripple.x;
      this.data[at + 1] = ripple.y;
      this.data[at + 2] = now - ripple.start;
      this.data[at + 3] = RIPPLE_PUSH;
    }
    this.count = kept;
    return kept;
  }
}

/**
 * How far a ripple's ring pushes at `distance` from its centre, `age`
 * seconds in, as a share of its crest push: a bell riding out at
 * {@link RIPPLE_SPEED}, fading as it goes and gone at {@link RIPPLE_LIFE},
 * softened by its own width at the centre so the field never folds there.
 * The shader's own formula, kept here so a spec can read it.
 */
function flowRippleAt(distance: number, age: number): number {
  if (age <= 0 || age >= RIPPLE_LIFE) return 0;
  const life = 1 - age / RIPPLE_LIFE;
  const s = (distance - age * RIPPLE_SPEED) / RIPPLE_WIDTH;
  return life * Math.exp(-s * s) * (distance / Math.hypot(distance, RIPPLE_WIDTH));
}

/**
 * Where the intro's head is `elapsed` seconds in, in CSS px along the lines
 * from the edge it draws from, for a field `length` px long: eased out, past
 * the far edge by the stagger and the softness once done, so the slowest line
 * is whole too. Infinity once the intro is over or when there is none.
 */
function flowIntroHead(elapsed: number, length: number): number {
  if (elapsed >= INTRO_S) return Infinity;
  const t = Math.max(0, elapsed) / INTRO_S;
  const eased = 1 - (1 - t) ** 3;
  return eased * (length + INTRO_STAGGER + INTRO_SOFT);
}

/** The render ratio: the device ratio, {@link MAX_DPR} at most, lowered to keep the canvas under {@link PIXELS}, never under one. */
function flowRatio(width: number, height: number, devicePixelRatio: number): number {
  const area = Math.max(1, width * height);
  return Math.max(1, Math.min(MAX_DPR, devicePixelRatio, Math.sqrt(PIXELS / area)));
}

/** The shortest frame, in ms: none while anything beyond the drift moves, {@link REST_FRAME_MS} otherwise. */
function flowFrameMs(live: boolean): number {
  return live ? 0 : REST_FRAME_MS;
}

/** How far in from every edge the field is faded, in CSS px, for a region of this size. */
function flowFade(width: number, height: number): number {
  return Math.min(FADE_MAX, Math.max(FADE_MIN, FADE_SHARE * Math.min(width, height)));
}

/** Whether `surface` is light, so the lines are laid as ink on it rather than lit over it. */
function flowInk(surface: ArrayLike<number>): boolean {
  return 0.2126 * surface[0] + 0.7152 * surface[1] + 0.0722 * surface[2] > 0.5;
}

export {
  BOOST_MAX,
  BOOST_PER_SPEED,
  DAMPING_MIN,
  DAMPING_UNIT,
  FADE_MAX,
  FADE_MIN,
  FADE_SHARE,
  FlowRipples,
  FlowWake,
  INTRO_S,
  INTRO_SOFT,
  INTRO_STAGGER,
  LENS,
  OVERSHOOT,
  PIXELS,
  PUSH,
  PUSH_MAX,
  REST_FRAME_MS,
  RIPPLE_LIFE,
  RIPPLE_MAX,
  RIPPLE_PUSH,
  RIPPLE_SPEED,
  RIPPLE_WIDTH,
  SEGMENT_MOVE,
  SEGMENT_S,
  SETTLE,
  SPACING_MIN,
  SPRING_RATE,
  WAKE_MAX,
  flowBoost,
  flowDamping,
  flowFade,
  flowFrameMs,
  flowInk,
  flowIntroHead,
  flowLensAt,
  flowPush,
  flowRatio,
  flowRippleAt,
  flowSettle,
  flowSpacing,
  flowStep,
};
export type { FlowRipple, FlowSegment };
