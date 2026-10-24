/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrBulletChartExtent, WrBulletChartHarnessFilters } from './types';

/**
 * Test harness for `<wr-bullet-chart>`.
 *
 * **Two questions, two methods.** What a screen reader hears is the drawing's name — the
 * sentence "Revenue: 270 of target 250", or `ariaLabel` — and its description, the
 * sub-label it names through `aria-describedby` ({@link getAccessibleName},
 * {@link getDescription}). What a reader sees is the label column beside it, which is
 * `aria-hidden` ({@link getLabel}, {@link getSubLabel}). A chart whose description points
 * at nothing still SHOWS its sub-label, so the two are asked separately.
 *
 * **Where the marks lie is read as the component WROTE it**: shares of the scale from 0
 * at its start to 1 at its end, off each mark's `style` attribute, never measured. jsdom
 * lays nothing out, so a measured box would be 0×0 for a working chart and a broken one
 * alike — but the share written is exactly what decides where the browser draws it, and
 * it is what breaks when the scale does: a `max` read wrongly moves every share.
 *
 * **No colour is read.** The bands, the bar and the marker are painted by the stylesheet
 * through the chart's `--wr-bullet-chart-*` hooks, and jsdom resolves no stylesheet, so a
 * colour method would answer the same nothing whatever the theme said. Nor is there a
 * method for the tooltip: it is pointer only, and it says what the accessible name says.
 *
 * @example
 * ```ts
 * const chart = await loader.getHarness(WrBulletChartHarness.with({ label: 'Revenue' }));
 *
 * expect(await chart.getAccessibleName()).toBe('Revenue: 270 of target 250');
 * expect(await chart.getValueExtent()).toEqual({ start: 0, end: 0.9 });
 * expect(await chart.getRanges()).toHaveLength(3);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrBulletChartHarness extends ComponentHarness {
  static hostSelector = 'wr-bullet-chart';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrBulletChartHarnessFilters = {}): HarnessPredicate<WrBulletChartHarness> {
    return new HarnessPredicate(WrBulletChartHarness, options)
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label));
  }

  private readonly drawing = this.locatorFor('.wr-bullet-chart__track');

  /** The drawing's accessible name: the sentence the chart writes, or `ariaLabel`. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.drawing()).getAttribute('aria-label');
  }

  /**
   * The text a screen reader hears after the name — the sub-label, which the drawing names
   * through `aria-describedby` — or `null` when it names nothing.
   *
   * Throws when it names an id nothing in the chart carries, rather than answering `null`:
   * a description pointing at nothing is exactly the defect that leaves the sub-label on
   * screen and silent.
   */
  async getDescription(): Promise<string | null> {
    const id = await (await this.drawing()).getAttribute('aria-describedby');
    if (!id) return null;
    const target = await this.locatorForOptional(`[id="${id}"]`)();
    if (!target) {
      throw new Error(
        `WrBulletChartHarness.getDescription(): the drawing is described by "${id}", which nothing in the chart ` +
          'carries — the sub-label would be shown and never heard.'
      );
    }
    return target.text();
  }

  /** The label shown beside the drawing, whole even where it is ellipsised, or `null` when there is none. */
  async getLabel(): Promise<string | null> {
    const label = await this.locatorForOptional('.wr-bullet-chart__label')();
    return label ? label.text() : null;
  }

  /** The sub-label shown under the label, or `null` when there is none. */
  async getSubLabel(): Promise<string | null> {
    const subLabel = await this.locatorForOptional('.wr-bullet-chart__sub-label')();
    return subLabel ? subLabel.text() : null;
  }

  /**
   * Where the value's bar lies along the scale, or `null` when no bar is drawn — the value
   * is not a finite number. It starts at zero, or at the value for a negative one; a value
   * past a fixed `max` ends at 1, and a value of zero is a bar from zero to zero.
   */
  async getValueExtent(): Promise<WrBulletChartExtent | null> {
    const bar = await this.locatorForOptional('.wr-bullet-chart__bar')();
    return bar ? this.extentOf(bar, 'getValueExtent') : null;
  }

  /** Where the target marker sits along the scale, from 0 to 1, or `null` when there is no target. */
  async getTargetPosition(): Promise<number | null> {
    const marker = await this.locatorForOptional('.wr-bullet-chart__target')();
    return marker ? this.read(marker, 'at', 'getTargetPosition') : null;
  }

  /**
   * Every qualitative band drawn, from the scale's start: where each lies along the scale.
   * A band the scale leaves no room for is not drawn, so this can be shorter than `ranges`:
   * one past a fixed `max`, and the first band when its limit is where the scale starts — a
   * negative first limit lower than both the value and the target.
   */
  async getRanges(): Promise<WrBulletChartExtent[]> {
    const bands = await this.locatorForAll('.wr-bullet-chart__range')();
    return Promise.all(bands.map(band => this.extentOf(band, 'getRanges')));
  }

  /** Whether the scale's ticks are drawn under the drawing (`showScale`). */
  async hasScale(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-bullet-chart__scale')()) !== null;
  }

  /** The scale's tick labels from its start, as printed. `[]` with `showScale` off. */
  async getScaleLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-bullet-chart__tick-label')();
    return Promise.all(labels.map(label => label.text()));
  }

  private async extentOf(el: TestElement, method: string): Promise<WrBulletChartExtent> {
    const start = await this.read(el, 'start', method);
    const size = await this.read(el, 'size', method);
    return { start, end: Math.round((start + size) * 1e4) / 1e4 };
  }

  /**
   * A share the component wrote on a mark, off its `style` ATTRIBUTE — not `getCssValue()`,
   * which would answer from the cascade, and a computed read of a custom property the
   * stylesheet reads with a fallback answers plausibly at exactly the moment the binding
   * that writes it is what broke.
   */
  private async read(el: TestElement, name: string, method: string): Promise<number> {
    const style = (await el.getAttribute('style')) ?? '';
    const match = new RegExp(`--wr-bullet-chart-${name}:\\s*(-?[\\d.]+(?:e-?\\d+)?)`).exec(style);
    if (!match) {
      throw new Error(
        `WrBulletChartHarness.${method}(): no --wr-bullet-chart-${name} on the mark (style: "${style}"). ` +
          'The component writes one on every mark it draws, so its absence is the bug rather than a zero.'
      );
    }
    return Number.parseFloat(match[1]);
  }
}
