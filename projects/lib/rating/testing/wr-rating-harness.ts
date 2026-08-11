/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';

import type { WrRatingSize } from 'ngwr/rating';

import type { WrRatingHarnessFilters, WrRatingItemHarnessFilters } from './interfaces';
import { WrRatingItemHarness } from './wr-rating-item-harness';

/**
 * Test harness for `<wr-rating>` — the root of a two-class family, since a star
 * carries state of its own: {@link WrRatingItemHarness}.
 *
 * The stars are decoration. Everything a screen reader is told lives on the
 * `.wr-rating__row` inside them, which is the `slider`: `aria-valuenow` is the
 * committed value, `aria-valuemax` the top of the range, and the row — not the
 * host — is the tab stop. So this harness reads the row and, for writes, drives
 * its KEYBOARD: arrows step by the rating's own `step`, `Home` / `End` jump to
 * the ends, `Delete` clears. That is the accessible path, and it is the only one a
 * unit test can take unaided, because the pointer path snaps the value from where
 * the cursor sits inside a star — which needs layout jsdom does not have, so a
 * spec that wants it has to stub the star's box (see
 * {@link WrRatingItemHarness.click}).
 *
 * @example
 * ```ts
 * const rating = await loader.getHarness(WrRatingHarness.with({ label: 'Overall' }));
 *
 * await rating.setValue(4);
 * expect(await rating.getValue()).toBe(4);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrRatingHarness extends ComponentHarness {
  static hostSelector = 'wr-rating';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrRatingHarnessFilters = {}): HarnessPredicate<WrRatingHarness> {
    return new HarnessPredicate(WrRatingHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('value', options.value, async (harness, value) => (await harness.getValue()) === value)
      .addOption('readonly', options.readonly, async (harness, readonly) => (await harness.isReadonly()) === readonly)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly row = this.locatorFor('.wr-rating__row');

  /**
   * What the control announces itself as — `slider`.
   *
   * Not a `radiogroup`: the value is a number on a continuum with a `step`, the
   * arrows move it and `Home` / `End` bound it, and that is a slider's contract
   * rather than a group of one-of-N choices.
   */
  async getRole(): Promise<string | null> {
    return (await this.row()).getAttribute('role');
  }

  /**
   * The rating's accessible name, from `ariaLabel` or the i18n catalogue.
   *
   * A rating projects no text, so this is the only name it has — and it sits on
   * the row, not on the host, because the row is what carries the role.
   */
  async getLabel(): Promise<string | null> {
    return (await this.row()).getAttribute('aria-label');
  }

  /**
   * The committed value, from `aria-valuenow` — what a screen reader is told, not
   * what is painted, which during a hover is the preview instead.
   *
   * A CLEARED rating is announced as `0`, exactly like a rating of zero stars:
   * `value` is `number | null` and ARIA has no null. So `0` here means "zero or
   * nothing" — assert the bound model when the difference matters, and see
   * {@link clear}.
   */
  async getValue(): Promise<number> {
    const raw = await (await this.row()).getAttribute('aria-valuenow');
    const value = Number.parseFloat(raw ?? '');
    if (Number.isNaN(value)) {
      throw new Error(`WrRatingHarness: the slider announces aria-valuenow="${raw}", which is not a number.`);
    }
    return value;
  }

  /** The top of the range, from `aria-valuemax` — the `count` of stars. */
  async getMax(): Promise<number> {
    const raw = await (await this.row()).getAttribute('aria-valuemax');
    return Number.parseFloat(raw ?? '');
  }

  /** How many stars are painted. Should always agree with {@link getMax}. */
  async getCount(): Promise<number> {
    return (await this.getItems()).length;
  }

  /** The stars, left to right. */
  async getItems(filters: WrRatingItemHarnessFilters = {}): Promise<WrRatingItemHarness[]> {
    return this.locatorForAll(WrRatingItemHarness.with(filters))();
  }

  /**
   * Each star's fill ratio, left to right — `[1, 1, 0.5, 0, 0]` for two and a
   * half stars out of five.
   *
   * This is what the eye sees, so it follows the hover preview while there is one;
   * {@link getValue} stays on the committed value throughout.
   */
  async getFills(): Promise<number[]> {
    const items = await this.getItems();
    return Promise.all(items.map(item => item.getFill()));
  }

  /** The control size. `'md'` is the default and paints no modifier of its own. */
  async getSize(): Promise<WrRatingSize> {
    const host = await this.host();
    if (await host.hasClass('wr-rating--sm')) return 'sm';
    if (await host.hasClass('wr-rating--lg')) return 'lg';
    return 'md';
  }

  /**
   * Whether the rating displays a value it will not let you change.
   *
   * Read from `aria-readonly` rather than from the `wr-rating--readonly` class:
   * both are public, but the attribute is the one a screen reader acts on, and a
   * rating that looks read-only without saying so is the bug worth catching.
   */
  async isReadonly(): Promise<boolean> {
    return (await (await this.row()).getAttribute('aria-readonly')) === 'true';
  }

  /** Whether the rating refuses interaction — `aria-disabled`, for the same reason. */
  async isDisabled(): Promise<boolean> {
    return (await (await this.row()).getAttribute('aria-disabled')) === 'true';
  }

  /**
   * Whether the rating is in the tab order.
   *
   * A rating that takes no input takes itself out of it (`tabindex="-1"`), so this
   * is `false` while readonly or disabled.
   */
  async isFocusable(): Promise<boolean> {
    const tabIndex = await (await this.row()).getAttribute('tabindex');
    return Number.parseInt(tabIndex ?? '-1', 10) >= 0;
  }

  /**
   * Set the rating, from the keyboard.
   *
   * `Home` first, then one `ArrowRight` per step — the step is not in the DOM, so
   * the only honest way to reach a value is to walk to it and watch where the
   * rating lands. (The top of the range takes `End` instead of walking there.) A
   * host counting value changes therefore sees the intermediate ones, which is what
   * a keyboard user produces too.
   *
   * Throws rather than settling for a near miss: on a value outside `[0, max]`, on
   * one the step cannot land on (`2.5` on a whole-star rating), and on a rating
   * that took no input at all because it is readonly or disabled.
   *
   * `setValue(0)` commits ZERO. It is {@link clear} that returns the model to
   * `null`, and the two are indistinguishable from the DOM.
   */
  async setValue(value: number): Promise<void> {
    const max = await this.getMax();
    if (!Number.isFinite(value) || value < 0 || value > max) {
      throw new Error(`WrRatingHarness: ${value} is outside this rating's range of [0, ${max}].`);
    }

    const row = await this.row();
    await row.sendKeys(TestKey.HOME);

    if (value === max) {
      await row.sendKeys(TestKey.END);
    } else {
      let current = await this.getValue();
      while (current < value) {
        await row.sendKeys(TestKey.RIGHT_ARROW);
        const next = await this.getValue();
        // Standing still means the rating is not listening; the check below says why.
        if (next === current) break;
        if (next > value) {
          throw new Error(
            `WrRatingHarness: this rating cannot land on ${value} — one step took it from ${current} to ` +
              `${next}, so ${value} is not a multiple of its \`step\`.`
          );
        }
        current = next;
      }
    }

    const landed = await this.getValue();
    if (landed !== value) {
      throw new Error(
        `WrRatingHarness: asked for ${value}, but the rating reads ${landed} — a readonly or disabled ` +
          'rating takes no input.'
      );
    }
  }

  /**
   * Clear the rating, the way `Delete` does — the bound value becomes `null`, not
   * `0`.
   *
   * The slider then announces `aria-valuenow="0"` and every star empties, so
   * {@link getValue} cannot tell you this happened. Assert the model.
   */
  async clear(): Promise<void> {
    await (await this.row()).sendKeys(TestKey.DELETE);
  }

  /**
   * Bump the rating up by one step — one `ArrowRight`.
   *
   * The step is the rating's, not this harness's, so this is also how a spec finds
   * out what it is: clear the rating, step up once, read the value.
   * Already at the top, this does nothing; the value clamps rather than wrapping.
   */
  async stepUp(): Promise<void> {
    await (await this.row()).sendKeys(TestKey.RIGHT_ARROW);
  }

  /** Bump the rating down by one step — one `ArrowLeft`. Clamps at `0`. */
  async stepDown(): Promise<void> {
    await (await this.row()).sendKeys(TestKey.LEFT_ARROW);
  }

  /**
   * End a hover preview, dropping the stars back to the committed value.
   *
   * It lives here rather than on the star because the component listens for
   * `mouseleave` on the ROW: leaving one star for the next is not leaving the
   * rating.
   */
  async unhover(): Promise<void> {
    await (await this.row()).mouseAway();
  }

  /** Move keyboard focus to the rating — onto the row, which is the tab stop. */
  async focus(): Promise<void> {
    return (await this.row()).focus();
  }

  /** Blur the rating. This is what emits `touch`, so a bound field marks itself touched. */
  async blur(): Promise<void> {
    return (await this.row()).blur();
  }

  async isFocused(): Promise<boolean> {
    return (await this.row()).isFocused();
  }
}
