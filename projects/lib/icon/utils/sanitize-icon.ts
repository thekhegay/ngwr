/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/**
 * SVG elements an icon may be built from.
 *
 * Derived from the real sets rather than guessed: across the 12 459 SVG files
 * under `icon/_svg` (Lucide, Phosphor, Tabler, Heroicons), the whole of
 * `feather-icons`' `icons.json` and every `lucide` IconNode, only eight
 * elements ever appear — `svg`, `path`, `circle`, `line`, `rect`, `polyline`,
 * `polygon`, `ellipse`. The rest of this list is headroom for the icons a
 * consumer draws themselves: grouping, `<defs>` with gradients, a clip path, a
 * mask, a `<title>`, real `<text>`.
 *
 * What is deliberately absent is the entire scripting surface:
 *
 * - `<script>` — obvious, and the one vector `innerHTML` already refused;
 * - `<foreignObject>` — an XHTML escape hatch, so `<img onerror>` inside an
 *   otherwise well-formed icon;
 * - `<image>` — its `onerror` fires on any unreachable `href`, which is the
 *   cheapest handler to land, and no real icon set uses it;
 * - `<a>` — a `javascript:` href inside a glyph the user is invited to click;
 * - `<animate>` / `<set>` / `<animateTransform>` / `<animateMotion>` — SMIL can
 *   retarget another element's `href` at a `javascript:` URL;
 * - `<style>` — arbitrary CSS in the app's origin, including `url()` requests;
 * - `<filter>` and the `fe*` primitives — `<feImage href>` is another external
 *   fetch, and no icon set in the corpus filters.
 *
 * @internal
 */
const ELEMENTS: ReadonlySet<string> = new Set([
  'svg',
  'g',
  'defs',
  'symbol',
  'use',
  'title',
  'desc',
  'path',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'rect',
  'text',
  'tspan',
  'textPath',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'pattern',
]);

/**
 * Attributes an icon may carry, allowed on every element it is allowed on.
 *
 * An allowlist rather than a blocklist, so `onload`, `onerror`, `onclick` and
 * every other handler — including ones no browser has shipped yet — are gone by
 * construction rather than by enumeration.
 *
 * `style` is NOT here, and that is a decision rather than an oversight: not one
 * icon in the corpus uses it, and a `style` attribute is arbitrary CSS in the
 * app's origin. Anything a `style` would have done, a presentation attribute
 * does.
 *
 * @internal
 */
const ATTRIBUTES: ReadonlySet<string> = new Set([
  // geometry
  'viewBox',
  'preserveAspectRatio',
  'transform',
  'transform-origin',
  'd',
  'pathLength',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'dx',
  'dy',
  'width',
  'height',
  'points',
  // paint servers, clips and masks
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
  'offset',
  'fx',
  'fy',
  'fr',
  'patternUnits',
  'patternContentUnits',
  'patternTransform',
  'maskUnits',
  'maskContentUnits',
  'clipPathUnits',
  // presentation
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'opacity',
  'color',
  'clip-path',
  'clip-rule',
  'mask',
  'paint-order',
  'vector-effect',
  'shape-rendering',
  'stop-color',
  'stop-opacity',
  'display',
  'visibility',
  'overflow',
  'isolation',
  'mix-blend-mode',
  // text
  'startOffset',
  'textLength',
  'lengthAdjust',
  'text-anchor',
  'dominant-baseline',
  'alignment-baseline',
  'baseline-shift',
  'font-family',
  'font-size',
  'font-stretch',
  'font-style',
  'font-variant',
  'font-weight',
  'letter-spacing',
  'word-spacing',
  'writing-mode',
  'direction',
  // identity, accessibility and document plumbing
  'id',
  'class',
  'role',
  'aria-hidden',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-roledescription',
  'focusable',
  'lang',
  'version',
  'baseProfile',
  'xmlns',
  'xmlns:xlink',
  'xml:space',
  'xml:lang',
  // resolved against ONLY_FRAGMENT below, never free-form
  'href',
  'xlink:href',
]);

