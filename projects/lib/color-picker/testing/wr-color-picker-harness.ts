/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import { WrSegmentedHarness } from 'ngwr/segmented/testing';

import type { WrColorPickerHarnessFilters, WrColorPickerTab, WrColorPickerThumbs } from './interfaces';

/**
 * One labelled numeric field — internal. A `TestElement` cannot be queried into, so
 * pairing an input with the label printed under it means a harness anchored on the
 * `<label>` that holds both.
 */
class FieldHarness extends ComponentHarness {
  static hostSelector = '.wr-color-picker__field';

  async getLabel(): Promise<string> {
    return (await this.locatorFor('.wr-color-picker__field-label')()).text();
  }

  async getInput(): Promise<TestElement> {
    return this.locatorFor('input')();
  }

  async getValue(): Promise<string> {
    return (await this.getInput()).getProperty<string>('value');
  }
}

/** An inline `left` / `top` percentage as a number. */
async function percent(thumb: TestElement, side: 'left' | 'top'): Promise<number> {
  return Number.parseFloat(await thumb.getCssValue(side));
}

/**
 * Test harness for `<wr-color-picker>` — the inline picker, and the one the
 * `[wrColorPickerTrigger]` directive mounts in an overlay.
 *
 * **What this harness will not do: drag.** The SV canvas and the hue / alpha
 * sliders are pointer surfaces that read `getBoundingClientRect()` and divide by
 * its width. A unit test has no layout, so every box is 0×0 and the division is
 * `NaN` — a `setHue()` built on a synthetic pointer event would report success and
 * write nothing, or write garbage. The numeric fields reach the same state and are
 * also the only keyboard path the component has, so they are the whole write API
 * here. {@link getThumbs} reads where the thumbs ARE, from the percentages the
 * component writes inline, which is how a spec checks a surface followed a value.
 *
 * **And it will not read the preview swatch.** The preview paints the current
 * colour as a CSS background, and jsdom normalises that to `rgb(…)` — dropping the
 * alpha channel entirely, so `#ff880080` and `#ff8800ff` come back identical. A
 * `getColor()` reading it would answer one thing in a unit test and another in a
 * browser. {@link getHex} is the colour: the field holds the canonical 8-digit
 * string, alpha included, whatever `format` writes into `value`.
 *
 * @example
 * ```ts
 * const picker = await loader.getHarness(WrColorPickerHarness);
 *
 * await picker.setHex('#3969e2');
 * expect(await picker.getHex()).toBe('#3969e2ff');
 *
 * await picker.setTab('rgb');
 * expect(await picker.getRgb()).toEqual({ r: 57, g: 105, b: 226 });
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrColorPickerHarness extends ComponentHarness {
  static hostSelector = 'wr-color-picker';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrColorPickerHarnessFilters = {}): HarnessPredicate<WrColorPickerHarness> {
    return new HarnessPredicate(WrColorPickerHarness, options)
      .addOption('color', options.color, (harness, color) => HarnessPredicate.stringMatches(harness.readHex(), color))
      .addOption('tab', options.tab, async (harness, tab) => (await harness.getTab()) === tab)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly hexField = this.locatorForOptional('.wr-color-picker__inputs--hex input');
  private readonly tabs = this.locatorFor(WrSegmentedHarness.with({ selector: '.wr-color-picker__tabs' }));

  /**
   * The tab switcher, as a {@link WrSegmentedHarness}.
   *
   * Handed back rather than re-queried: the switcher IS a `<wr-segmented>`, which
   * already knows that the roving tab stop is not the selection and how the sliding
   * thumb reports itself. Re-reading its buttons here would be a second, worse copy.
   */
  async getTabs(): Promise<WrSegmentedHarness> {
    return this.tabs();
  }

  /** Which set of numeric fields is showing. */
  async getTab(): Promise<WrColorPickerTab> {
    const label = await (await this.tabs()).getSelectedLabel();
    return (label ?? 'HEX').toLowerCase() as WrColorPickerTab;
  }

  /** Show a different set of numeric fields. An already-active tab is left alone. */
  async setTab(tab: WrColorPickerTab): Promise<void> {
    if ((await this.getTab()) === tab) return;
    await (await this.tabs()).select({ label: tab.toUpperCase() });
  }

  /**
   * The canonical hex string, as the HEX field shows it — 8 digits while `alpha` is
   * on, 6 while it is off.
   *
   * This is the picker's colour, and deliberately not the same thing as its `value`:
   * `format` decides whether `value` is written as hex, `rgb()` or `hsl()`, while the
   * field always shows hex. A spec that cares about the emitted string should read
   * the bound signal; one that cares about the COLOUR should read this.
   *
   * Throws off the HEX tab, where the field does not exist — see {@link setTab}.
   */
  async getHex(): Promise<string> {
    const field = await this.hexField();
    if (!field) {
      throw new Error(
        `WrColorPickerHarness.getHex(): the HEX field is not rendered — the picker is showing the ` +
          `${(await this.getTab()).toUpperCase()} tab. Call setTab('hex') first.`
      );
    }
    return field.getProperty<string>('value');
  }

  /**
   * Type a colour into the HEX field.
   *
   * Typed rather than assigned, because that is the path the component is built
   * around: it re-parses on every keystroke and applies the first spelling that
   * parses, so a partial `#ff8` commits a colour on its way to `#ff8800`. An
   * unparseable string leaves the committed colour ALONE and lives in the field
   * until {@link blurHex} snaps it back — assert that rather than expecting a throw.
   */
  async setHex(value: string): Promise<void> {
    const field = await this.requireHexField('setHex');
    await field.clear();
    await field.sendKeys(value);
  }

  /**
   * Blur the HEX field — re-syncing it with the committed colour and emitting
   * `touch`.
   *
   * The re-sync is the visible half: a field left holding text that never parsed
   * goes back to the canonical hex here, and nowhere else.
   */
  async blurHex(): Promise<void> {
    await (await this.requireHexField('blurHex')).blur();
  }

  /** Whether the HEX field currently holds focus. */
  async isHexFocused(): Promise<boolean> {
    return (await this.requireHexField('isHexFocused')).isFocused();
  }

  /** The three RGB channels as the RGB tab shows them. Throws off that tab. */
  async getRgb(): Promise<{ r: number; g: number; b: number }> {
    const [r, g, b] = await this.channelValues('rgb', ['R', 'G', 'B']);
    return { r, g, b };
  }

  /** Write one RGB channel, 0–255. Out-of-range numbers are clamped by the component. */
  async setRgbChannel(channel: 'r' | 'g' | 'b', value: number): Promise<void> {
    await this.writeChannel('rgb', channel.toUpperCase(), value);
  }

  /**
   * Hue, saturation and lightness as the HSL tab shows them — degrees and whole
   * percents, already rounded for display. Throws off that tab.
   */
  async getHsl(): Promise<{ h: number; s: number; l: number }> {
    const [h, s, l] = await this.channelValues('hsl', ['H', 'S%', 'L%']);
    return { h, s, l };
  }

  /** Write one HSL channel — `h` in degrees, `s` / `l` in percent. */
  async setHslChannel(channel: 'h' | 's' | 'l', value: number): Promise<void> {
    await this.writeChannel('hsl', channel === 'h' ? 'H' : `${channel.toUpperCase()}%`, value);
  }

  /**
   * Alpha as the whole percent the numeric tabs show, or `null` when the picker was
   * built without alpha.
   *
   * Only the RGB and HSL tabs carry the field — the HEX tab spells alpha into the
   * hex string instead — so this throws on the HEX tab rather than answering `null`,
   * which would read as "this picker has no alpha".
   */
  async getAlphaPercent(): Promise<number | null> {
    const tab = await this.getTab();
    if (tab === 'hex') {
      throw new Error(
        'WrColorPickerHarness.getAlphaPercent(): the HEX tab has no alpha field — the alpha is the last two ' +
          "digits of getHex(). Call setTab('rgb') or setTab('hsl') to read it as a percent."
      );
    }
    if (!(await this.hasAlpha())) return null;
    const [alpha] = await this.channelValues(tab, ['A%']);
    return alpha;
  }

  /** Write alpha as a whole percent, 0–100. */
  async setAlphaPercent(value: number): Promise<void> {
    const tab = await this.getTab();
    if (tab === 'hex') {
      throw new Error(
        "WrColorPickerHarness.setAlphaPercent(): the HEX tab has no alpha field. Call setTab('rgb') first, " +
          'or write the two alpha digits through setHex().'
      );
    }
    await this.writeChannel(tab, 'A%', value);
  }

  /**
   * Whether the picker offers alpha at all.
   *
   * From the host modifier, which is the one answer that holds on every tab: the
   * alpha SLIDER is always rendered when it is on, while the `A%` field only exists
   * on the two numeric tabs.
   */
  async hasAlpha(): Promise<boolean> {
    return (await this.host()).hasClass('wr-color-picker--alpha');
  }

  /**
   * Whether the picker refuses interaction.
   *
   * Read from the modifier the host paints rather than from a field's `disabled`
   * property, because the fields come and go with the tab while the state does not —
   * and the drag surfaces, which have no `disabled` of their own, are gated by the
   * same signal.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('wr-color-picker--disabled');
  }

  /** The preset colours offered under the fields, as the strings the consumer passed. */
  async getSwatches(): Promise<string[]> {
    const swatches = await this.locatorForAll('.wr-color-picker__swatch')();
    return Promise.all(swatches.map(async swatch => (await swatch.getAttribute('aria-label')) ?? ''));
  }

  /**
   * Click a preset.
   *
   * Matched on the string the consumer passed, which is what the button publishes as
   * its accessible name — the rendered background is a CSS colour and would come back
   * normalised and alpha-stripped. Throws when nothing matches, naming what is offered.
   */
  async pickSwatch(color: string): Promise<void> {
    const swatches = await this.locatorForAll('.wr-color-picker__swatch')();
    for (const swatch of swatches) {
      if ((await swatch.getAttribute('aria-label')) === color) {
        await swatch.click();
        return;
      }
    }
    throw new Error(
      `WrColorPickerHarness.pickSwatch(): no swatch for "${color}". The picker offers: ` +
        `${(await this.getSwatches()).join(', ')}.`
    );
  }

  /**
   * Where the three thumbs sit, in percent along their surfaces.
   *
   * The component writes these as inline `left` / `top` percentages, so they are
   * readable with no layout at all — which makes them the only evidence a spec has
   * that the surfaces followed a colour set through the fields. A measured position
   * would be zero for all three.
   */
  async getThumbs(): Promise<WrColorPickerThumbs> {
    const sv = await this.locatorFor('.wr-color-picker__sv .wr-color-picker__thumb')();
    const hue = await this.locatorFor('.wr-color-picker__slider--hue .wr-color-picker__thumb')();
    const alpha = await this.locatorForOptional('.wr-color-picker__slider--alpha .wr-color-picker__thumb')();

    return {
      sv: { x: await percent(sv, 'left'), y: await percent(sv, 'top') },
      hue: await percent(hue, 'left'),
      alpha: alpha ? await percent(alpha, 'left') : null,
    };
  }

  /** The HEX field's value without the tab check — for filters, which must not throw. */
  private async readHex(): Promise<string> {
    const field = await this.hexField();
    return field ? field.getProperty<string>('value') : '';
  }

  private async requireHexField(method: string): Promise<TestElement> {
    const field = await this.hexField();
    if (!field) {
      throw new Error(
        `WrColorPickerHarness.${method}(): the HEX field is not rendered — the picker is showing the ` +
          `${(await this.getTab()).toUpperCase()} tab. Call setTab('hex') first.`
      );
    }
    return field;
  }

  private async channelValues(tab: WrColorPickerTab, labels: readonly string[]): Promise<number[]> {
    await this.requireTab(tab, 'read');
    const inputs = await this.inputsByLabel();

    return labels.map(label => {
      const input = inputs.get(label);
      if (!input) throw new Error(`WrColorPickerHarness: the ${tab.toUpperCase()} tab has no "${label}" field.`);
      return Number(input.value);
    });
  }

  private async writeChannel(tab: WrColorPickerTab, label: string, value: number): Promise<void> {
    await this.requireTab(tab, 'write');
    const inputs = await this.inputsByLabel();
    const found = inputs.get(label);
    if (!found) {
      throw new Error(
        `WrColorPickerHarness: the ${tab.toUpperCase()} tab has no "${label}" field. ${
          label === 'A%' ? 'This picker was built with `[alpha]="false"`.' : ''
        }`
      );
    }

    // Set and dispatch once, rather than clearing and typing. Each of these inputs
    // is bound to `[value]`, and the component commits on every `input` event — so
    // typing 128 would land 1, then 12, then 128, and CLEARING would land 0 first,
    // because `Number('')` is 0 rather than NaN. A spec that asked for one colour
    // would get four, the first of them black.
    await found.element.setInputValue(String(value));
    await found.element.dispatchEvent('input');
  }

  private async requireTab(tab: WrColorPickerTab, verb: string): Promise<void> {
    const current = await this.getTab();
    if (current !== tab) {
      throw new Error(
        `WrColorPickerHarness: cannot ${verb} the ${tab.toUpperCase()} channels while the picker is showing ` +
          `the ${current.toUpperCase()} tab — those fields are not rendered. Call setTab('${tab}') first.`
      );
    }
  }

  /** Every numeric input of the current tab, keyed by the label printed under it. */
  private async inputsByLabel(): Promise<Map<string, { element: TestElement; value: string }>> {
    const found = new Map<string, { element: TestElement; value: string }>();

    for (const field of await this.locatorForAll(FieldHarness)()) {
      const label = await field.getLabel();
      found.set(label, { element: await field.getInput(), value: await field.getValue() });
    }
    return found;
  }
}
