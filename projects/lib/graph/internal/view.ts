/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The arithmetic of zooming and panning, with no DOM in it.
 *
 * A point `p` of the drawing lands at `origin + (x, y) + k * p` in the viewport,
 * where `origin` is where the stage sits before any transform. Everything here
 * works in viewport pixels, so nothing depends on the reading direction.
 */

/** How much of the drawing a pan always leaves inside the viewport, in pixels. */
const KEEP_VISIBLE = 48;

function clampAxis(offset: number, origin: number, extent: number, room: number): number {
  const keep = Math.min(KEEP_VISIBLE, extent, room);
  const min = keep - extent - origin;
  const max = room - keep - origin;
  return Math.min(max, Math.max(min, offset));
}

function scrollAxis(offset: number, origin: number, extent: number, start: number, end: number, by: number): number {
  const from = origin + offset;
  if (by > 0 && from < start) return offset + Math.min(by, start - from);
  if (by < 0 && from + extent > end) return offset + Math.max(by, end - from - extent);
  return offset;
}

/** Where the drawing is: an offset in pixels from its natural place, and a scale. */
export interface GraphTransform {
  readonly x: number;
  readonly y: number;
  readonly k: number;
}

/** The viewport's box, and where the untransformed stage starts inside it. */
export interface GraphFrame {
  readonly width: number;
  readonly height: number;
  readonly originX: number;
  readonly originY: number;
}

/** The viewport's padding, which a fitted drawing stays clear of. */
export interface GraphInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export const IDENTITY: GraphTransform = { x: 0, y: 0, k: 1 };

/** Four decimals: below anything a screen shows, and no float tail in the bound value. */
export function roundZoom(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** A zoom inside the bounds. Anything that is not a positive finite number reads as 100%. */
export function clampZoom(value: number, min: number, max: number): number {
  const zoom = Number.isFinite(value) && value > 0 ? value : 1;
  return roundZoom(Math.min(max, Math.max(min, zoom)));
}

/** The same picture at zoom `k`, with the drawing point under viewport point (`px`, `py`) left where it is. */
export function zoomAround(from: GraphTransform, k: number, px: number, py: number, frame: GraphFrame): GraphTransform {
  const ratio = k / from.k;
  const dx = px - frame.originX;
  const dy = py - frame.originY;
  return { k, x: dx - (dx - from.x) * ratio, y: dy - (dy - from.y) * ratio };
}

/** The transform with its pan pulled back until part of the drawing is inside the viewport. */
export function clampPan(at: GraphTransform, frame: GraphFrame, width: number, height: number): GraphTransform {
  if (frame.width <= 0 || frame.height <= 0) return at;
  return {
    k: at.k,
    x: clampAxis(at.x, frame.originX, width * at.k, frame.width),
    y: clampAxis(at.y, frame.originY, height * at.k, frame.height),
  };
}

/**
 * The transform moved by (`dx`, `dy`) as a scroll container would move it: only
 * while more of the drawing lies hidden past the edge it is moving away from, and
 * no further than that edge's padding. An axis with nothing left to show keeps
 * its offset, which is how the caller knows the scroll belongs to the page.
 */
export function scrollPan(
  at: GraphTransform,
  frame: GraphFrame,
  insets: GraphInsets,
  width: number,
  height: number,
  dx: number,
  dy: number
): GraphTransform {
  if (frame.width <= 0 || frame.height <= 0) return at;
  return {
    k: at.k,
    x: scrollAxis(at.x, frame.originX, width * at.k, insets.left, frame.width - insets.right, dx),
    y: scrollAxis(at.y, frame.originY, height * at.k, insets.top, frame.height - insets.bottom, dy),
  };
}

/**
 * The whole drawing, centred, at the largest zoom that fits inside the padding.
 * Never above 100%: a small graph is not blown up to fill a large box.
 */
export function fitTransform(
  frame: GraphFrame,
  insets: GraphInsets,
  width: number,
  height: number,
  min: number,
  max: number
): GraphTransform {
  const roomX = Math.max(0, frame.width - insets.left - insets.right);
  const roomY = Math.max(0, frame.height - insets.top - insets.bottom);
  const k = clampZoom(Math.min(1, width > 0 ? roomX / width : 1, height > 0 ? roomY / height : 1), min, max);
  return {
    k,
    x: insets.left + (roomX - width * k) / 2 - frame.originX,
    y: insets.top + (roomY - height * k) / 2 - frame.originY,
  };
}
