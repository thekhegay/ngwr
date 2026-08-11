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
  TestKey,
  type TestElement,
} from '@angular/cdk/testing';

import type { WrPopconfirmPosition } from 'ngwr/popconfirm';
import { WR_COLORS, type WrColor } from 'ngwr/theme';

import type { WrPopconfirmHarnessFilters } from './interfaces';

/** The two answers a popconfirm offers, which are also its two action modifiers. */
type WrPopconfirmAction = 'confirm' | 'cancel';

/**
 * Test harness for `[wrPopconfirm]` — the "are you sure?" dialog anchored to its
 * trigger.
 *
 * The panel is NOT inside the trigger: it is a component portal in the overlay
 * container, a sibling of the whole app. So everything about it is reached
 * through the document root, scoped by the `aria-controls` id the trigger
 * publishes while the dialog is showing — which is what keeps two popconfirms
 * from reading each other's question, and why every panel reader throws while the
 * dialog is shut: there is no element to answer about.
 *
 * **The two actions are told apart by their own modifiers**, never by position.
 * `.wr-popconfirm__action--cancel` and `--confirm` are what `cancel()` and
 * `confirm()` click, so a template that ever reorders the pair cannot silently
 * turn a spec's "cancel" into a delete.
 *
 * Being a CONTENT CONTAINER means a consumer's own harnesses resolve INSIDE this
 * instance's panel — `popconfirm.getHarness(WrButtonHarness…)` reaches the
 * buttons without the spec ever naming the overlay.
 *
 * @example
 * ```ts
 * const loader = TestbedHarnessEnvironment.loader(fixture);
 * const remove = await loader.getHarness(WrPopconfirmHarness.with({ triggerText: 'Delete' }));
 *
 * await remove.open();
 * expect(await remove.getMessage()).toBe('Delete this item?');
 * await remove.confirm();
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrPopconfirmHarness extends ContentContainerComponentHarness {
  /**
   * The directive's host — whatever element the consumer put `[wrPopconfirm]` on.
   *
   * Matched by the marker class, not by `[wrPopconfirm]`: the question is normally
   * BOUND (`[wrPopconfirm]="question"`), and a property binding leaves no
   * attribute in the DOM at all. Same shape as `.wr-popover-trigger` and
   * `.wr-dropdown-trigger`.
   */
  static hostSelector = '.wr-popconfirm-trigger';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrPopconfirmHarnessFilters = {}): HarnessPredicate<WrPopconfirmHarness> {
    return new HarnessPredicate(WrPopconfirmHarness, options)
      .addOption('triggerText', options.triggerText, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getTriggerText(), text)
      )
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open);
  }

  /** The trigger's own visible label. The question inside the panel is `getMessage()`. */
  async getTriggerText(): Promise<string> {
    return (await this.host()).text();
  }

  /**
   * Whether the dialog is showing.
   *
   * Read from `aria-expanded` rather than from a class, because that is the whole
   * of what the trigger tells a screen reader — the directive puts no state class
   * on its host at all.
   */
  async isOpen(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-expanded')) === 'true';
  }

  /** Whether the trigger currently has keyboard focus — the state it is handed back on close. */
  async isTriggerFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }

  /**
   * Press the trigger to open the dialog.
   *
   * Throws when nothing opens, because the reason is always worth failing on: a
   * native `<button disabled>` trigger never receives the click at all. (A
   * DISABLED `<wr-btn>` is a jsdom blind spot in the other direction — it is kept
   * inert by `pointer-events: none`, which jsdom does not apply, so it opens here
   * and would not in a browser.)
   */
  async open(): Promise<void> {
    if (await this.isOpen()) return;

    await (await this.host()).click();
    if (await this.isOpen()) return;

    throw new Error(
      'WrPopconfirmHarness.open(): the dialog did not open. A disabled trigger takes no click — assert ' +
        'the disabled state instead of trying to open it.'
    );
  }

  /**
   * Press the trigger again to take the question back.
   *
   * This is the ONE way out that answers nothing: the directive treats a second
   * press as withdrawing the question, so `cancelled` does NOT fire — unlike
   * `cancel()`, `sendEscape()` and `clickOutside()`, which all emit it. Use this
   * when a spec needs the panel gone without recording an answer.
   */
  async close(): Promise<void> {
    if (!(await this.isOpen())) return;

    await (await this.host()).click();
    if (!(await this.isOpen())) return;

    throw new Error('WrPopconfirmHarness.close(): the dialog is still open after a second press of the trigger.');
  }

  /** The question being asked. */
  async getMessage(): Promise<string> {
    return (await this.inPanel('.wr-popconfirm__message')).text();
  }

  /**
   * The confirm button's label.
   *
   * Resolved, not given: `confirmText` falls back to the `popconfirm.confirm`
   * catalog entry, so a localized app reads its own word here and a spec that
   * asserted the English default would be asserting the wrong thing.
   */
  async getConfirmText(): Promise<string> {
    return (await this.action('confirm')).text();
  }

  /** The cancel button's label — `cancelText`, or the `popconfirm.cancel` catalog entry. */
  async getCancelText(): Promise<string> {
    return (await this.action('cancel')).text();
  }

  /**
   * Both action labels in the order they are rendered: cancel first, confirm
   * second.
   *
   * That order is deliberate and worth reading — the destructive choice is the one
   * being confirmed, so the safe one comes first and takes the initial focus.
   */
  async getActionLabels(): Promise<string[]> {
    const actions = await this.allInPanel('.wr-popconfirm__action');
    return Promise.all(actions.map(action => action.text()));
  }

  /**
   * The confirm button's intent colour.
   *
   * Checked against `WR_COLORS` rather than pattern-matched out of the class list:
   * `wr-btn--*` also spells the size, the shape and the icon position, so only the
   * intent list can say which of them is a colour. Today `WrButton` happens to
   * emit the colour first, so a first-match regex would agree — but that order is
   * not a contract, and the same regex on a button with no colour answers `sm`.
   * Never `null` in practice — `confirmColor` defaults to `primary` — but typed
   * for it, since the button itself allows no colour at all.
   */
  async getConfirmColor(): Promise<WrColor | null> {
    const classes = (await (await this.action('confirm')).getAttribute('class')) ?? '';
    const present = classes.split(/\s+/);
    return WR_COLORS.find(color => present.includes(`wr-btn--${color}`)) ?? null;
  }

  /** Which action holds keyboard focus, by label, or `null` when focus is elsewhere. */
  async getFocusedActionLabel(): Promise<string | null> {
    for (const action of await this.allInPanel('.wr-popconfirm__action')) {
      if (await action.isFocused()) return action.text();
    }
    return null;
  }

  /** Answer the question: click confirm, which emits `confirmed` and closes the dialog. */
  async confirm(): Promise<void> {
    return (await this.action('confirm')).click();
  }

  /** Decline: click cancel, which emits `cancelled` and closes the dialog. */
  async cancel(): Promise<void> {
    return (await this.action('cancel')).click();
  }

  /**
   * Dismiss with Escape, which emits `cancelled`.
   *
   * Sent at the pane rather than at the focused button, because the target makes
   * no difference: the key is picked up by the overlay's keyboard dispatcher,
   * which keeps one listener on the document and routes to the topmost overlay.
   * The pane is the one element guaranteed to be there.
   */
  async sendEscape(): Promise<void> {
    return (await this.pane()).sendKeys(TestKey.ESCAPE);
  }

  /**
   * Dismiss by pressing outside the panel, which emits `cancelled`.
   *
   * The press lands on the overlay CONTAINER — an ancestor of the pane (the CDK
   * puts a host `<div>` between the two), and so outside the panel by the only
   * measure that matters here, since the dismissal is decided by whether the press
   * started inside the pane. With two dialogs showing it dismisses BOTH: neither
   * pane contains the container. jsdom has no layout
   * and no `document.elementFromPoint`, so a harness cannot aim at "whatever is
   * under the pointer"; to dismiss by pressing a specific element instead, click
   * that element's own `TestElement`.
   */
  async clickOutside(): Promise<void> {
    const id = await this.panelId();
    const container = await this.documentRootLocatorFactory().locatorFor('.cdk-overlay-container')();

    await container.click();
    if (!(await this.isOpen())) return;

    throw new Error(
      `WrPopconfirmHarness.clickOutside(): the dialog (#${id}) is still open. An outside press is judged ` +
        'by where it started, so a press that began inside the panel does not dismiss it.'
    );
  }

  /**
   * The role the open panel announces — `'dialog'`.
   *
   * Worth asserting rather than assuming: the directive sets it on the OVERLAY
   * PANE, not on the panel component a consumer can see in the template.
   */
  async getRole(): Promise<string | null> {
    return (await this.pane()).getAttribute('role');
  }

  /**
   * The dialog's accessible name — the `ariaLabel` input, or the catalog's
   * `popconfirm.label`.
   *
   * A `role="dialog"` with no name announces as a bare "dialog" and trips axe's
   * `aria-dialog-name`, which is why there is always one.
   */
  async getLabel(): Promise<string | null> {
    return (await this.pane()).getAttribute('aria-label');
  }

  /**
   * Whether the dialog claims modality.
   *
   * `false`, deliberately, and worth pinning: focus is moved into the panel but
   * NOT trapped, because Escape and an outside click both dismiss — trapping
   * would only make it harder to leave.
   */
  async isModal(): Promise<boolean> {
    return (await (await this.pane()).getAttribute('aria-modal')) === 'true';
  }

  /**
   * The text a screen reader reads as the dialog's DESCRIPTION, resolved through
   * `aria-describedby` the way an assistive technology would.
   *
   * This is the question, and it is the entire content of a confirmation: without
   * the link the dialog announces its name and then nothing at all.
   */
  async getDescriptionText(): Promise<string | null> {
    const id = await (await this.pane()).getAttribute('aria-describedby');
    if (!id) return null;

    const described = await this.documentRootLocatorFactory().locatorForOptional(`#${id}`)();
    return described ? described.text() : null;
  }

  /**
   * Which side of the trigger the panel is anchored to.
   *
   * The side that was ASKED for, read off the pane's public modifier class —
   * `position` is an input, so a bound one never reaches the DOM, and the panel's
   * own offset is a CDK inline style that says nothing in a layout-less jsdom.
   * Not where the panel ended up: the position strategy is flexible and pushes,
   * so a panel with no room on that side moves without the class changing.
   */
  async getPosition(): Promise<WrPopconfirmPosition | null> {
    const classes = (await (await this.pane()).getAttribute('class')) ?? '';
    const modifier = /wr-popconfirm-overlay--([a-z]+)/.exec(classes);
    return modifier ? (modifier[1] as WrPopconfirmPosition) : null;
  }

  /**
   * Harnesses for anything inside the panel resolve within THIS instance's dialog.
   *
   * Scoped by the published id rather than by `.wr-popconfirm`: the overlay
   * container is shared, so a class query would answer with whichever popconfirm
   * opened first.
   */
  protected override async getRootHarnessLoader(): Promise<HarnessLoader> {
    return this.documentRootLocatorFactory().harnessLoaderFor(`#${await this.panelId()}`);
  }

  /**
   * One of the two action buttons.
   *
   * By its own modifier class, never by index: both are a `<wr-btn size="sm">`, so
   * before the modifiers existed the only thing telling them apart was document
   * order — and a harness that clicked "the second button" would go on passing
   * while it started confirming what a spec meant to cancel.
   */
  private async action(role: WrPopconfirmAction): Promise<TestElement> {
    return this.inPanel(`.wr-popconfirm__action--${role}`);
  }

  /** One element inside THIS instance's panel. */
  private async inPanel(selector: string): Promise<TestElement> {
    return this.documentRootLocatorFactory().locatorFor(`#${await this.panelId()} ${selector}`)();
  }

  /** Every matching element inside THIS instance's panel, in document order. */
  private async allInPanel(selector: string): Promise<TestElement[]> {
    return this.documentRootLocatorFactory().locatorForAll(`#${await this.panelId()} ${selector}`)();
  }

  /** This instance's overlay pane — the element carrying the dialog semantics. */
  private async pane(): Promise<TestElement> {
    return this.documentRootLocatorFactory().locatorFor(`#${await this.panelId()}`)();
  }

  /** The id the trigger publishes for its dialog, which exists only while the dialog does. */
  private async panelId(): Promise<string> {
    const id = await (await this.host()).getAttribute('aria-controls');

    if (!id) {
      throw new Error(
        'WrPopconfirmHarness: nothing is showing. The trigger publishes its dialog id as aria-controls ' +
          'only while the dialog is open — call open() first.'
      );
    }
    return id;
  }
}
