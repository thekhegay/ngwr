/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrIconDef } from 'ngwr/icon';

/**
 * Shape of a `lucide` icon export — an array of `[tag, attrs]` tuples
 * representing the inner SVG children. The outer `<svg>` wrapper is
 * added by the adapter when converting to a {@link WrIconDef}.
 */
type LucideIconNode = readonly (readonly [string, Record<string, string | number | undefined>])[];

/**
 * Default SVG attributes Lucide applies to every icon. Kept identical
 * to what the `lucide` package's `createElement` would emit so visual
 * parity with upstream is preserved.
 */
const SVG_ATTRS = [
  'xmlns="http://www.w3.org/2000/svg"',
  'width="24"',
  'height="24"',
  'viewBox="0 0 24 24"',
  'fill="none"',
  'stroke="currentColor"',
  'stroke-width="2"',
  'stroke-linecap="round"',
  'stroke-linejoin="round"',
  'class="wr-icon__svg lucide"',
].join(' ');

/**
 * Wrap a single Lucide icon in the {@link WrIconDef} envelope. Use this
 * when you need fine-grained control over the registered name, or when
 * the bulk {@link lucideIcons} helper isn't a good fit.
 *
 * @example
 * ```ts
 * import { Plus } from 'lucide';
 * import { lucide } from 'ngwr/icon/adapters/lucide';
 *
 * provideWrIcons([lucide('plus', Plus)]);
 * ```
 */
function lucide(name: string, children: LucideIconNode): WrIconDef {
  const inner = children.map(renderChild).join('');
  return { name, data: `<svg ${SVG_ATTRS}>${inner}</svg>` };
}

/**
 * Wrap a bag of Lucide icons in one shot. Keys become the registered
 * names **verbatim** — exactly what you pass to `<wr-icon name>` — matching
 * the singular `lucide()` helper and the other adapters. Kebab-case by
 * convention, so quote multi-word keys (`'chevron-down'`). Values are the
 * upstream IconNode tuples.
 *
 * Tree-shaking: every `Plus`, `Trash`, … import lives in *your* file
 * — ngwr ships only this wrapper, not the icon data. Unused icons in
 * `lucide` itself get dropped by the bundler.
 *
 * @example
 * ```ts
 * import { Plus, Trash, ChevronDown } from 'lucide';
 * import { lucideIcons } from 'ngwr/icon/adapters/lucide';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideWrIcons(lucideIcons({ plus: Plus, trash: Trash, 'chevron-down': ChevronDown })),
 *   ],
 * });
 * ```
 */
function lucideIcons(icons: Record<string, LucideIconNode>): WrIconDef[] {
  return Object.entries(icons).map(([name, node]) => lucide(name, node));
}

/**
 * A tag or attribute name that can only ever be a name.
 *
 * `renderChild` builds markup by concatenation, so a name carrying a quote, a
 * space or an `=` does not become a strangely-named attribute — it closes the
 * one being written and opens whatever comes next, which is how
 * `{ 'href': 'x" onerror="…' }`'s sibling, a hostile KEY, injects a handler
 * through an API whose signature says `Record<string, string | number>`.
 * Escaping cannot help a name: `onerror` is a perfectly valid name and the only
 * honest serialisation of it is `onerror="…"`. So names are constrained and
 * values are escaped, and it is {@link sanitizeIcon} at the render sink that
 * refuses `onerror` itself.
 */
const NAME_RE = /^[A-Za-z_][\w.:-]*$/;

/** The four characters that can leave an attribute value or a tag body. */
function escapeAttribute(value: string | number): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderChild([tag, attrs]: readonly [string, Record<string, string | number | undefined>]): string {
  if (!NAME_RE.test(tag)) return '';

  const rendered = Object.entries(attrs)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined && NAME_RE.test(entry[0]))
    .map(([key, value]) => `${key}="${escapeAttribute(value)}"`)
    .join(' ');
  return `<${tag} ${rendered}/>`;
}

export { lucide, lucideIcons, type LucideIconNode };
