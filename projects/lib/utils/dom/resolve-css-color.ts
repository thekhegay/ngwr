/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Probes one element keeps alive at a time, one per expression. Generous for
 * what a component draws with — aurora resolves three stops, waves and
 * click-spark one colour each — and a bound on a caller that resolves a fresh
 * string every frame, where the oldest probe is retired instead of piling up.
 */
const MAX_PROBES = 8;

/** `var()` hops the fallback chain follows before it gives up on a reference cycle. */
const MAX_HOPS = 8;

/** A whole expression that is one `var(--name)` or `var(--name, fallback)`. */
const LONE_VAR = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]*?))?\s*\)$/;

const probes = new WeakMap<Element, Map<string, HTMLElement>>();

/**
 * The probe holding `expression` inside `context`, appended on first use.
 *
 * The colour is written ONCE, when the probe is made, so a caller that resolves
 * every frame only ever reads: an inline-style write invalidates style, and
 * doing it per frame would recalculate the probe on every one of them.
 */
function probeFor(context: Element, expression: string): HTMLElement {
  let byExpression = probes.get(context);
  if (!byExpression) {
    byExpression = new Map();
    probes.set(context, byExpression);
  }

  const kept = byExpression.get(expression);
  // A template that re-rendered the context's children takes the probe with
  // it, and a detached element computes nothing.
  if (kept?.parentNode === context) return kept;

  const probe = context.ownerDocument.createElement('span');
  probe.style.display = 'none';
  probe.style.color = expression;
  context.appendChild(probe);
  byExpression.set(expression, probe);

  if (byExpression.size > MAX_PROBES) {
    const [oldest, element] = byExpression.entries().next().value!;
    element.remove();
    byExpression.delete(oldest);
  }
  return probe;
}

/** The probe's computed colour, or `null` when the engine refused or did not resolve it. */
function computedColor(view: Window, probe: HTMLElement): string | null {
  // An expression the parser refused never reaches the inline style at all, and
  // the probe would quietly report the colour it inherits instead.
  if (probe.style.color === '') return null;
  const color = view.getComputedStyle(probe).color;
  // A browser always substitutes; jsdom hands a `var()` back verbatim.
  return color !== '' && !color.includes('var(') ? color : null;
}

/**
 * Resolves a CSS colour expression against an element to the colour the cascade
 * computes for it, which a canvas can paint with: `rgb(…)` / `rgba(…)` for a
 * legacy colour, `color(srgb r g b / a)` (channels 0–1) for a `color-mix()`
 * result. A colour authored in another space — `oklch()`, `lab()` — computes
 * to itself, so a caller that parses channels has to expect that form too.
 *
 * A 2D context and a WebGL uniform cannot read CSS: a `var()` is refused
 * outright, and so is `light-dark()` — except in Firefox, which accepts it and
 * always paints the LIGHT colour, whatever scheme the page is in. Reading the
 * custom property does not help either, because `getPropertyValue()` returns
 * the declared text, `light-dark(…)` and all, never a resolved colour. What
 * does resolve it is the cascade itself, so this sets the expression as the
 * `color` of a hidden probe inside `context` and reads the probe's computed
 * value back. The probe inherits from `context`, so custom properties and the
 * colour scheme resolve exactly as they would for the element itself —
 * including a subtree that sets its own `color-scheme`.
 *
 * Pass the element whose children are never painted when there is one — a
 * `<canvas>` is ideal, and its fallback content is where the probe goes. One
 * `display: none` span is appended per expression and kept for the next call,
 * so resolving the same expression every frame costs a style read, not a DOM
 * write.
 *
 * Returns `fallback` when nothing can be resolved: the expression does not
 * parse as a colour, it is a lone `var()` naming a property set nowhere (CSS
 * itself would hand the probe its inherited colour, which reads as a choice the
 * author never made), or the element has no style engine behind it. Where the
 * computed read hands a `var()` back unresolved — jsdom does, a browser never
 * does — a lone `var()` is looked up with `getPropertyValue()` and the result
 * resolved in its turn, so a unit test still sees the colour a token holds.
 *
 * Browser only: call it from `afterNextRender` or a frame callback, never
 * during a server render.
 *
 * @example
 * ```ts
 * const canvas = this.canvasRef().nativeElement;
 * ctx.strokeStyle = resolveCssColor(canvas, 'var(--wr-color-on-surface)', '#0f172a');
 * ```
 *
 * @param context - Element to resolve against; the probe is appended inside it.
 * @param expression - Any CSS colour: a literal, `var()`, `light-dark()`, `color-mix()`.
 * @param fallback - Returned as-is when the expression cannot be resolved.
 * @returns The computed colour, or `fallback`.
 */
export function resolveCssColor(context: Element, expression: string, fallback: string): string {
  const view = context.ownerDocument.defaultView;
  if (!view) return fallback;

  try {
    let value = expression.trim();
    for (let hop = 0; hop < MAX_HOPS && value !== ''; hop++) {
      const ref = LONE_VAR.exec(value);
      const declared = ref ? view.getComputedStyle(context).getPropertyValue(ref[1]).trim() : '';
      if (ref && declared === '' && ref[2] === undefined) return fallback;

      const color = computedColor(view, probeFor(context, value));
      if (color !== null) return color;
      if (!ref) break;
      value = declared || (ref[2] ?? '').trim();
    }
  } catch {
    // A detached view or a DOM with no style engine behind it.
  }
  return fallback;
}
