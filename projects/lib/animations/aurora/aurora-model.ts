/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { clamp } from 'ngwr/utils';

import type { WrAuroraEdge } from './types';

/**
 * The pure side of `<wr-aurora>`: the inputs as the shader takes them, the
 * curtain's vertical profile, the ray gain, the intro, the drift toward the
 * pointer, the colour stops in OKLCh, the canvas size and the frame cap. The
 * shader in `aurora-gl.ts` reads these numbers as uniforms and owns only what
 * has to be per pixel; the formulas it shares with this file (the profile,
 * the ray gain, the stop interpolation) are written here too, so a spec can
 * read them.
 *
 * Colour is the one idea worth a note. The three stops are mixed in OKLCh,
 * not sRGB: lightness and chroma move linearly and the hue walks the shorter
 * arc, so the colour between two stops is as saturated as either and never
 * the grey an sRGB mix of two hues falls into. The conversion happens once
 * per stop here; the shader interpolates in that space and converts back.
 */

/** The curtain reaches this share of the region at least and at most. */
const HEIGHT_MIN = 0.1;
const HEIGHT_MAX = 1;
/** The shader's loop bound over the curtains. */
const LAYERS_MAX = 3;
/** How far the free edge's wave moves it at a unit `amplitude`, as a share of the curtain's height, at the wave's full swing. */
const WAVE = 0.35;
/** How many broad waves cross the width at a unit `scale`, and how many fine rays. */
const WAVE_FREQ = 2.2;
const RAY_FREQ = 26;
/** How fast the wave, the rays and the hue move at a unit `speed`, in noise cells per second. */
const WAVE_DRIFT = 0.055;
const RAY_DRIFT = 0.24;
const HUE_DRIFT = 0.08;
/** The vertical profile's veil: what is left at the anchored edge, how bright the veil is at the free edge and how fast it grows there. */
const PROFILE_FLOOR = 0.06;
const VEIL = 0.36;
const VEIL_POWER = 1.4;
/** The bright lower border: its height over the veil, where it sits and its half width, in shares of the curtain's height; and how soft the free edge is past it. */
const BORDER = 0.85;
const BORDER_AT = 0.9;
const BORDER_WIDTH = 0.16;
const EDGE_SOFT = 0.16;
/** The folds: how dim the curtain is between its bright knots. */
const FOLD_FLOOR = 0.55;
/** The rays: how bright the brightest ray is over the veil at a unit `rays`, how fast a ray fades from the free edge toward the root over its length, and the shortest ray's length as a share of the longest. */
const RAY_GAIN = 0.9;
const RAY_FALL = 1.8;
const RAY_SHORT = 0.3;
/** The intro's length in seconds and how far the curtain reaches when it begins. */
const INTRO_S = 2.4;
const INTRO_REACH_START = 0.3;
/** The drift toward the pointer: its approach rate per second, how far it moves the curtain across (share of the width) and how much it stretches it toward the pointer. */
const FOLLOW_RATE = 1.4;
const FOLLOW_REACH = 0.08;
const FOLLOW_LIFT = 0.14;
/** The drift is settled once it is within this share of the width. */
const FOLLOW_SETTLE = 0.0005;
/** The sides fade over this share of the width, within these bounds, in CSS px. */
const SIDE_SHARE = 0.22;
const SIDE_MIN = 48;
const SIDE_MAX = 360;
/** The canvas: device px per CSS px at most, at least, and the most pixels it may hold. An aurora is soft, so it is drawn small and the browser scales it up. */
const RATIO_MAX = 0.5;
const RATIO_MIN = 0.15;
const PIXELS = 400_000;
/** Frames a second, and the gap between them in ms: slow light needs no more. */
const FPS = 30;
const FRAME_MS = 1000 / FPS;
/** On a light surface the curtain is a wash: its peak alpha, how much it lifts the stops' lightness and how much it gains their chroma. */
const WASH_ALPHA = 0.7;
const WASH_LIFT = 0.06;
const WASH_CHROMA = 1.12;
/** On a dark surface it is light: its peak strength, and how far the brightest spots are lifted toward white. */
const GLOW_PEAK = 1;
const GLOW_LIFT = 0.1;

/** `height` as the shader takes it: a finite share of the region within the bounds. */
function auroraHeight(height: number): number {
  return clamp(Number.isFinite(height) ? height : 0.5, HEIGHT_MIN, HEIGHT_MAX);
}

/** `layers` as the shader takes it: a whole number from one to {@link LAYERS_MAX}. */
function auroraLayers(layers: number): number {
  return clamp(Math.round(Number.isFinite(layers) ? layers : 2), 1, LAYERS_MAX);
}

/** A share, `rays` and the like: finite and within zero and one. */
function auroraShare(value: number, fallback: number): number {
  return clamp(Number.isFinite(value) ? value : fallback, 0, 1);
}

