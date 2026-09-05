/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What `check:layout` measures, and the only hand-maintained part of that gate.
 *
 * The list is deliberately SHORT and made of load-bearing geometry rather than
 * of everything that renders. A regression this gate exists to catch looks like
 * "a density multiplier moved and every control grew two pixels" or "a padding
 * token changed and the table row is now taller than the design" — silent
 * changes that no other gate reports, because `check:contrast` measures colour,
 * `check:state-a11y` measures roles and names, and `check:rtl-layout` only
 * compares a page against its own mirror.
 *
 * Adding one: measure a component's own root, not a wrapper the showcase owns.
 * The selectors are the library's `.wr-*` classes, which are public API — a demo
 * container is free to change and would report a docs edit as a library
 * regression.
 */

const REF = '/reference/components';

/** Scope to a live demo — the showcase chrome is built out of the library. */
const demo = (selector: string): string => `:is(ngwr-doc-snippet, ngwr-doc-playground) ${selector}`;

export interface LayoutTarget {
  /** `component/what`, and what `--filter` matches against. */
  readonly id: string;
  readonly route: string;
  /** Native CSS. The first match is measured. */
  readonly selector: string;
  /**
   * Measure every match rather than the first, and record them in order. For a
   * set that is supposed to be uniform — the three button sizes, a row of tabs
   * — one entry per element says more than one number does.
   */
  readonly all?: boolean;
  readonly note?: string;
}

export const LAYOUT_TARGETS: readonly LayoutTarget[] = [
  // Controls. These carry the density multipliers, so they are the first thing
  // a token change moves and the last thing anyone notices by eye.
  { id: 'button/sizes', route: `${REF}/button`, selector: demo('.wr-btn'), all: true },
  { id: 'input/field', route: `${REF}/input`, selector: demo('.wr-input') },
  { id: 'textarea/field', route: `${REF}/textarea`, selector: demo('.wr-textarea') },
  { id: 'select/trigger', route: `${REF}/select`, selector: demo('.wr-select__trigger') },
  { id: 'checkbox/box', route: `${REF}/checkbox`, selector: demo('.wr-checkbox__box') },
  { id: 'radio/dot', route: `${REF}/radio`, selector: demo('.wr-radio__dot') },
  { id: 'switch/track', route: `${REF}/switch`, selector: demo('.wr-switch__track') },
  { id: 'slider/track', route: `${REF}/slider`, selector: demo('.wr-slider__track') },

  // Chrome with a documented height. A table row that grows re-flows every page
  // that embeds one, and `rowHeight` for the virtualized body is derived from it.
  { id: 'table/row', route: `${REF}/table`, selector: demo('.wr-table tbody tr'), all: false },
  { id: 'tabs/tab', route: `${REF}/tabs`, selector: demo('.wr-tabs__tab'), all: true },
  { id: 'badge/tag', route: `${REF}/badge`, selector: demo('.wr-tag') },
  { id: 'avatar/circle', route: `${REF}/avatar`, selector: demo('.wr-avatar'), all: true },
  { id: 'spinner/svg', route: `${REF}/spinner`, selector: demo('.wr-spinner') },
  { id: 'alert/box', route: `${REF}/alert`, selector: demo('.wr-alert') },
  { id: 'card/box', route: `${REF}/card`, selector: demo('.wr-card') },
];
