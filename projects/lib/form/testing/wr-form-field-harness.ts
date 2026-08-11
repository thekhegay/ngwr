/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  ContentContainerComponentHarness,
  type HarnessLoader,
  HarnessPredicate,
  type TestElement,
} from '@angular/cdk/testing';

import type { WrFormFieldError, WrFormFieldHarnessFilters } from './interfaces';

/**
 * The messages this field is showing, or the ones it is holding back.
 *
 * Anchored with `:scope >` because the field's own parts are all direct children
 * of its host: a `<wr-form-field>` nested in another one's control slot otherwise
 * has its error block matched by the OUTER field's query too, and the outer
 * answers with a sentence that is not its own.
 */
const MESSAGE = ':scope > .wr-form-field__errors > .wr-form-field__error';
const VISIBLE = `${MESSAGE}:not(.wr-form-field__error--hidden)`;
const SUPPRESSED = `${MESSAGE}.wr-form-field__error--hidden`;

/** The control slot — every native control lookup is scoped through this. */
const SLOT = ':scope > .wr-form-field__control';

/** The label and the hint, anchored for the same reason as {@link MESSAGE}. */
const LABEL = ':scope > .wr-form-field__label';
const HINT = ':scope > .wr-form-field__hint';

/**
 * Test harness for `<wr-form-field>` — the label + control + hint + validation
 * copy block.
 *
 * The field's real job is the COPY CONTRACT, and this harness is built around it.
 * A message reaches the DOM one of two ways, and they are distinguishable there:
 *
 * - a `<wr-form-error key="…">` the consumer wrote, which renders only while that
 *   key is failing — the others stay in the DOM carrying
 *   `wr-form-field__error--hidden`, which is why {@link getErrors} filters and
 *   {@link getSuppressedErrorKeys} exists. A raw `.wr-form-error` query answers
 *   with the held-back copy too, and reads green on the wrong sentence.
 * - a message the field RESOLVED for an error no markup claimed:
 *   `provideWrFormErrors()`, then the `ngwr/i18n` `validation.*` catalog, then a
 *   built-in English sentence. All three render the identical `<div>`, so
 *   `source` is `'resolved'` for every one of them — the DOM genuinely cannot say
 *   which link answered, and this harness does not pretend otherwise.
 *
 * Nothing renders at all until the projected control is touched or dirty, so a
 * spec has to reach that gate first: {@link blurControl} is the shortest way
 * (blur is what marks a bound control touched), and typing through the control's
 * own harness is the other.
 *
 * The field publishes no `aria-label` anywhere. Its `<label for>` pointing at the
 * projected control IS the naming story, and a control that does not adopt the
 * id leaves the field silently unlabelled — {@link isLabelLinkedToControl} is
 * what catches that. The other half is the reverse wiring: the control reads back
 * `aria-describedby` and `aria-invalid`, which is the only reason a screen reader
 * hears the message ({@link getAnnouncedDescription}).
 *
 * Harnesses loaded through this one resolve INSIDE the control slot, so the
 * control's own harness composes without a selector:
 *
 * @example
 * ```ts
 * const email = await loader.getHarness(WrFormFieldHarness.with({ label: 'Email' }));
 *
 * await (await email.getHarness(WrInputHarness)).setValue('nope');
 * await email.blurControl();
 *
 * expect(await email.getErrorTexts()).toEqual(["That isn't a valid email."]);
 * expect(await email.getAnnouncedDescription()).toBe("That isn't a valid email.");
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrFormFieldHarness extends ContentContainerComponentHarness {
  static hostSelector = 'wr-form-field';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrFormFieldHarnessFilters = {}): HarnessPredicate<WrFormFieldHarness> {
    return new HarnessPredicate(WrFormFieldHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('hint', options.hint, (harness, hint) => HarnessPredicate.stringMatches(harness.getHint(), hint))
      .addOption('required', options.required, async (harness, required) => (await harness.isRequired()) === required)
      .addOption('invalid', options.invalid, async (harness, invalid) => (await harness.isInvalid()) === invalid)
      .addOption('errorText', options.errorText, async (harness, text) => {
        for (const shown of await harness.getErrorTexts()) {
          if (await HarnessPredicate.stringMatches(shown, text)) return true;
        }
        return false;
      });
  }

  /**
   * The label text, or `null` when the field renders no label.
   *
   * The `*` and `(optional)` markers ride INSIDE the `<label>`, so they are
   * excluded here — otherwise this answers `'Email *'` and every equality
   * assertion has to know which marker the field happens to carry.
   *
   * `null` is not "the consumer forgot": `label=""` renders no `<label>` element
   * at all, which also means there is nothing naming the control.
   */
  async getLabel(): Promise<string | null> {
    const label = await this.labelElement();
    return label ? label.text({ exclude: '.wr-form-field__required, .wr-form-field__optional' }) : null;
  }

  /**
   * Whether the field is marked required.
   *
   * Read from the host's `wr-form-field--required` modifier, not from the `*`:
   * that marker is `aria-hidden="true"` decoration, and it is only rendered when
   * there is a label to hang it on — the modifier is set either way. Note what
   * this does NOT mean: the field forwards nothing to the projected control, so
   * `required` here is the field's own visual state. What announces the constraint
   * is the forms layer — a `required` rule writes the native `required` attribute
   * onto the control — and the two are set independently, so a field can carry the
   * `*` with no validator behind it.
   */
  async isRequired(): Promise<boolean> {
    return (await this.host()).hasClass('wr-form-field--required');
  }

  /**
   * Whether the label carries the `(optional)` marker.
   *
   * Read from the marker itself, because — unlike `required` — `optional` sets no
   * host modifier. It is also the marker a screen reader actually reads: this one
   * is not `aria-hidden`. `required` wins when both inputs are set, so a required
   * field is never optional here however it was bound.
   */
  async isOptional(): Promise<boolean> {
    return (await this.locatorForOptional(`${LABEL} .wr-form-field__optional`)()) !== null;
  }

  /**
   * The hint text, or `null` when none is showing.
   *
   * `null` does not mean the consumer set no hint: the error block takes the
   * hint's slot outright, so a field with a visible message has no hint in the DOM
   * at all. Note also that the hint carries no id and is NOT referenced by the
   * control's `aria-describedby` — see {@link getAnnouncedDescription}.
   */
  async getHint(): Promise<string | null> {
    const hint = await this.locatorForOptional(HINT)();
    return hint ? hint.text() : null;
  }

  /**
   * Whether the field is painting the error state.
   *
   * The host's `wr-form-field--invalid` modifier — what the user sees. The
   * screen-reader half lives on the control as `aria-invalid`, and the two are
   * separate elements rather than two readings of one: {@link isControlInvalid}.
   */
  async isInvalid(): Promise<boolean> {
    return (await this.host()).hasClass('wr-form-field--invalid');
  }

  /**
   * Every message the field is SHOWING, in DOM order — the consumer's markup
   * first, then whatever the field resolved for the keys that markup left over.
   *
   * Only THIS field's own error block is read — its direct child, holding its
   * direct children — so a `<wr-form-field>` nested in another one's control slot
   * contributes nothing to the outer field's answer. Without that anchoring the
   * outer field reports the inner one's copy as its own, which is the same class
   * of break as reading a sibling field's messages.
   */
  async getErrors(): Promise<WrFormFieldError[]> {
    const elements = await this.locatorForAll(VISIBLE)();

    return Promise.all(
      elements.map(async element => ({
        key: await element.getAttribute('data-key'),
        text: await element.text(),
        // The consumer's copy is its own element; a resolved message is a plain
        // `<div>` the field stamped out. That tag name is the whole of what the
        // DOM knows about provenance.
        source:
          (await element.getProperty<string>('tagName')).toLowerCase() === 'wr-form-error'
            ? ('projected' as const)
            : ('resolved' as const),
      }))
    );
  }

  /** The visible messages as text, in DOM order. */
  async getErrorTexts(): Promise<string[]> {
    return (await this.getErrors()).map(error => error.text);
  }

  /**
   * The visible message for one validator key.
   *
   * Throws rather than answering `null` when that key has no visible message: the
   * two reasons are worth failing on and the message names both — the key is not
   * in error at all, or its copy resolved to nothing.
   */
  async getErrorText(key: string): Promise<string> {
    const errors = await this.getErrors();
    const match = errors.find(error => error.key === key);
    if (match) return match.text;

    const shown = errors.map(error => error.key ?? '(keyless)');
    const detail =
      shown.length > 0
        ? `Showing: ${shown.join(', ')}.`
        : 'The field is showing nothing — it is either valid, or the control is still untouched and pristine.';

    throw new Error(
      `WrFormFieldHarness.getErrorText(${JSON.stringify(key)}): no visible message for that key. ${detail}`
    );
  }

  /**
   * The keys of the projected messages the field is holding BACK — copy that is in
   * the DOM but hidden because its key is not among the failing ones.
   *
   * This is the gating contract seen from outside, and the reason a spec must not
   * query `.wr-form-error` itself: the suppressed sentences sit right next to the
   * live one.
   */
  async getSuppressedErrorKeys(): Promise<string[]> {
    const hidden = await this.locatorForAll(SUPPRESSED)();
    const keys = await Promise.all(hidden.map(element => element.getAttribute('data-key')));
    return keys.filter((key): key is string => key !== null);
  }

  /**
   * Whether the field is announcing an error it has no words for: invalid, with an
   * error block that renders nothing.
   *
   * Worth a named check because it is invisible in review — the field still goes
   * red, and `aria-describedby` still points at the block, so a screen reader is
   * sent to an empty element. It happens when no link in the copy chain answers
   * the key (`[autoErrors]="false"` with no markup, or a key nothing has copy for
   * — Signal Forms reports `minLength`, while the chain only knows Angular's
   * lowercase `minlength`).
   */
  async hasEmptyErrorBlock(): Promise<boolean> {
    if (!(await this.isInvalid())) return false;
    return (await this.getErrors()).every(error => error.text.length === 0);
  }

  /** The id the `<label for>` points at, or `null` when there is no label. */
  async getLabelFor(): Promise<string | null> {
    const label = await this.labelElement();
    return label ? label.getAttribute('for') : null;
  }

  /** The `id` the projected control actually answers to, or `null` when it has none. */
  async getControlId(): Promise<string | null> {
    return (await this.control()).getAttribute('id');
  }

  /**
   * Whether the `<label for>` resolves to an element inside THIS field's control
   * slot — the only thing that makes the field nameable.
   *
   * Scoped to the slot on purpose: ids are document-global, so a check that went
   * through `getElementById` would also pass for a label pointing at a DIFFERENT
   * field's control, and for a control that has been moved out of the field
   * entirely. The failure this catches is quiet — a projected control that does
   * not adopt the field's `controlId` (a bare `<input>` with no `[wrInput]`, say)
   * leaves a `for` naming nothing, the field renders exactly as it always did, and
   * nothing is labelled.
   */
  async isLabelLinkedToControl(): Promise<boolean> {
    const id = await this.getLabelFor();
    if (!id) return false;
    return (await this.locatorForOptional(`${SLOT} [id="${id}"]`)()) !== null;
  }

  /**
   * The ids the projected control names in `aria-describedby`, in order.
   *
   * The field points this at the error block and nothing else — the hint has no
   * id — so an empty list while a hint is showing is correct rather than a bug.
   * That is not an oversight to fix from a harness either: `[wrInput]` derives
   * `aria-invalid` from the same signal, so describing the hint would announce
   * every hinted field as invalid.
   */
  async getDescribedByIds(): Promise<string[]> {
    const value = await (await this.control()).getAttribute('aria-describedby');
    return value ? value.split(/\s+/).filter(Boolean) : [];
  }

  /**
   * What a screen reader reads as the control's description: the text of the
   * elements `aria-describedby` names, joined by a space. `null` when the control
   * describes nothing.
   *
   * `''` is a real answer and the interesting one — the reference resolves to an
   * element with no text in it, which is {@link hasEmptyErrorBlock}. Ids naming
   * something outside this field are skipped (a consumer's own description is out
   * of a field harness's reach); an id naming nothing anywhere throws, because a
   * dangling reference is the bug this method exists to surface.
   *
   * Suppressed copy is excluded explicitly rather than left to CSS: a browser drops
   * `display: none` subtrees from the accessibility tree, but a unit test loads no
   * stylesheet at all, so the referenced block's raw `textContent` runs every
   * held-back sentence together with the live one and this would answer with copy
   * nobody can read.
   */
  async getAnnouncedDescription(): Promise<string | null> {
    const ids = await this.getDescribedByIds();
    if (ids.length === 0) return null;

    const parts: string[] = [];
    for (const id of ids) {
      const inField = await this.locatorForOptional(`[id="${id}"]`)();
      if (inField) {
        parts.push(await inField.text({ exclude: '.wr-form-field__error--hidden' }));
        continue;
      }
      if ((await this.documentRootLocatorFactory().locatorForOptional(`[id="${id}"]`)()) === null) {
        throw new Error(
          `WrFormFieldHarness.getAnnouncedDescription(): the control's aria-describedby names "${id}", which is not ` +
            'an element anywhere in the document — a screen reader is pointed at nothing.'
        );
      }
    }

    return parts.join(' ');
  }

  /**
   * Whether the control announces itself invalid.
   *
   * `aria-invalid` on the projected control, which is what assistive technology
   * is told — the field's own red styling is {@link isInvalid}. Both are here
   * because they live on different elements and travel in opposite directions: the
   * field renders the message, the control reads back that there is one. A field
   * that paints red while the control says nothing is a real (and silent) break.
   */
  async isControlInvalid(): Promise<boolean> {
    return (await (await this.control()).getAttribute('aria-invalid')) === 'true';
  }

  /** Move focus to the projected control. */
  async focusControl(): Promise<void> {
    return (await this.control()).focus();
  }

  /**
   * Blur the projected control, which is usually how a spec gets any message to
   * appear at all: a bound control marks itself touched on blur, and the field
   * renders nothing while the control is untouched AND pristine.
   */
  async blurControl(): Promise<void> {
    return (await this.control()).blur();
  }

  /** The rendered `<label>`, or `null` when `label` is empty. */
  private async labelElement(): Promise<TestElement | null> {
    return this.locatorForOptional(LABEL)();
  }

  /**
   * The control this field wraps.
   *
   * The element the label points at, when that resolves inside the slot — which
   * covers a control nested inside a component (`<wr-input-number>`'s own
   * `<input>` adopts the field's id, so the label names it, not the component
   * element). Otherwise the first native control in the slot, so a field with no
   * label still answers.
   */
  private async control(): Promise<TestElement> {
    const id = await this.getLabelFor();
    if (id) {
      const labelled = await this.locatorForOptional(`${SLOT} [id="${id}"]`)();
      if (labelled) return labelled;
    }

    const native = await this.locatorForOptional(`${SLOT} input, ${SLOT} select, ${SLOT} textarea`)();
    if (native) return native;

    throw new Error(
      'WrFormFieldHarness: this field wraps no control. Nothing in `.wr-form-field__control` answers to the ' +
        "label's `for`, and there is no <input> / <select> / <textarea> to fall back to."
    );
  }

  /**
   * The content loader every `HarnessLoader` method on this class runs through,
   * scoped to the control slot.
   *
   * So `field.getHarness(WrInputHarness)` finds the control this field wraps and
   * not a sibling field's — the loader is per-instance by construction, which is
   * what a document-wide query for the same selector would lose.
   */
  protected override async getRootHarnessLoader(): Promise<HarnessLoader> {
    return this.locatorFactory.harnessLoaderFor(SLOT);
  }
}
