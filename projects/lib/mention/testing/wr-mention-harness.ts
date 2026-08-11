/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  ComponentHarness,
  type HarnessLoader,
  HarnessPredicate,
  TestKey,
  type TestElement,
} from '@angular/cdk/testing';

import type { WrMentionHarnessFilters, WrMentionOptionHarnessFilters } from './interfaces';
import { WrMentionOptionHarness } from './wr-mention-option-harness';

/** How long {@link WrMentionHarness.blur} waits for the deferred close, in ms. Generous next to the 120ms grace period. */
const CLOSE_TIMEOUT = 1000;

/** How often it re-checks, in ms. */
const POLL_STEP = 10;

/**
 * The real `setTimeout`, captured at module load — before a spec can install fake
 * timers.
 *
 * {@link WrMentionHarness.blur} has to let REAL time pass: the close on blur is a
 * plain `setTimeout` inside the directive, and under zoneless change detection
 * `whenStable()` resolves without waiting for a macrotask. Reading a faked global
 * instead would mean the sleep never fires and the harness hangs where it should
 * fail with the message it prepared.
 */
const realSetTimeout = globalThis.setTimeout;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    realSetTimeout(resolve, ms);
  });
}

/**
 * Test harness for `[wrMention]` — the field, and the suggestion panel it opens
 * at the caret.
 *
 * The harness matches the FIELD, because that is the only part of a mention in the
 * fixture: the panel is a `ComponentPortal` in the shared overlay container, a
 * sibling of the whole app. Suggestions are read through the document root, scoped
 * by the id the field publishes as `aria-controls` — which is what keeps two
 * mention fields on one page from answering with each other's suggestions.
 *
 * **The field is not a combobox, and it has no `aria-expanded`.** Both are
 * deliberate (the source spells out why: it holds prose, `role="combobox"` is
 * disallowed on `<textarea>` and would drop `aria-multiline`, and `aria-expanded`
 * is not a supported state of `role="textbox"`), and both shape this harness.
 * `aria-controls` is STATIC — it names the listbox even while there is no listbox —
 * so {@link isOpen} asks whether the listbox EXISTS instead of reading a state
 * flag, and "a list appeared" reaches a screen reader through the live region that
 * {@link getStatusMessage} reads.
 *
 * **The panel's POSITION is not testable in jsdom, so nothing here reports it.**
 * `caret.ts` places the panel by measuring a mirror `<div>` with
 * `getBoundingClientRect`, and jsdom has no layout: every rect is zeros, so the
 * measurement collapses to the origin. The overlay still lands on finite numbers —
 * `line-height` computes to `normal` there, so `caret.ts` falls back to
 * `font-size * 1.2` and the pane is offset by that alone (a measured
 * `margin-top: 23.2px`, `margin-left: 0px` on a default fixture) — which is
 * precisely the problem: every one of them is an artefact of the environment
 * rather than a fact about the component. Assert placement in a real browser.
 *
 * @example
 * ```ts
 * const mention = await loader.getHarness(WrMentionHarness);
 *
 * await mention.type('hey @al');
 * expect(await mention.getOptionLabels()).toEqual(['Alan Turing', 'Linus Torvalds']);
 *
 * await mention.commit();
 * expect(await mention.getValue()).toBe('hey @Alan Turing ');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrMentionHarness extends ComponentHarness {
  /** The directive's host. Both tags, since the directive drives either one. */
  static hostSelector = 'input[wrMention], textarea[wrMention]';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrMentionHarnessFilters = {}): HarnessPredicate<WrMentionHarness> {
    return new HarnessPredicate(WrMentionHarness, options)
      .addOption('value', options.value, (harness, value) => HarnessPredicate.stringMatches(harness.getValue(), value))
      .addOption('placeholder', options.placeholder, (harness, placeholder) =>
        HarnessPredicate.stringMatches(harness.getPlaceholder(), placeholder)
      )
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open);
  }

  /** The field's whole text, mention fragments and prose alike. */
  async getValue(): Promise<string> {
    return (await this.host()).getProperty<string>('value');
  }

  /** The field's placeholder, or `''` when it has none. */
  async getPlaceholder(): Promise<string> {
    return (await this.host()).getProperty<string>('placeholder');
  }

  /**
   * Type into the field one keystroke at a time, APPENDING to whatever is there.
   *
   * The realistic path, and the one that exercises detection the way a person
   * does: the directive re-reads the text before the caret on every `input`, so
   * `type('hey @al')` opens the panel on the `@` and then narrows it twice.
   *
   * Focuses the field, which BLURS whatever was focused before — and a blurred
   * mention field closes its own panel. Use {@link setValue} when a spec needs two
   * fields suggesting at the same time.
   */
  async type(text: string): Promise<void> {
    return (await this.host()).sendKeys(text);
  }

  /**
   * Replace the field's whole text and let the directive detect once.
   *
   * The `input` event is dispatched by hand rather than through keystrokes so the
   * field is never focused — which is the only way to get two mention panels open
   * at once, since focusing one field blurs the other and blur closes its panel.
   * The caret lands at the end of the new text, where detection looks.
   */
  async setValue(text: string): Promise<void> {
    const host = await this.host();
    await host.setInputValue(text);
    await host.dispatchEvent('input');
  }

  /** Empty the field. The panel goes with it — there is no trigger char left to detect. */
  async clear(): Promise<void> {
    return (await this.host()).clear();
  }

  /**
   * Click the field.
   *
   * Re-opens the suggestions when the caret is still sitting inside a mention —
   * the directive re-detects on click, which is how a user who pressed Escape (or
   * clicked away and back) gets the panel again without retyping. Needs no layout:
   * the CDK dispatches the event on the element rather than hit-testing a point.
   */
  async click(): Promise<void> {
    return (await this.host()).click();
  }

  /**
   * Whether the panel is offering suggestions.
   *
   * Asks whether this field's listbox exists, because the field publishes no
   * open/closed state to read: `aria-expanded` is not a supported state of
   * `role="textbox"` (axe rates it a critical violation), and `aria-controls` is
   * static here, so its presence says nothing.
   */
  async isOpen(): Promise<boolean> {
    return (await this.listboxOrNull()) !== null;
  }

  /**
   * The field's `aria-autocomplete` — `'list'`, permanently.
   *
   * A capability, not a state: ARIA says authors should not toggle it to signal
   * that suggestions are showing, and being static is what makes the feature
   * discoverable on focus, before a trigger char is ever typed. {@link isOpen}
   * answers the state.
   */
  async getAutocomplete(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-autocomplete');
  }

  /**
   * The role the field PROMISES its popup will announce, from `aria-haspopup` —
   * `'listbox'`. Required alongside `aria-autocomplete="list"`, and it has to name
   * the popup's real role, which {@link getListboxRole} reads back off the panel.
   */
  async getPopupRole(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-haspopup');
  }

  /** The role the open panel announces — `'listbox'`. Throws while the panel is closed. */
  async getListboxRole(): Promise<string | null> {
    return (await this.listbox()).getAttribute('role');
  }

  /**
   * The panel's accessible name.
   *
   * ARIA requires a `role="listbox"` to have one, and a consumer never renders the
   * panel themselves — so the directive supplies it from the i18n catalog
   * (`mention.listbox`).
   */
  async getListboxLabel(): Promise<string | null> {
    return (await this.listbox()).getAttribute('aria-label');
  }

  /**
   * The suggestions on offer, in DOM order.
   *
   * The whole list a user can reach, not a window onto a longer one: the directive
   * slices the matches at `maxResults` (8 by default) before rendering, which is
   * why this panel needs no virtualisation.
   *
   * Throws while the panel is closed — the options do not exist anywhere until the
   * portal is attached, and an empty array reads like a panel that rendered
   * nothing.
   */
  async getOptions(filters: WrMentionOptionHarnessFilters = {}): Promise<WrMentionOptionHarness[]> {
    const loader = await this.listboxLoader();
    return loader.getAllHarnesses(WrMentionOptionHarness.with(filters));
  }

  /** The labels of the suggestions on offer, in DOM order. */
  async getOptionLabels(): Promise<string[]> {
    const options = await this.getOptions();
    return Promise.all(options.map(option => option.getText()));
  }

  /**
   * The id the field names in `aria-activedescendant`, or `null` when it names
   * nothing.
   *
   * The strict half of the field's two references. `aria-controls` is allowed to
   * dangle (see {@link isOpen}); this one is not — naming an element that is not
   * in the document is an author error no browser reports, it simply stops
   * announcing options. So `null` is the CORRECT answer while the panel is closed,
   * and worth asserting there.
   */
  async getActiveOptionId(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-activedescendant');
  }

  /**
   * The label a screen reader announces as the active suggestion.
   *
   * Resolved through `aria-activedescendant` the way an assistive technology
   * would, rather than by hunting for the active class — which is why it throws on
   * a reference that resolves to nothing instead of quietly reporting what the
   * class says.
   */
  async getActiveOptionLabel(): Promise<string> {
    const active = await this.activeOption('getActiveOptionLabel');
    return active.text();
  }

  /**
   * Where the active suggestion sits in {@link getOptions}, 0-based.
   *
   * Matched by id rather than counted by class, so the answer is the one
   * `aria-activedescendant` actually points at.
   */
  async getActiveOptionIndex(): Promise<number> {
    const id = await this.requireActiveOptionId('getActiveOptionIndex');
    const options = await this.getOptions();

    for (let index = 0; index < options.length; index++) {
      if ((await options[index].getId()) === id) return index;
    }

    throw new Error(
      `WrMentionHarness.getActiveOptionIndex(): aria-activedescendant names "${id}", which is not one of ` +
        `the ${options.length} suggestions on offer.`
    );
  }

  /**
   * Move the cursor down one suggestion, wrapping past the last back to the first.
   *
   * ArrowDown — and `aria-activedescendant` is the whole navigation model here,
   * because the options are never focused: focus stays in the field so the user can
   * keep typing the query.
   *
   * Throws while the panel is closed, where ArrowDown belongs to the field.
   */
  async nextOption(): Promise<void> {
    await this.requireOpen('nextOption');
    return (await this.host()).sendKeys(TestKey.DOWN_ARROW);
  }

  /** Move the cursor up one suggestion, wrapping past the first round to the last. */
  async previousOption(): Promise<void> {
    await this.requireOpen('previousOption');
    return (await this.host()).sendKeys(TestKey.UP_ARROW);
  }

  /**
   * Insert the active suggestion with Enter.
   *
   * The trigger char and the query are replaced by `valueWith(item, trigger)`
   * (`@Label` by default) plus a trailing space, the caret lands after that space,
   * the panel closes and `(wrMentionSelected)` fires with the item, the trigger
   * char and the query.
   *
   * Throws while the panel is closed — Enter is the field's own key there (a
   * newline in a `<textarea>`), and swallowing it would be the bug.
   */
  async commit(): Promise<void> {
    await this.requireOpen('commit');
    return (await this.host()).sendKeys(TestKey.ENTER);
  }

  /**
   * Insert the active suggestion with Tab instead.
   *
   * The same commit: the directive takes Tab as a second confirm key and
   * `preventDefault`s it, so focus stays in the field rather than leaving for the
   * next control.
   */
  async commitWithTab(): Promise<void> {
    await this.requireOpen('commitWithTab');
    return (await this.host()).sendKeys(TestKey.TAB);
  }

  /**
   * Pick the first suggestion matching the filters, with the mouse.
   *
   * Opens nothing by itself — type a trigger char first. Names what the panel does
   * offer when nothing matches, since a silent no-op here surfaces as an
   * unexplained unchanged field further down the spec.
   */
  async pick(filters: WrMentionOptionHarnessFilters): Promise<void> {
    const [option] = await this.getOptions(filters);
    if (!option) {
      const offered = await this.getOptionLabels();
      throw new Error(
        `WrMentionHarness.pick(): no suggestion matched ${JSON.stringify(filters)}. ` +
          `The panel offers: ${offered.join(', ')}.`
      );
    }

    return option.click();
  }

  /**
   * Dismiss the panel with Escape, leaving the typed text — trigger char and
   * query included — exactly as it is. A closed panel is left alone.
   *
   * Sends the WHOLE keystroke, keydown and keyup, as a real Escape is. That
   * matters here: the caret has not moved, so a keyup the directive re-detected on
   * would reopen the panel this just closed, and a harness that dispatched only
   * the keydown would report a dismissal the user never got.
   */
  async dismiss(): Promise<void> {
    if (!(await this.isOpen())) return;
    return (await this.host()).sendKeys(TestKey.ESCAPE);
  }

  /**
   * Blur the field and wait for the panel to go.
   *
   * The close is deferred by 120ms so a `mousedown` on a suggestion lands first,
   * and that is a real `setTimeout`: under zoneless change detection nothing
   * flushes it for us, so this waits out REAL time. A spec on fake timers should
   * drive its own clock and read {@link isOpen} instead of calling this.
   */
  async blur(timeout = CLOSE_TIMEOUT): Promise<void> {
    await (await this.host()).blur();

    for (let waited = 0; waited <= timeout; waited += POLL_STEP) {
      if (!(await this.isOpen())) return;

      await sleep(POLL_STEP);
      await this.forceStabilize();
    }

    throw new Error(
      `WrMentionHarness.blur(): the panel is still showing ${timeout}ms after the blur. The close is ` +
        'deferred so that a click on a suggestion lands first, and this wait uses real time — a spec on ' +
        'fake timers has to advance the clock itself and read isOpen().'
    );
  }

  /**
   * What the live region currently says.
   *
   * This is the announcement channel the field has INSTEAD of ARIA state, and
   * three things reach a screen reader only through it: how many suggestions
   * appeared, that NOTHING matched — the panel closes in that case, so there is no
   * DOM left to inspect and no state on the field to read — and what was inserted
   * on commit.
   *
   * Throws when more than one mention field is mounted. The region is parked on
   * `<body>` rather than in the panel (which is disposed on every keystroke that
   * leaves a mention, and a live region has to pre-exist its own text to be
   * announced at all), and it carries no id tying it to a field — so with two
   * fields around, the harness genuinely cannot tell which region is this one's.
   * Answering with whichever came first would be worse than refusing: assert
   * announcements in a fixture holding a single mention field.
   */
  async getStatusMessage(): Promise<string> {
    const regions = await this.documentRootLocatorFactory().locatorForAll('.wr-mention__status')();

    if (regions.length === 0) {
      throw new Error(
        'WrMentionHarness.getStatusMessage(): no mention live region is in the document. The directive ' +
          'appends it to <body> in the browser only, so there is none under SSR.'
      );
    }
    if (regions.length > 1) {
      throw new Error(
        `WrMentionHarness.getStatusMessage(): ${regions.length} mention live regions are in the document ` +
          'and none of them names the field it belongs to, so this cannot say which one is yours. Assert ' +
          'the announcement in a fixture with a single mention field.'
      );
    }

    return regions[0].text();
  }

  /** Move keyboard focus to the field. Focusing alone opens nothing — the panel needs a trigger char. */
  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  /** Whether the field holds keyboard focus. It keeps it while the panel is open, by design. */
  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }

  /**
   * A loader scoped to THIS field's listbox.
   *
   * Scoped by the id the field publishes as `aria-controls`, never by
   * `.wr-mention-panel`: the overlay container is shared by every mention on the
   * page, so a class query would answer with whichever field opened first.
   */
  private async listboxLoader(): Promise<HarnessLoader> {
    // Resolve the element first, so a closed panel fails with the message below
    // rather than with the CDK's generic "expected to find element" error.
    await this.listbox();
    return this.documentRootLocatorFactory().harnessLoaderFor(`#${await this.listboxId()}`);
  }

  /** This field's listbox in the overlay. Throws when the panel is closed. */
  private async listbox(): Promise<TestElement> {
    const listbox = await this.listboxOrNull();
    if (!listbox) {
      throw new Error(
        'WrMentionHarness: no suggestions are showing, so there is nothing inside the panel to read. It ' +
          'exists only while the caret sits after a trigger char that matched something — type() one in ' +
          'first. (The field publishes aria-controls whether or not the panel is up, so that attribute is ' +
          'not the check.)'
      );
    }
    return listbox;
  }

  /** This field's listbox, or `null` when the panel is closed. */
  private async listboxOrNull(): Promise<TestElement | null> {
    return this.documentRootLocatorFactory().locatorForOptional(`#${await this.listboxId()}`)();
  }

  /** The id the field names in `aria-controls`, which its listbox carries. */
  private async listboxId(): Promise<string> {
    const id = await (await this.host()).getAttribute('aria-controls');
    if (!id) {
      throw new Error(
        'WrMentionHarness: this field publishes no aria-controls. That is a static host binding on ' +
          '[wrMention] — rendered even under SSR — so the element matched here is probably not a mention ' +
          'field at all.'
      );
    }
    return id;
  }

  /** The element `aria-activedescendant` points at, or a targeted failure. */
  private async activeOption(method: string): Promise<TestElement> {
    const id = await this.requireActiveOptionId(method);
    const active = await this.documentRootLocatorFactory().locatorForOptional(`#${id}`)();

    if (!active) {
      throw new Error(
        `WrMentionHarness.${method}(): aria-activedescendant names "${id}", which is not in the document. ` +
          'A dangling reference stops a screen reader announcing options and no browser reports it, so it ' +
          'is a real failure rather than a harness one.'
      );
    }
    return active;
  }

  /** The active option's id, or a targeted failure. */
  private async requireActiveOptionId(method: string): Promise<string> {
    const id = await this.getActiveOptionId();
    if (!id) {
      throw new Error(
        `WrMentionHarness.${method}(): the field names no active suggestion. That is the correct state ` +
          'while the panel is closed — check isOpen() first.'
      );
    }
    return id;
  }

  /** Refuse a keystroke that would mean something else entirely with the panel closed. */
  private async requireOpen(method: string): Promise<void> {
    if (await this.isOpen()) return;

    throw new Error(
      `WrMentionHarness.${method}(): no suggestions are showing, so this key belongs to the field itself ` +
        '— Enter is a newline, Tab leaves for the next control, and the arrows move the caret. Type a ' +
        'trigger char first.'
    );
  }
}
