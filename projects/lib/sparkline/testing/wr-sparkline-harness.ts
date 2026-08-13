/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrSparklineHarnessFilters } from './interfaces';

/**
 * Test harness for `<wr-sparkline>`.
 *
 * **The interesting assertion here is the ARIA one.** A sparkline is a trend line
 * with no axes and no labels, so it is either given an `ariaLabel` — in which case it
 * announces itself as an image — or it is decoration, and must be `aria-hidden` so a
 * screen reader does not stop on a nameless graphic. The component switches between
 * those two states on one input, and {@link isDecorative} is how a spec pins which
 * one it is in.
 *
 * The line itself is an SVG path, and a path's `d` is not something a spec should
 * assert: it is a rendering detail that changes with the viewBox, the stroke width
 * and the smoothing. What IS worth asserting is whether the parts are there —
 * {@link hasLine}, {@link hasArea}, {@link hasTip} — since each is an input the
 * consumer set, and an empty dataset draws none of them.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSparklineHarness extends ComponentHarness {
  static hostSelector = 'wr-sparkline';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSparklineHarnessFilters = {}): HarnessPredicate<WrSparklineHarness> {
    return new HarnessPredicate(WrSparklineHarness, options).addOption(
      'ariaLabel',
      options.ariaLabel,
      (harness, label) => HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
    );
  }

  private readonly svg = this.locatorFor('svg');

  /** The name the chart announces, or `null` when it is decoration. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.svg()).getAttribute('aria-label');
  }

  /** The role the chart claims — `img` when it is named, `null` when it is not. */
  async getRole(): Promise<string | null> {
    return (await this.svg()).getAttribute('role');
  }

  /**
   * Whether the chart is hidden from assistive tech.
   *
   * The other half of {@link getAccessibleName}, and the pairing worth asserting
   * together: a named sparkline must NOT be hidden, and an unnamed one must be, or a
   * screen reader announces a graphic with nothing to say about it.
   */
  async isDecorative(): Promise<boolean> {
    return (await (await this.svg()).getAttribute('aria-hidden')) === 'true';
  }

  /** Whether a trend line was drawn — `false` for an empty or single-point dataset. */
  async hasLine(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-sparkline__line')()) !== null;
  }

  /** Whether the area under the line is filled (`showArea`). */
  async hasArea(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-sparkline__area')()) !== null;
  }

  /** Whether the last point is marked with a dot (`showTip`). */
  async hasTip(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-sparkline__tip')()) !== null;
  }

  /** The stroke colour as the component passed it through — a CSS value, not a resolved one. */
  async getColor(): Promise<string | null> {
    const line = await this.locatorForOptional('.wr-sparkline__line')();
    return line ? line.getAttribute('stroke') : null;
  }
}
