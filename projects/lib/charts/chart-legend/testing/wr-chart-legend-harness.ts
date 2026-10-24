/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrChartLegendHarnessFilters, WrChartLegendHarnessItem } from './types';

/** One row, so each row's parts are queried inside it — a row with no value would shift a flat list. */
class WrChartLegendRowHarness extends ComponentHarness {
  static hostSelector = '.wr-chart-legend__item';

  private readonly dot = this.locatorForOptional('span.wr-chart-legend__swatch');
  private readonly line = this.locatorForOptional('svg.wr-chart-legend__swatch--line');
  private readonly lineStroke = this.locatorForOptional('svg.wr-chart-legend__swatch--line line');
  private readonly shape = this.locatorForOptional('svg.wr-chart-legend__swatch--marker');
  private readonly shapePath = this.locatorForOptional('svg.wr-chart-legend__swatch--marker path');
  private readonly button = this.locatorForOptional('button.wr-chart-legend__toggle');
  private readonly note = this.locatorForOptional('.wr-chart-legend__sr-only');

  async isToggle(): Promise<boolean> {
    return (await this.button()) !== null;
  }

  async press(): Promise<void> {
    const button = await this.button();
    if (!button) throw new Error('no toggle button in this row');
    await button.click();
  }

  /**
   * The modifier class, held against `aria-pressed` on a toggle row and against the
   * visually hidden word on a row that is not one. Each pair is one fact said twice —
   * once to the eye, once to a screen reader — and a row struck through while it
   * announces "pressed", or while nothing announces it at all, is exactly the defect
   * worth catching, so a disagreement throws instead of picking a side.
   */
  async isHidden(): Promise<boolean> {
    const hidden = await (await this.host()).hasClass('wr-chart-legend__item--hidden');
    const button = await this.button();
    if (!button) {
      const note = await this.note();
      const said = note !== null && (await note.text()).trim() !== '';
      if (said !== hidden) {
        throw new Error(
          hidden
            ? 'a row is struck through as hidden while nothing in it tells a screen reader so'
            : 'a row that is not hidden carries the visually hidden word that says it is'
        );
      }
      return hidden;
    }
    const pressed = await button.getAttribute('aria-pressed');
    if (pressed !== 'true' && pressed !== 'false') {
      throw new Error(`a toggle row carries aria-pressed="${pressed ?? ''}", which is neither true nor false`);
    }
    if ((pressed === 'false') !== hidden) {
      throw new Error(
        `a row is ${hidden ? '' : 'not '}struck through as hidden while its button announces aria-pressed="${pressed}"`
      );
    }
    return hidden;
  }

  async read(): Promise<WrChartLegendHarnessItem> {
    const label = await (await this.locatorFor('.wr-chart-legend__label')()).text();
    const valueEl = await this.locatorForOptional('.wr-chart-legend__value')();
    const value = valueEl ? await valueEl.text() : null;
    const hidden = await this.isHidden();

    const dot = await this.dot();
    if (dot) {
      // Off the `style` ATTRIBUTE, which is what the component wrote: a computed read
      // would answer from the stylesheet's own default.
      const style = (await dot.getAttribute('style')) ?? '';
      const color = /background(?:-color)?:\s*([^;]+)/.exec(style)?.[1]?.trim() ?? null;
      return { label, value, swatch: 'dot', color, dash: null, marker: null, hidden };
    }
    const line = await this.line();
    if (line) {
      const stroke = await this.lineStroke();
      return {
        label,
        value,
        swatch: 'line',
        color: (await stroke?.getAttribute('stroke')) ?? null,
        dash: (await stroke?.getAttribute('stroke-dasharray')) ?? '',
        marker: await line.getAttribute('data-marker'),
        hidden,
      };
    }
    const shape = await this.shape();
    if (shape) {
      return {
        label,
        value,
        swatch: 'marker',
        color: (await (await this.shapePath())?.getAttribute('fill')) ?? null,
        dash: null,
        marker: await shape.getAttribute('data-marker'),
        hidden,
      };
    }
    throw new Error(`the legend row "${label}" draws no key — every row has a dot, a line or a marker`);
  }
}

