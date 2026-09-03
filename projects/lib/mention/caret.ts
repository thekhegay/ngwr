/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * CSS properties whose values must be copied onto the mirror to match layout.
 *
 * `as const satisfies` keeps each name checked against `CSSStyleDeclaration`
 * while narrowing the element type to these string-valued literals — the wider
 * `keyof CSSStyleDeclaration` also spans its methods (`setProperty`, `item`, …),
 * which makes the indexed read below look like an unbound method.
 */
const MIRROR_PROPS = [
  'boxSizing',
  // Without this the mirror inherits `<body>`'s direction, and the two disagree
  // whenever the field carries its own `dir` — measured at 230px of error for a
  // 320px RTL field inside an LTR page, which put the panel outside the field
  // entirely. `textAlign` below is the same story from the other side: an RTL
  // field's computed value is the logical `start`, which only resolves to the
  // right edge once the mirror knows the direction.
  'direction',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'whiteSpace',
  'wordWrap',
] as const satisfies readonly (keyof CSSStyleDeclaration)[];

/** A caret has no size, and an environment with no layout has no rects at all. */
const NO_RECT = { top: 0, left: 0 } as const;

/**
 * Where the browser would draw the caret this collapsed `range` marks.
 *
 * `getClientRects()` before `getBoundingClientRect()`: a collapsed range at a
 * bidi boundary has TWO candidate positions and reports both, and the bounding
 * box of the pair spans the whole run between them. The first rect is the one
 * the caret is actually painted at.
 *
 * Both are optional-called because jsdom implements NEITHER on `Range` — it lays
 * nothing out, so every element rect in it is already 0×0 and a zero here keeps
 * the function answering what the rest of that environment answers rather than
 * throwing halfway through an unrelated spec.
 */
function caretRectOf(range: Range): { readonly top: number; readonly left: number } {
  const rects = range.getClientRects?.();
  if (rects && rects.length > 0) return rects[0];
  return range.getBoundingClientRect?.() ?? NO_RECT;
}

/**
 * Compute the viewport coordinates of a textarea / input caret at a given
 * `position`. Uses the "mirror div" technique — a hidden div with the same
 * styling holds the field's text, and a COLLAPSED RANGE at `position` reports
 * where the caret would be.
 *
 * Returns viewport-relative `{ top, left }` — pass straight to a CDK
 * Overlay anchored at that point.
 *
 * **A range, not a probe span, and the difference only shows in RTL.** The
 * classic version of this technique puts the text before the caret in the div,
 * the text after it in a `<span>`, and reads the span's LEFT edge. That reads
 * the caret's side of the boundary only while the text runs left to right. Under
 * the Unicode BiDi algorithm the span can be laid out to the LEFT of the run it
 * follows, so the edge that faces the caret is its right one — and which edge
 * that is depends on the bidi level of the text at the caret, not on the field's
 * direction, so there is no side to pick. A collapsed range asks the browser
 * where it would draw the caret and gets the reordering for free. Measured
 * against a `contenteditable` twin of the field, in Chromium: the range agrees
 * to within a pixel for Latin, Arabic and mixed text in both directions, where
 * the span was out by up to 300px in RTL (see the spec next door).
 *
 * The `<input>` branch keeps the field's WIDTH for the same reason. It used to
 * force `width: auto` so a long single line could not wrap; but an RTL field
 * right-aligns its text inside its own box, so a shrink-to-fit mirror throws
 * away the only measurement that decides where the text starts. `overflow:
 * hidden` is what keeps the overflow from painting, and `input.scrollLeft`
 * already accounts for a field scrolled past its box.
 */
export function getCaretCoordinates(
  input: HTMLTextAreaElement | HTMLInputElement,
  position: number
): { top: number; left: number; lineHeight: number } {
  const doc = input.ownerDocument;
  const style = getComputedStyle(input);
  const mirror = doc.createElement('div');

  for (const prop of MIRROR_PROPS) {
    mirror.style[prop] = style[prop];
  }
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.top = '0';
  mirror.style.left = '0';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';

  // <input> is single-line — force whitespace behaviour so coords are sane.
  if (input.tagName === 'INPUT') {
    mirror.style.whiteSpace = 'pre';
    mirror.style.height = 'auto';
    mirror.style.overflow = 'hidden';
  }

  // One text node, so the range can address any offset in it. An empty field
  // still needs a line box to measure, hence the fallback character.
  const text = doc.createTextNode(input.value || '.');
  mirror.appendChild(text);

  doc.body.appendChild(mirror);
  const range = doc.createRange();
  range.setStart(text, Math.min(position, text.length));
  range.collapse(true);
  const caretRect = caretRectOf(range);
  const mirrorRect = mirror.getBoundingClientRect();
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
  doc.body.removeChild(mirror);

  const inputRect = input.getBoundingClientRect();
  return {
    top: inputRect.top + (caretRect.top - mirrorRect.top) - input.scrollTop,
    left: inputRect.left + (caretRect.left - mirrorRect.left) - input.scrollLeft,
    lineHeight,
  };
}