/** A multiplier, `scale`, `amplitude`, `speed` and `glow`: finite and never negative; `scale` never nothing. */
function auroraFactor(value: number, fallback: number, min = 0): number {
  return Math.max(min, Number.isFinite(value) ? value : fallback);
}

/** The free edge's wave as a share of the curtain's height under `amplitude`. */
function auroraWave(amplitude: number): number {
  return WAVE * auroraFactor(amplitude, 1);
}

/** The edge's sign for the shader: one hangs from the top, minus one from the bottom. */
function auroraEdgeSign(edge: WrAuroraEdge): 1 | -1 {
  return edge === 'bottom' ? -1 : 1;
}

/**
 * How bright the curtain is `v` of the way from the anchored edge to the free
 * edge: a veil, faint at the root and growing toward the free edge, and over
 * it a bright border just short of that edge, the way an aurora is brightest
 * at its lower border; past the edge both fall softly to nothing. Never over
 * one. The shader's own formula.
 */
function auroraProfile(v: number): number {
  const vc = clamp(v, 0, 1);
  const veil = PROFILE_FLOOR + (VEIL - PROFILE_FLOOR) * Math.pow(vc, VEIL_POWER);
  const border = BORDER * Math.exp(-(((v - BORDER_AT) / BORDER_WIDTH) ** 2));
  const edge = 1 - smoothstep(1 - EDGE_SOFT, 1 + EDGE_SOFT * 0.6, v);
  return Math.min(1, veil + border) * edge;
}

/**
 * How bright a ray of brightness `bright` (0..1) and length `length` (0..1,
 * the share of the longest) is `v` of the way from the anchored edge to the
 * free edge: whole at the free edge and fading toward the root, the shorter
 * ray the faster. The shader's own formula.
 */
function auroraRay(bright: number, length: number, v: number): number {
  const len = RAY_SHORT + (1 - RAY_SHORT) * clamp(length, 0, 1);
  return clamp(bright, 0, 1) * Math.exp((-(1 - clamp(v, 0, 1)) * RAY_FALL) / len);
}

/**
 * The curtain's brightness at `v` before the folds and the fades, for a ray
 * of `bright` and `length` there, under `rays`: at none the smooth profile
 * alone, at one half the veil, the border beaded by the ray and the ray
 * itself at {@link RAY_GAIN}; never over one. The shader's own formula.
 */
function auroraIntensity(v: number, bright: number, length: number, rays: number): number {
  const vc = clamp(v, 0, 1);
  const r = clamp(rays, 0, 1);
  const veil = PROFILE_FLOOR + (VEIL - PROFILE_FLOOR) * Math.pow(vc, VEIL_POWER);
  const border = BORDER * Math.exp(-(((v - BORDER_AT) / BORDER_WIDTH) ** 2));
  const bead = 1 + r * (0.6 + 0.4 * clamp(bright, 0, 1) - 1);
  const edge = 1 - smoothstep(1 - EDGE_SOFT, 1 + EDGE_SOFT * 0.6, v);
  return Math.min(1, veil * (1 - 0.5 * r) + border * bead + r * RAY_GAIN * auroraRay(bright, length, v)) * edge;
}

/**
 * The intro `elapsed` seconds in: how far in the curtain has faded and how
 * far it reaches, both as shares, both eased out and one once it is over.
 */
function auroraIntro(elapsed: number): [fade: number, reach: number] {
  if (elapsed >= INTRO_S) return [1, 1];
  const t = clamp(elapsed, 0, INTRO_S) / INTRO_S;
  const eased = 1 - (1 - t) ** 3;
  return [eased, INTRO_REACH_START + (1 - INTRO_REACH_START) * eased];
}

/** `current` moved toward `target` over `dt` seconds at `rate`: an exponential approach, the same path on a fast and a slow screen. */
function auroraApproach(current: number, target: number, dt: number, rate = FOLLOW_RATE): number {
  return target + (current - target) * Math.exp(-rate * Math.max(0, dt));
}

/**
 * Where the drift wants to be for a pointer at `x`, `y` over a region of
 * `width` by `height` whose curtain reaches `reach` of it: across, as a share
 * of the width toward the pointer, and the stretch toward it, as a share of
 * the curtain's height. Nothing for no pointer.
 */
function auroraFollowTarget(
  x: number,
  y: number,
  width: number,
  height: number,
  reach: number
): [across: number, stretch: number] {
  if (!Number.isFinite(x) || !Number.isFinite(y) || width <= 0 || height <= 0) return [0, 0];
  const across = clamp(x / width - 0.5, -0.5, 0.5) * 2 * FOLLOW_REACH;
  const stretch = clamp((y / height - reach) / Math.max(reach, 0.01), -1, 1) * FOLLOW_LIFT;
  return [across, stretch];
}

/** Whether the drift still moves: either part farther than the settle from its target. */
function auroraDriftLive(across: number, stretch: number, target: readonly [number, number]): boolean {
  return Math.abs(across - target[0]) > FOLLOW_SETTLE || Math.abs(stretch - target[1]) > FOLLOW_SETTLE;
}

