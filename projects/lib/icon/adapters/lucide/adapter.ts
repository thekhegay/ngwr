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

function renderChild([tag, attrs]: readonly [string, Record<string, string | number | undefined>]): string {
  const rendered = Object.entries(attrs)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
  return `<${tag} ${rendered}/>`;
}

export { lucide, lucideIcons, type LucideIconNode };