/**
 * Test harness for a `ul[wr-chart-legend]`, standalone or inside a chart that draws
 * its legend with one — the bar, line, donut, meter group, scatter and radar
 * harnesses hand it back from `getLegendHarness()`.
 *
 * **Everything it reads is text, ARIA or what the component wrote**: the rows' labels
 * and values, the colour written on each key (a dot's inline `background`, a line's
 * `stroke`, a marker's `fill`), the `--hidden` modifier and, on a `toggleable` legend,
 * each row's `aria-pressed`. There is no method for a key's size or position, which
 * jsdom has no layout to answer.
 *
 * **Hidden is read twice and held to agree.** A struck-through row and a button that
 * announces "pressed" — or, on a legend that does not toggle, the visually hidden word
 * after the name — are one fact said to two audiences; {@link getHidden} and
 * {@link getItems} throw when they disagree rather than answering with whichever one a
 * spec happened to check. Toggling goes through a real click on the row's button,
 * which is the path a keyboard takes too: Enter and Space on a `<button>` ARE a click.
 *
 * @example
 * ```ts
 * const legend = await loader.getHarness(WrChartLegendHarness);
 *
 * expect(await legend.getLabels()).toEqual(['Visits', 'Signups']);
 * await legend.toggle(1);
 * expect(await legend.getHidden()).toEqual([1]);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrChartLegendHarness extends ComponentHarness {
  static hostSelector = '.wr-chart-legend';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrChartLegendHarnessFilters = {}): HarnessPredicate<WrChartLegendHarness> {
    return new HarnessPredicate(WrChartLegendHarness, options)
      .addOption('itemLabel', options.itemLabel, async (harness, label) => {
        for (const text of await harness.getLabels()) {
          if (await HarnessPredicate.stringMatches(text, label)) return true;
        }
        return false;
      })
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      );
  }

  private readonly rows = this.locatorForAll(WrChartLegendRowHarness);

  /** The list's accessible name, or `null` when it has none. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  /** How many rows the legend draws. */
  async getItemCount(): Promise<number> {
    return (await this.rows()).length;
  }

  /** Every row, in order: its text, its key, and whether it shows its series as hidden. */
  async getItems(): Promise<WrChartLegendHarnessItem[]> {
    return Promise.all((await this.rows()).map(row => row.read()));
  }

  /** The rows' labels, in order. */
  async getLabels(): Promise<string[]> {
    return (await this.getItems()).map(item => item.label);
  }

  /**
   * Whether the rows are toggle buttons. Read off the rows themselves and held against
   * the host's `wr-chart-legend--toggleable` modifier: a legend that says it toggles
   * and draws plain rows, or the reverse, throws. With no rows at all the modifier is
   * the only witness.
   */
  async isToggleable(): Promise<boolean> {
    const flagged = await (await this.host()).hasClass('wr-chart-legend--toggleable');
    const rows = await Promise.all((await this.rows()).map(row => row.isToggle()));
    if (rows.length === 0) return flagged;
    const toggles = rows.filter(Boolean).length;
    if (toggles !== 0 && toggles !== rows.length) {
      throw new Error(
        `WrChartLegendHarness: ${toggles} of ${rows.length} rows are toggle buttons; a legend is one or the other.`
      );
    }
    const answer = toggles === rows.length;
    if (answer !== flagged) {
      throw new Error(
        `WrChartLegendHarness: the rows ${answer ? 'are' : 'are not'} buttons while the host ${
          flagged ? 'carries' : 'lacks'
        } wr-chart-legend--toggleable.`
      );
    }
    return answer;
  }

  /** The positions of the rows that show their series as hidden, ascending. */
  async getHidden(): Promise<number[]> {
    const hidden = await Promise.all((await this.rows()).map(row => row.isHidden()));
    return hidden.flatMap((isHidden, index) => (isHidden ? [index] : []));
  }

  /**
   * Clicks the toggle button of the row at `index`. Throws for a row that does not
   * exist, and for a legend that is not `toggleable` — a click on a plain row would do
   * nothing, and a spec that toggled "successfully" would pass for the wrong reason.
   */
  async toggle(index: number): Promise<void> {
    const rows = await this.rows();
    const row = rows[index];
    if (!row) {
      throw new Error(`WrChartLegendHarness.toggle(${index}): the legend has ${rows.length} row(s).`);
    }
    if (!(await row.isToggle())) {
      throw new Error(
        `WrChartLegendHarness.toggle(${index}): the legend is not toggleable, so its rows are not buttons. Set [toggleable].`
      );
    }
    await row.press();
  }
}
