/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrSegmentedSize } from 'ngwr/segmented';

import type { WrSegmentedHarnessFilters, WrSegmentedOptionHarnessFilters } from './interfaces';
import { WrSegmentedOptionHarness } from './wr-segmented-option-harness';

/** Sizes that earn a modifier class — `md` is the default and carries none. */
const SIZES: readonly WrSegmentedSize[] = ['sm', 'lg'];

/**
 * Test harness for `<wr-segmented>` — the root of a two-class family with
 * {@link WrSegmentedOptionHarness}.
 *
 * **What the control actually is**, because it decides everything below: not a
 * `radiogroup`, not a `tablist` and not native radios. The host is a plain
 * `role="group"` and each segment is a `<button aria-pressed>` — a row of toggle
 * buttons over one value. Three consequences a spec has to know about:
 *
 * - The selection is `aria-pressed`, on exactly one segment. There is no
 *   `aria-checked`, no `aria-selected`, and no "2 of 3" position announced.
 * - **There is no roving tab stop.** The component authors no `tabindex` and no
 *   arrow-key handler, so every enabled segment is its OWN tab stop —
 *   {@link getTabStopLabels} returns a list where a radiogroup or a tablist would
 *   have one entry. Focus and selection are therefore independent here:
 *   {@link getFocusedLabel} implies nothing about {@link getSelectedIndex}, and
 *   arrowing along the strip moves neither.
 * - Activation is the browser's own default action on a button, which jsdom does not
 *   implement, so {@link select} clicks — see {@link WrSegmentedOptionHarness.select}.
 *
 * **There is deliberately no `getValue()` and no selection by value.** `options` is
 * a bound array of `{ value, label, … }` and the value is a generic `T` the component
 * writes nowhere — not on the host, not on a segment. The single exception is an
 * accident rather than an addressing scheme: an icon-only option with no `ariaLabel`
 * has its value stringified into the segment's `aria-label`, which for an object
 * value reads `[object Object]`. So address segments by their label
 * ({@link select}) or by position ({@link selectAt}), and assert the picked value on
 * the host's own model — the only place it exists, and the assertion that would have
 * caught the bug anyway.
 *
 * The sliding thumb is decoration (`aria-hidden`), and the four methods that mention
 * it read what the component PUBLISHES for the stylesheet — two custom properties and
 * two modifier classes — never painted geometry, which a DOM without layout does not
 * have. {@link getThumbIndex} in particular is not the selection; it is the trap that
 * method documents.
 *
 * @example
 * ```ts
 * const range = await loader.getHarness(WrSegmentedHarness.with({ label: 'Range' }));
 *
 * expect(await range.getOptionLabels()).toEqual(['Day', 'Week', 'Month']);
 * await range.select({ label: 'Week' });
 * expect(await range.getSelectedIndex()).toBe(1);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSegmentedHarness extends ComponentHarness {
  static hostSelector = 'wr-segmented';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSegmentedHarnessFilters = {}): HarnessPredicate<WrSegmentedHarness> {
    return new HarnessPredicate(WrSegmentedHarness, options)
      .addOption('label', options.label, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption('size', options.size, async (harness, size) => (await harness.getSize()) === size)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  /**
   * The role the host announces — `group`.
   *
   * Worth pinning precisely because it is the weaker of the shapes this component
   * could have had: a `group` of toggle buttons tells a screen reader that the
   * segments belong together, and nothing more. Were this to become a `radiogroup` or
   * a `tablist`, the keyboard contract would change with it (one tab stop, arrow keys
   * moving the selection), and every spec written against {@link getTabStopLabels}
   * would need to change too.
   */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /**
   * The control's accessible name, resolved the way a screen reader resolves it: the
   * text of every element `aria-labelledby` points at, and `aria-label` only when
   * that named nothing. `null` when the consumer wired neither.
   *
   * The order is not interchangeable — `aria-labelledby` WINS in the accessible-name
   * computation — so a control carrying both is announced by the heading it points at,
   * and reporting the `aria-label` would describe a name nobody hears.
   *
   * The component ships no label input on purpose (the question is the consumer's own
   * heading), so this is the only way to check that wiring held, and a `null` on a
   * group of three unrelated-sounding buttons is a real finding.
   */
  async getAccessibleName(): Promise<string | null> {
    const host = await this.host();

    const labelledBy = await host.getAttribute('aria-labelledby');
    if (labelledBy !== null) {
      // Resolved from the document root: `aria-labelledby` may point anywhere on the
      // page, and the heading above a control is normally outside it.
      const root = this.documentRootLocatorFactory();
      const texts: string[] = [];
      for (const id of labelledBy.split(/\s+/).filter(Boolean)) {
        const target = await root.locatorForOptional(`#${id}`)();
        if (target) texts.push(await target.text());
      }

      // A reference that resolves to nothing names nothing, and the computation falls
      // through to `aria-label` exactly as it does in a browser.
      if (texts.length) return texts.join(' ');
    }

    return host.getAttribute('aria-label');
  }

  /** This control's own segments, in DOM order. A sibling control's are not here. */
  async getOptions(filters: WrSegmentedOptionHarnessFilters = {}): Promise<WrSegmentedOptionHarness[]> {
    return this.locatorForAll(WrSegmentedOptionHarness.with(filters))();
  }

  /**
   * The accessible name of every segment, in DOM order — the visible labels, with an
   * icon-only segment answering with the `aria-label` that stands in for its text.
   *
   * Throws when a segment has no name at all, rather than leaving a hole in the list:
   * see {@link WrSegmentedOptionHarness.getLabel}.
   */
  async getOptionLabels(): Promise<string[]> {
    const options = await this.getOptions();
    return Promise.all(options.map(option => option.getLabel()));
  }

  /** The pressed segment, or `null` when nothing is selected. */
  async getSelectedOption(): Promise<WrSegmentedOptionHarness | null> {
    const [selected] = await this.getOptions({ selected: true });
    return selected ?? null;
  }

  /**
   * The accessible name of the pressed segment, or `null` when nothing is selected.
   *
   * `null` is also the answer for a bound value that matches no option — the control
   * holds it, no segment is pressed, and the page shows an unanswered control. See
   * {@link getThumbIndex}, which does NOT answer `null` in that state.
   */
  async getSelectedLabel(): Promise<string | null> {
    const selected = await this.getSelectedOption();
    return selected ? selected.getLabel() : null;
  }

  /**
   * The position of the pressed segment, or `-1` when nothing is selected.
   *
   * Derived from `aria-pressed`, which is the selection. The other index on the page —
   * the thumb's — is not; it clamps at 0 (see {@link getThumbIndex}).
   */
  async getSelectedIndex(): Promise<number> {
    const options = await this.getOptions();
    for (let index = 0; index < options.length; index++) {
      if (await options[index].isSelected()) return index;
    }
    return -1;
  }

  /**
   * Pick the first segment matching the filters — this is how the control's value
   * changes.
   *
   * Throws when nothing matches, naming the segments that do exist, and throws again
   * when the segment is still unpressed afterwards. That second failure has exactly
   * two causes and reports both, because a click that quietly did nothing surfaces as
   * an unrelated assertion three lines later.
   */
  async select(filters: WrSegmentedOptionHarnessFilters): Promise<void> {
    const [option] = await this.getOptions(filters);
    if (!option) {
      throw new Error(
        `WrSegmentedHarness.select(): no segment matched ${JSON.stringify(filters)}. This control offers: ` +
          `${(await this.describeOptions()).join(', ')}.`
      );
    }
    await this.pick(option, 'select');
  }

  /**
   * Pick the segment at a position, counting from zero — the addressing route for an
   * icon-only strip, or for one whose labels a spec would rather not hard-code.
   *
   * Throws on an index outside the control, saying how many segments there are: an
   * off-by-one that resolved to nothing would otherwise read as "the click did not
   * take".
   */
  async selectAt(index: number): Promise<void> {
    const options = await this.getOptions();
    const option = options[index];
    if (!option) {
      throw new Error(
        `WrSegmentedHarness.selectAt(): index ${index} is outside this control, which has ${options.length} ` +
          `segment(s): ${(await this.describeOptions()).join(', ')}.`
      );
    }
    await this.pick(option, 'selectAt');
  }

  /**
   * Whether the control was disabled AS A WHOLE, from the `wr-segmented--disabled`
   * modifier.
   *
   * Deliberately not "every segment is disabled": a control whose options each carry
   * their own `disabled` looks identical to a user, and the modifier is the only thing
   * on the page that tells the two apart. What actually blocks a click is the native
   * `disabled` each button gets either way — ask a segment
   * ({@link WrSegmentedOptionHarness.isDisabled}) for that.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('wr-segmented--disabled');
  }

  /**
   * The rendered control size.
   *
   * `md` is the component's own default and earns NO modifier class, so a bare host
   * IS `md` — the absence is the answer rather than a missing one. Read from the
   * class instead of the input, which is also why this reports what was rendered:
   * unlike the form controls, `<wr-segmented>` does not resolve its size through
   * `provideWrConfig()`, so an app-wide default set there does not reach it and this
   * will say so.
   */
  async getSize(): Promise<WrSegmentedSize> {
    const host = await this.host();
    for (const size of SIZES) {
      if (await host.hasClass(`wr-segmented--${size}`)) return size;
    }
    return 'md';
  }

  /**
   * The accessible name of every segment a Tab press can reach, in tab order.
   *
   * A LIST, not one label, and that is the shape worth pinning: the component authors
   * no roving `tabindex`, so each enabled segment is its own tab stop and reaching the
   * third one takes three Tabs. An all-disabled control is skipped over entirely and
   * answers `[]`.
   *
   * Unnamed segments are reported as `(unnamed)` rather than throwing — a tab order is
   * still a fact worth reading on a page that has that bug in it.
   */
  async getTabStopLabels(): Promise<string[]> {
    const enabled = await this.getOptions({ disabled: false });
    return this.describe(enabled);
  }

  /**
   * The accessible name of the segment that currently holds focus, or `null` when
   * focus is elsewhere.
   *
   * Independent of the selection here — see the note on the class. Reported as
   * `(unnamed)` for a segment with no name, for the reason
   * {@link getTabStopLabels} gives.
   */
  async getFocusedLabel(): Promise<string | null> {
    for (const option of await this.getOptions()) {
      if (await option.isFocused()) {
        return (await option.getAccessibleName()) ?? '(unnamed)';
      }
    }
    return null;
  }

  /**
   * The index the component publishes for the thumb, from the
   * `--wr-segmented-thumb-index` custom property it sets inline.
   *
   * **Not the selection, and this is the difference that bites.** The property is
   * `Math.max(0, selectedIndex)`, so a control holding a value that matches no option
   * publishes `0` — the thumb parks under the FIRST segment and is hidden by
   * {@link isThumbVisible} instead of being moved out of the way. A harness that read
   * this to answer "which segment is selected" would report segment one for a control
   * with no selection at all. {@link getSelectedIndex} is the selection.
   *
   * It is also not where the thumb IS: the stylesheet turns this into a `translateX`,
   * and no measurement of that survives a DOM without layout. This is the input to
   * that, which is the part a unit test can honestly check.
   */
  async getThumbIndex(): Promise<number> {
    return this.thumbVar('--wr-segmented-thumb-index');
  }

  /**
   * The segment count the component publishes for the thumb, from
   * `--wr-segmented-thumb-count` — the divisor the stylesheet computes the thumb's
   * width with.
   *
   * Should always equal the number of segments, and the reason to ask is that nothing
   * else notices when it does not: a count that fell out of step with the options
   * leaves the thumb the wrong width and sliding to the wrong place, while every ARIA
   * state on the page stays correct. It is clamped to a minimum of `1`, so an empty
   * control reports `1` rather than dividing by zero.
   */
  async getThumbCount(): Promise<number> {
    return this.thumbVar('--wr-segmented-thumb-count');
  }

  /**
   * Whether the thumb is being shown at all.
   *
   * Read from the ABSENCE of the `wr-segmented--unselected` modifier, which is the
   * hook the stylesheet zeroes the thumb's opacity through. The computed opacity is
   * not the answer here — a unit test applies no stylesheet — so the public modifier
   * is the contract, and it is what tells "parked under segment one" from "hidden
   * because nothing is selected".
   */
  async isThumbVisible(): Promise<boolean> {
    return !(await (await this.host()).hasClass('wr-segmented--unselected'));
  }

  /**
   * Whether the thumb will animate its next move, from the `wr-segmented--mounted`
   * modifier that gates the transition.
   *
   * Not "the thumb is animating now": nothing about a running animation is visible to
   * a unit test. What this pins is the deliberate asymmetry — the class is added in
   * `afterNextRender`, so the FIRST snap to the initial value is instant and every
   * user-driven move after it slides. Deferred work like that only lands once the
   * fixture is stable, which every harness read already waits for.
   */
  async isThumbTransitionEnabled(): Promise<boolean> {
    return (await this.host()).hasClass('wr-segmented--mounted');
  }

  /** Click a segment and turn a click that did nothing into a failure that says why. */
  private async pick(option: WrSegmentedOptionHarness, caller: 'select' | 'selectAt'): Promise<void> {
    await option.select();

    if (!(await option.isSelected())) {
      const name = (await option.getAccessibleName()) ?? '(unnamed)';
      throw new Error(
        `WrSegmentedHarness.${caller}(): "${name}" is still unpressed after being clicked — either that ` +
          'option carries `disabled` or the whole control does.'
      );
    }
  }

  /** Segment names for an error message, which must not throw on its way out. */
  private async describeOptions(): Promise<string[]> {
    return this.describe(await this.getOptions());
  }

  private async describe(options: readonly WrSegmentedOptionHarness[]): Promise<string[]> {
    return Promise.all(options.map(async option => (await option.getAccessibleName()) ?? '(unnamed)'));
  }

  /** One of the thumb's inline custom properties, as a number. */
  private async thumbVar(property: string): Promise<number> {
    const raw = (await (await this.host()).getCssValue(property)).trim();
    const value = Number.parseInt(raw, 10);
    if (Number.isNaN(value)) {
      throw new Error(
        `WrSegmentedHarness: could not read \`${property}\`, which computed to "${raw}". The component sets it ` +
          'inline on the host; an environment that drops custom properties cannot answer this.'
      );
    }
    return value;
  }
}