/**
 * `href` may point at a fragment in the same document and nowhere else — that
 * is the whole legitimate use inside an icon (`<use href="#glyph">`), and it
 * excludes `javascript:`, `data:` and every remote fetch in one rule.
 */
const FRAGMENT_ONLY: ReadonlySet<string> = new Set(['href', 'xlink:href']);

/** A same-document fragment reference: `#id`, and nothing that is not one. */
const FRAGMENT_RE = /^#[^\s]+$/;

/**
 * `url(` inside a presentation attribute is a reference to a paint server, a
 * clip path or a mask. Those are fragment references too; a remote one is at
 * best a request the page did not ask for.
 */
const URL_FN_RE = /url\(/i;
const URL_FRAGMENT_RE = /^url\(\s*(['"]?)#[^\s'")]+\1\s*\)$/i;

/**
 * Icons are shallow — the deepest in the corpus nests three levels. The cap is
 * there so a hostile registration cannot recurse this function into a stack
 * overflow; content below it is dropped, not truncated silently, because
 * {@link WrIconStripReport} names what went.
 */
const MAX_DEPTH = 16;

/**
 * What {@link sanitizeIcon} refused, for the dev-mode warning. Collecting is
 * opt-in so the render path does no bookkeeping in production.
 *
 * @internal
 */
interface WrIconStripReport {
  readonly elements: Set<string>;
  readonly attributes: Set<string>;
}

/**
 * Build a live `<svg>` element out of a registered icon's markup, keeping only
 * what an icon legitimately needs.
 *
 * `<wr-icon>` used to assign `icon.data` to `innerHTML`, which executes an
 * `onload` on the root, an `<image onerror>`, an `<img>` smuggled in after a
 * closed `</svg>`, and anything inside a `<foreignObject>` — with the app's own
 * origin, in a production build. The library already refuses exactly this next
 * door: `<wr-markdown>` escapes raw HTML because its input is untrusted by
 * construction and one `<img onerror>` is the whole cost of being wrong. Icon
 * data arrives from `provideWrIcons()`, which a multi-tenant app or a fetched
 * icon pack fills at runtime, so it is untrusted the same way.
 *
 * Three properties do the work, and none of them is a filter over known-bad
 * strings:
 *
 * 1. **Parsed inert, never inserted.** The markup is parsed into a document
 *    with no browsing context, so nothing loads and nothing runs even before it
 *    is inspected.
 * 2. **Only the first `<svg>` survives.** An icon IS an SVG element, so
 *    everything beside the root is dropped — which is what makes
 *    `</svg><img src=x onerror=…>` inert regardless of what the payload says,
 *    and it is the same shape as the `feather()` shell escape.
 * 3. **Rebuilt, not filtered.** Every element and attribute that lands in the
 *    document is one this file created from an allowlist. Nothing is
 *    transferred from the parsed tree, so there is no attribute an unfamiliar
 *    payload can smuggle past a matcher.
 *
 * A refused element takes its subtree with it rather than having its children
 * hoisted into its parent. Hoisting would preserve more of a hand-drawn icon
 * wrapped in something unsupported, and it is exactly the kind of cleverness
 * that makes "what does the output contain" depend on what the parser saw. The
 * blunt rule is the reviewable one, and the dev-mode warning names what went.
 *
 * `DomSanitizer.sanitize(SecurityContext.HTML, …)` is not an option here, which
 * is worth recording so it is not re-proposed: Angular's HTML allowlist
 * (`VOID_ELEMENTS`, `BLOCK_ELEMENTS`, `INLINE_ELEMENTS`) contains no SVG
 * element at all. Run against real Lucide, Feather and Heroicons icons it does
 * not merely drop presentation attributes — it returns the empty string.
 *
 * @returns the rebuilt element, or `null` when the data holds no `<svg>` root.
 * @internal
 */
function sanitizeIcon(doc: Document, data: string, report?: WrIconStripReport): SVGElement | null {
  const source = parseInert(doc, data);
  return source ? copy(doc, source, report, 0) : null;
}

/**
 * Parse into a document that cannot run anything.
 *
 * `DOMParser` is the path every browser and the unit-test DOM take: it takes a
 * plain string, so it is not a Trusted Types sink, and its result has no
 * browsing context. It does not exist under SSR — `@angular/platform-server`
 * renders into domino — so the server falls back to a detached `<template>`,
 * whose content is a separate inert document for the same reason. That branch
 * is unreachable in a browser, which is what keeps the innerHTML write out of
 * the only place Trusted Types is enforced.
 *
 * Both parsers were checked to agree on the part that matters: the HTML
 * parser's foreign-content adjustment restores the camel case of `viewBox`,
 * `clipPath`, `linearGradient`, `gradientTransform`, `textPath` and puts
 * `xlink:href` in the xlink namespace.
 */
function parseInert(doc: Document, data: string): Element | null {
  const parser = doc.defaultView?.DOMParser;
  if (parser) return firstSvg(new parser().parseFromString(data, 'text/html').body);

  const template = doc.createElement('template');
  template.innerHTML = data;
  return firstSvg(template.content);
}

/**
 * The first `<svg>` in document order, found by walking rather than by
 * `querySelector`.
 *
 * Two reasons, and the second is the one that matters. A control that decides
 * what may execute should not route that decision through a selector engine —
 * `localName === 'svg'` is a comparison anyone can check, and CSS parsing is a
 * layer with its own history. The first reason is merely that it is faster:
 * jsdom's engine costs 4 ms on a document this size, which the unit suite pays
 * on every rendered icon.
 */
function firstSvg(root: Node): Element | null {
  const children = root.childNodes;
  for (let i = 0, n = children.length; i < n; i++) {
    const child = children[i];
    if (child.nodeType !== 1) continue;
    const element = child as Element;
    if (element.localName === 'svg') return element;
    const nested = firstSvg(element);
    if (nested) return nested;
  }
  return null;
}

/** Recreate one element, then its allowed children, in the live document. */
function copy(doc: Document, source: Element, report: WrIconStripReport | undefined, depth: number): SVGElement {
  const el = doc.createElementNS(SVG_NS, source.localName);

  const attributes = source.attributes;
  for (let i = 0, n = attributes.length; i < n; i++) {
    const { name, value } = attributes[i];
    if (!isAllowedAttribute(name, value)) {
      report?.attributes.add(name);
      continue;
    }
    if (name === 'xlink:href') el.setAttributeNS(XLINK_NS, name, value);
    else el.setAttribute(name, value);
  }

  if (depth >= MAX_DEPTH) {
    // Named, not silent — the cap is the one rule here that can bite an icon
    // nobody meant as an attack, and a truncated glyph should say so.
    if (source.childNodes.length > 0) report?.elements.add(`… deeper than ${MAX_DEPTH} levels`);
    return el;
  }

  const children = source.childNodes;
  for (let i = 0, n = children.length; i < n; i++) {
    const child = children[i];
    // Text, so `<title>`, `<desc>` and `<text>` keep saying what they said.
    // Comments, CDATA and processing instructions are dropped: an icon has no
    // use for them and a comment is a place to hide a payload from a reader.
    if (child.nodeType === 3) {
      el.appendChild(doc.createTextNode(child.nodeValue ?? ''));
      continue;
    }
    if (child.nodeType !== 1) continue;

    const element = child as Element;
    if (!ELEMENTS.has(element.localName)) {
      report?.elements.add(element.localName);
      continue;
    }
    el.appendChild(copy(doc, element, report, depth + 1));
  }

  return el;
}

function isAllowedAttribute(name: string, value: string): boolean {
  // `data-*` is a styling and testing hook that can never be behavioural.
  if (name.startsWith('data-')) return true;
  if (!ATTRIBUTES.has(name)) return false;
  if (FRAGMENT_ONLY.has(name)) return FRAGMENT_RE.test(value.trim());
  if (URL_FN_RE.test(value)) return URL_FRAGMENT_RE.test(value.trim());
  return true;
}

export { sanitizeIcon, type WrIconStripReport };
