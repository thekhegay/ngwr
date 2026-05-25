/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Squircle path computation — port of the algorithm from `figma-squircle`
 * (https://github.com/phamfoo/figma-squircle, MIT). Generates an SVG `d`
 * string for a smooth-corner rectangle.
 */

/** Per-corner radii for the squircle. */
type WrSquircleCorners = {
  readonly topLeft: number;
  readonly topRight: number;
  readonly bottomRight: number;
  readonly bottomLeft: number;
};

type CornerParams = {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly p: number;
  readonly arcSectionLength: number;
  readonly cornerRadius: number;
};

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function cornerParams(cornerRadius: number, cornerSmoothing: number, budget: number): CornerParams {
  if (cornerRadius <= 0) {
    return { a: 0, b: 0, c: 0, d: 0, p: 0, arcSectionLength: 0, cornerRadius: 0 };
  }
  let p = (1 + cornerSmoothing) * cornerRadius;
  // Cap smoothing so the corner fits within the available budget.
  let s = cornerSmoothing;
  const maxSmoothing = budget / cornerRadius - 1;
  if (maxSmoothing < s) {
    s = Math.max(0, maxSmoothing);
    p = (1 + s) * cornerRadius;
  }
  const arcMeasure = 90 * (1 - s);
  const arcSectionLength = Math.sin(toRadians(arcMeasure / 2)) * cornerRadius * Math.SQRT2;
  const angleAlpha = (90 - arcMeasure) / 2;
  const p3p4 = cornerRadius * Math.tan(toRadians(angleAlpha / 2));
  const angleBeta = 45 * s;
  const c = p3p4 * Math.cos(toRadians(angleBeta));
  const d = c * Math.tan(toRadians(angleBeta));
  const b = (p - arcSectionLength - c - d) / 3;
  const a = 2 * b;
  return { a, b, c, d, p, arcSectionLength, cornerRadius };
}

/** Cubic-bezier + arc commands for one corner — anchored at its `p` distance. */
function drawCorner(c: CornerParams, rotation: 'tl' | 'tr' | 'br' | 'bl'): string {
  if (c.cornerRadius === 0) return '';
  const { a, b, c: cc, d, arcSectionLength, cornerRadius } = c;
  switch (rotation) {
    case 'tr':
      return `c ${a} 0 ${a + b} 0 ${a + b + cc} ${d} a ${cornerRadius} ${cornerRadius} 0 0 1 ${arcSectionLength} ${arcSectionLength} c ${d} ${cc} ${d} ${b + cc} ${d} ${a + b + cc}`;
    case 'br':
      return `c 0 ${a} 0 ${a + b} ${-d} ${a + b + cc} a ${cornerRadius} ${cornerRadius} 0 0 1 ${-arcSectionLength} ${arcSectionLength} c ${-cc} ${d} ${-(b + cc)} ${d} ${-(a + b + cc)} ${d}`;
    case 'bl':
      return `c ${-a} 0 ${-(a + b)} 0 ${-(a + b + cc)} ${-d} a ${cornerRadius} ${cornerRadius} 0 0 1 ${-arcSectionLength} ${-arcSectionLength} c ${-d} ${-cc} ${-d} ${-(b + cc)} ${-d} ${-(a + b + cc)}`;
    case 'tl':
      return `c 0 ${-a} 0 ${-(a + b)} ${d} ${-(a + b + cc)} a ${cornerRadius} ${cornerRadius} 0 0 1 ${arcSectionLength} ${-arcSectionLength} c ${cc} ${-d} ${b + cc} ${-d} ${a + b + cc} ${-d}`;
  }
}

/**
 * Generate an SVG `d` string for a squircle (smooth-corner rectangle).
 *
 * @param width Box width in user units.
 * @param height Box height in user units.
 * @param radius Either a single number applied to all four corners or a
 *               `WrSquircleCorners` object with per-corner radii.
 * @param smoothing 0–1. `0` = standard rounded rectangle; `1` = full
 *                  iOS-style smooth corner. @default 1
 */
function squirclePath(width: number, height: number, radius: number | WrSquircleCorners, smoothing = 1): string {
  const corners: WrSquircleCorners =
    typeof radius === 'number'
      ? { topLeft: radius, topRight: radius, bottomRight: radius, bottomLeft: radius }
      : radius;

  // Budget per corner = half of the shorter dimension.
  const budget = Math.min(width / 2, height / 2);

  const tl = cornerParams(Math.min(corners.topLeft, budget), smoothing, budget);
  const tr = cornerParams(Math.min(corners.topRight, budget), smoothing, budget);
  const br = cornerParams(Math.min(corners.bottomRight, budget), smoothing, budget);
  const bl = cornerParams(Math.min(corners.bottomLeft, budget), smoothing, budget);

  return [
    `M ${tl.p} 0`,
    `L ${width - tr.p} 0`,
    drawCorner(tr, 'tr'),
    `L ${width} ${height - br.p}`,
    drawCorner(br, 'br'),
    `L ${bl.p} ${height}`,
    drawCorner(bl, 'bl'),
    `L 0 ${tl.p}`,
    drawCorner(tl, 'tl'),
    'Z',
  ]
    .filter(Boolean)
    .join(' ');
}

export { squirclePath };
export type { WrSquircleCorners };
