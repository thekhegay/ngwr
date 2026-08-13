/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';

import type { WrEventCalendarChipHarnessFilters } from './interfaces';

/** The arrow keys, by the direction a user would say out loud. */
type Arrow = 'left' | 'right' | 'up' | 'down';

const ARROWS: Record<Arrow, TestKey> = {
  left: TestKey.LEFT_ARROW,
  right: TestKey.RIGHT_ARROW,
  up: TestKey.UP_ARROW,
  down: TestKey.DOWN_ARROW,
};

/**
 * Test harness for one event chip inside a {@link WrEventCalendarHarness}.
 *
 * **The visible text is `aria-hidden`; the name is on the button.** A chip prints a
 * time and a title for the eye, and publishes both as one `aria-label` for a screen
 * reader — so {@link getLabel} is what the control announces and {@link getTitle} is
 * what is drawn. They are separate because a consumer's `[wrCalendarEvent]` template
 * replaces the drawn half and not the announced one.
 *
 * **Moving and resizing are on the keyboard here, and not because of jsdom.** The
 * pointer drag is real, but the same two operations are bound to the arrows —
 * `Alt` to move, `Alt` + `Shift` to resize — precisely so the calendar is usable
 * without one. That is the path this harness drives; a synthetic drag would divide
 * by a rect that measures 0×0 anyway.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrEventCalendarChipHarness extends ComponentHarness {
  static hostSelector = '.wr-event-calendar__chip';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrEventCalendarChipHarnessFilters = {}): HarnessPredicate<WrEventCalendarChipHarness> {
    return new HarnessPredicate(WrEventCalendarChipHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('title', options.title, (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title))
      .addOption('band', options.band, async (harness, band) => (await harness.isBand()) === band);
  }

  /** What the chip announces — its time and title in one string. */
  async getLabel(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  /**
   * The title as drawn, or `null` when a consumer template replaced it.
   *
   * The default chip prints its own `.wr-event-calendar__chip-title`; a
   * `[wrCalendarEvent]` template renders whatever the consumer wrote instead, and
   * there is no title element to find. {@link getText} is the fallback that always
   * answers.
   */
  async getTitle(): Promise<string | null> {
    const title = await this.locatorForOptional('.wr-event-calendar__chip-title')();
    return title ? title.text() : null;
  }

  /** The chip's whole rendered text, whoever drew it. */
  async getText(): Promise<string> {
    return (await this.host()).text();
  }

  /** The time as printed on a timed chip, or `null` on a band, which prints none. */
  async getTime(): Promise<string | null> {
    const time = await this.locatorForOptional('.wr-event-calendar__chip-time')();
    return time ? time.text() : null;
  }

  /**
   * Whether this is a day-spanning BAND rather than a timed chip.
   *
   * One shape covers two places — a month cell and the all-day row — and the other
   * is the block in a time grid. They size themselves completely differently (a
   * `calc()` width across columns versus a percentage height down one), which is why
   * the two are worth telling apart.
   */
  async isBand(): Promise<boolean> {
    return (await this.host()).hasClass('wr-event-calendar__chip--band');
  }

  /** Whether the event started before this cell — the chip is drawn cut off at the leading edge. */
  async continuesBefore(): Promise<boolean> {
    return (await this.host()).hasClass('wr-event-calendar__chip--continues-before');
  }

  /** Whether the event runs past this cell. */
  async continuesAfter(): Promise<boolean> {
    return (await this.host()).hasClass('wr-event-calendar__chip--continues-after');
  }

  /** Whether the chip is mid-drag. */
  async isDragging(): Promise<boolean> {
    return (await this.host()).hasClass('wr-event-calendar__chip--dragging');
  }

  /**
   * Whether the chip offers a resize grab area.
   *
   * It is `aria-hidden` and not focusable on purpose — the same resize is `Alt` +
   * `Shift` + arrows on the chip itself, so a second tab stop here would lead
   * nowhere. Its
   * presence is still the mouse affordance, and it is dropped on a chip whose event
   * continues past this cell.
   */
  async hasResizeHandle(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-event-calendar__resize')()) !== null;
  }

  /**
   * Click the chip — which emits `eventClick` and does NOT bubble to the cell
   * underneath.
   *
   * On an editable calendar this needs `document.elementFromPoint` to exist: the CDK
   * dispatches a whole pointer sequence, and the chip's `pointerdown` hit-tests for
   * the cell under the cursor. jsdom implements no such method, so stub it in your
   * spec — `() => null` is the honest answer where nothing has a box — or the click
   * throws out of the listener.
   */
  async click(): Promise<void> {
    await (await this.host()).click();
  }

  /** Move keyboard focus to the chip. */
  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  /** Whether the chip currently holds focus. */
  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }

  /**
   * Move the event — `Alt` + an arrow, a day sideways or a slot vertically.
   *
   * The calendar never mutates `events`: this emits `eventChange` and the host is
   * expected to apply it. A spec whose host ignores the output is asserting a
   * CANCELLED move, which is the contract and the most common surprise here. A
   * calendar without `editable` ignores the keys entirely — the same gate the pointer
   * path uses.
   */
  async move(arrow: Arrow): Promise<void> {
    await (await this.host()).sendKeys({ alt: true }, ARROWS[arrow]);
  }

  /**
   * Resize the event — `Alt` + `Shift` + an arrow, which moves the END alone.
   *
   * A resize that would end at or before the start emits nothing rather than
   * inverting the event, which is the pointer path's rule too.
   */
  async resize(arrow: Arrow): Promise<void> {
    await (await this.host()).sendKeys({ alt: true, shift: true }, ARROWS[arrow]);
  }

  /** Press a bare arrow — which the chip ignores, letting the grid's own navigation run. */
  async pressArrow(arrow: Arrow): Promise<void> {
    await (await this.host()).sendKeys(ARROWS[arrow]);
  }

  /** Press Escape — handing focus back to the cell the chip sits in. */
  async sendEscape(): Promise<void> {
    await (await this.host()).sendKeys(TestKey.ESCAPE);
  }
}
