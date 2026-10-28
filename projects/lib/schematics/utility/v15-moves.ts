/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The entry points v15 moved from `ngwr/<name>` to `ngwr/charts/<name>` and
 * `ngwr/bits/<name>`: the seven charts and twenty-one bits that shipped flat
 * before it.
 *
 * One list for the two schematics that need it. `migration-v15` rewrites exactly
 * these paths, and `ng g ngwr:component-style` says "since v15" for exactly these
 * names. It used to say it for any bare name one nested entry point ended with,
 * which told a reader that `heatmap-chart`, `funnel-chart` and every other chart
 * first shipped in 15.1 had moved from a flat path they never had. Kept out of the
 * migration's own file so the style utility does not load the migration with it.
 */
const V15_CHARTS: readonly string[] = [
  'bar-chart',
  'calendar-heatmap',
  'donut-chart',
  'gauge',
  'line-chart',
  'meter-group',
  'sparkline',
];

const V15_BITS: readonly string[] = [
  'aurora',
  'blur-text',
  'border-glow',
  'circular-text',
  'click-spark',
  'confetti',
  'decrypt-text',
  'falling-text',
  'fuzzy-text',
  'glitch-text',
  'gradient-text',
  'marquee',
  'rotating-text',
  'shiny-text',
  'splash-cursor',
  'split-text',
  'spotlight-card',
  'star-border',
  'tilt-card',
  'typewriter',
  'waves',
];

export { V15_BITS, V15_CHARTS };
