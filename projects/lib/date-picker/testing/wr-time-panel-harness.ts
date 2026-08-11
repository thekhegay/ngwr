/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, type TestElement } from '@angular/cdk/testing';

import type { WrDatePickerTimeFields } from './interfaces';

/** Column order inside the stepper, which is also the order the boxes render in. */
const UNITS = ['hours', 'minutes', 'seconds'] as const;

/** One unit of a time stepper. */
type Unit = (typeof UNITS)[number];

function missingColumn(unit: Unit, method: string): string {
  return `${method}(): this stepper has no ${unit} column — seconds only render with [showSeconds]="true".`;
}

/**
 * The `<wr-time-picker>` stepper inside a date-picker popup.
 *
 * Deliberately NOT exported from the entry point: the component is `@internal`
 * (`<wr-date-picker mode="time">` is how a consumer gets one), so the picker
 * harnesses re-publish what it can do — `getTime()`, `setTime()`, `stepTime()`,
 * `toggleMeridiem()` — rather than handing out this class. It exists so the
 * range picker, which renders one stepper PER END, can address them
 * independently instead of by CSS nth-of-type gymnastics.
 *
 * Units are addressed by position, not by the boxes' `aria-label`: every string
 * in this panel is still hard-coded English (the box labels, the steppers'
 * "Increment hours", the AM/PM text), so keying on them would make this harness
 * the thing that breaks when they are moved into the i18n catalog. Column order
 * is the layout contract.
 *
 * @internal
 */
export class WrTimePanelHarness extends ComponentHarness {
  static hostSelector = '.wr-time-picker';

  /** The stepper's value as `HH:MM`, plus `:SS` and ` AM`/` PM` when those columns exist. */
  async getTimeText(): Promise<string> {
    const parts = [await this.getValue('hours'), await this.getValue('minutes')];
    const seconds = await this.getOptionalValue('seconds');
    if (seconds !== null) parts.push(seconds);

    const meridiem = await this.getMeridiem();
    return meridiem ? `${parts.join(':')} ${meridiem}` : parts.join(':');
  }

  /** `'AM'` / `'PM'`, or `null` when the stepper is in 24-hour mode. */
  async getMeridiem(): Promise<string | null> {
    const label = await this.locatorForOptional('.wr-time-picker__label')();
    return label ? label.text() : null;
  }

  /**
   * Type into the boxes named by `fields`, leaving the rest alone.
   *
   * Each box is cleared and retyped rather than assigned: the panel reads an
   * emptied box as someone mid-retype and deliberately commits nothing for it, so
   * a harness that only cleared would look like a no-op.
   */
  async setFields(fields: WrDatePickerTimeFields): Promise<void> {
    for (const unit of UNITS) {
      const value = fields[unit];
      if (value === undefined) continue;

      const box = await this.box(unit, 'setTime');
      await box.clear();
      await box.sendKeys(String(value));
    }
  }

  /** Click a unit's ▲ / ▼ button once. Minutes and seconds move by the picker's `step`. */
  async step(unit: Unit, direction: 1 | -1): Promise<void> {
    // The AM/PM column contributes a ▲ and a ▼ of its own, and it is always
    // last — so it cannot be excluded by index alone: with seconds off, the
    // third ▲ in the panel IS the meridiem toggle.
    const suffix = direction === 1 ? 'up' : 'down';
    const buttons = await this.locatorForAll(
      `.wr-time-picker__col:not(.wr-time-picker__col--ampm) .wr-time-picker__step--${suffix}`
    )();

    const button = buttons[UNITS.indexOf(unit)];
    if (!button) throw new Error(missingColumn(unit, 'stepTime'));

    await button.click();
  }

  /** Flip AM ↔ PM. Throws on a 24-hour stepper, which has no such control. */
  async toggleMeridiem(): Promise<void> {
    const button = await this.locatorForOptional('.wr-time-picker__col--ampm .wr-time-picker__step--up')();
    if (!button) {
      throw new Error(
        'toggleMeridiem(): this stepper has no AM / PM control — it is in 24-hour mode. Pass ' +
          'timeFormat="12h" (or a locale that resolves to 12-hour time) to get one.'
      );
    }

    await button.click();
  }

  /** A unit's rendered (zero-padded) value. */
  private async getValue(unit: Unit): Promise<string> {
    return (await this.box(unit, 'getTime')).getProperty<string>('value');
  }

  /** Same, but `null` when the column is not rendered at all. */
  private async getOptionalValue(unit: Unit): Promise<string | null> {
    const boxes = await this.boxes();
    const box = boxes[UNITS.indexOf(unit)];
    return box ? box.getProperty<string>('value') : null;
  }

  private async box(unit: Unit, method: string): Promise<TestElement> {
    const boxes = await this.boxes();
    const box = boxes[UNITS.indexOf(unit)];
    if (!box) throw new Error(missingColumn(unit, method));
    return box;
  }

  /** The typable boxes, in column order — the AM/PM column is a `<span>`, not one of these. */
  private async boxes(): Promise<TestElement[]> {
    return this.locatorForAll('.wr-time-picker__input')();
  }
}