/** How far in from each side the curtain is faded, in CSS px, for a region this wide. */
function auroraSideFade(width: number): number {
  return clamp(SIDE_SHARE * width, SIDE_MIN, SIDE_MAX);
}

/** The render ratio, device px per CSS px: {@link RATIO_MAX} at most, lowered to keep the canvas under {@link PIXELS}, never under {@link RATIO_MIN}. The device ratio plays no part: the drawing is soft and the browser's upscale is free. */
function auroraRatio(width: number, height: number): number {
  const area = Math.max(1, width * height);
  return clamp(Math.sqrt(PIXELS / area), RATIO_MIN, RATIO_MAX);
}

/** Whether `surface` is light, so the curtain is laid as a wash rather than as light. */
function auroraLight(surface: ArrayLike<number>): boolean {
  return 0.2126 * surface[0] + 0.7152 * surface[1] + 0.0722 * surface[2] > 0.5;
}

// Colour

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toGamma = (c: number): number => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

/** An sRGB colour, channels 0..1, as OKLab. */
function auroraSrgbToOklab(rgb: ArrayLike<number>): [L: number, a: number, b: number] {
  const r = toLinear(rgb[0]);
  const g = toLinear(rgb[1]);
  const b = toLinear(rgb[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** An OKLab colour as sRGB, channels 0..1, clipped to the gamut. */
function auroraOklabToSrgb(lab: ArrayLike<number>): [number, number, number] {
  const l = (lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2]) ** 3;
  const m = (lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2]) ** 3;
  const s = (lab[0] - 0.0894841775 * lab[1] - 1.291485548 * lab[2]) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [toGamma(clamp(r, 0, 1)), toGamma(clamp(g, 0, 1)), toGamma(clamp(b, 0, 1))];
}

/** An sRGB colour as OKLCh: lightness, chroma and the hue in radians, which is what the shader interpolates. */
function auroraStop(rgb: ArrayLike<number>): [L: number, C: number, h: number] {
  const [L, a, b] = auroraSrgbToOklab(rgb);
  return [L, Math.hypot(a, b), Math.atan2(b, a)];
}

/** An OKLCh colour as sRGB. */
function auroraStopToSrgb(lch: ArrayLike<number>): [number, number, number] {
  return auroraOklabToSrgb([lch[0], lch[1] * Math.cos(lch[2]), lch[1] * Math.sin(lch[2])]);
}

/** The signed turn from hue `from` to hue `to` along the shorter arc, in radians. */
function auroraHueArc(from: number, to: number): number {
  const tau = Math.PI * 2;
  return ((((to - from + Math.PI) % tau) + tau) % tau) - Math.PI;
}

/**
 * The colour `u` of the way across the three stops, in OKLCh: the first at
 * nought, the second midway, the third at one, each held on a short plateau
 * by the smoothstep between them; lightness and chroma move linearly and the
 * hue walks the shorter arc. The shader's own formula.
 */
function auroraColorAt(stops: readonly ArrayLike<number>[], u: number): [L: number, C: number, h: number] {
  const x = clamp(u, 0, 1);
  const [a, b, t] = x < 0.5 ? [stops[0], stops[1], x * 2] : [stops[1], stops[2], x * 2 - 1];
  const s = t * t * (3 - 2 * t);
  return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + auroraHueArc(a[2], b[2]) * s];
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export {
  BORDER,
  BORDER_AT,
  BORDER_WIDTH,
  EDGE_SOFT,
  FOLD_FLOOR,
  FOLLOW_LIFT,
  FOLLOW_RATE,
  FOLLOW_REACH,
  FOLLOW_SETTLE,
  FPS,
  FRAME_MS,
  GLOW_LIFT,
  GLOW_PEAK,
  HEIGHT_MAX,
  HEIGHT_MIN,
  HUE_DRIFT,
  INTRO_REACH_START,
  INTRO_S,
  LAYERS_MAX,
  PIXELS,
  PROFILE_FLOOR,
  RATIO_MAX,
  RATIO_MIN,
  RAY_DRIFT,
  RAY_FALL,
  RAY_FREQ,
  RAY_GAIN,
  RAY_SHORT,
  SIDE_MAX,
  SIDE_MIN,
  SIDE_SHARE,
  VEIL,
  VEIL_POWER,
  WASH_ALPHA,
  WASH_CHROMA,
  WASH_LIFT,
  WAVE,
  WAVE_DRIFT,
  WAVE_FREQ,
  auroraApproach,
  auroraColorAt,
  auroraDriftLive,
  auroraEdgeSign,
  auroraFactor,
  auroraFollowTarget,
  auroraHeight,
  auroraHueArc,
  auroraIntensity,
  auroraIntro,
  auroraLayers,
  auroraLight,
  auroraOklabToSrgb,
  auroraProfile,
  auroraRatio,
  auroraRay,
  auroraShare,
  auroraSideFade,
  auroraSrgbToOklab,
  auroraStop,
  auroraStopToSrgb,
  auroraWave,
};
