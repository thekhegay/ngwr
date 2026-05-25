/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** CSS properties whose values must be copied onto the mirror to match layout. */
const MIRROR_PROPS: readonly (keyof CSSStyleDeclaration)[] = [
  'boxSizing',
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
];

/**
 * Compute the viewport coordinates of a textarea / input caret at a given
 * `position`. Uses the "mirror div" technique — a hidden div with the
 * same styling holds the text up to the caret, and we read the bounding
 * rect of a probe span placed at the boundary.
 *
 * Returns viewport-relative `{ top, left }` — pass straight to a CDK
 * Overlay anchored at that point.
 */
export function getCaretCoordinates(
  input: HTMLTextAreaElement | HTMLInputElement,
  position: number
): { top: number; left: number; lineHeight: number } {
  const doc = input.ownerDocument;
  const style = getComputedStyle(input);
  const mirror = doc.createElement('div');

  for (const prop of MIRROR_PROPS) {
    // @ts-expect-error — assigning across CSSStyleDeclaration keys.
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
    mirror.style.width = 'auto';
    mirror.style.overflow = 'hidden';
  }

  const before = input.value.substring(0, position);
  mirror.textContent = before;

  const probe = doc.createElement('span');
  // Single character so the span has measurable size even at the end.
  probe.textContent = input.value.substring(position) || '.';
  mirror.appendChild(probe);

  doc.body.appendChild(mirror);
  const probeRect = probe.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
  doc.body.removeChild(mirror);

  const inputRect = input.getBoundingClientRect();
  return {
    top: inputRect.top + (probeRect.top - mirrorRect.top) - input.scrollTop,
    left: inputRect.left + (probeRect.left - mirrorRect.left) - input.scrollLeft,
    lineHeight,
  };
}
