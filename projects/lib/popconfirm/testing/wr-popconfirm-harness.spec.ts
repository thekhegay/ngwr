import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal, viewChildren } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrButton } from 'ngwr/button';
import { WrButtonHarness } from 'ngwr/button/testing';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { WrPopconfirm, type WrPopconfirmPosition } from 'ngwr/popconfirm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrPopconfirmHarness } from './wr-popconfirm-harness';

@Component({
  imports: [WrPopconfirm, WrButton],
  template: `
    <button
      type="button"
      cancelText="Keep"
      confirmText="Delete"
      confirmColor="danger"
      [wrPopconfirm]="message()"
      [position]="side()"
      [ariaLabel]="label()"
      (confirmed)="log.push('confirmed')"
      (cancelled)="log.push('cancelled')"
    >
      Delete
    </button>

    <!-- The element form of the button, which brings a host class BINDING of its own —
         so this doubles as the pin on the trigger's marker class surviving it. -->
    <wr-btn wrPopconfirm="Publish now?" (confirmed)="log.push('published')">Publish</wr-btn>

    <button type="button" disabled wrPopconfirm="Archive this?">Archive</button>
  `,
})
class Host {
  readonly message = signal('Delete this for good?');
  readonly label = signal<string | null>(null);
  /**
   * BOUND on purpose, like `message` and `ariaLabel`: a bound input leaves no
   * attribute in the DOM, so this is what keeps `getPosition()` honest — a harness
   * reading `position` off the trigger would answer `null` here.
   */
  readonly side = signal<WrPopconfirmPosition>('right');
  readonly log: string[] = [];
}

@Component({
  imports: [WrPopconfirm],
  template: `
    <button
      type="button"
      position="top"
      cancelText="Keep"
      wrPopconfirm="Delete the draft?"
      (confirmed)="picked.set('a')"
      (cancelled)="cancelled.push('a')"
    >
      A
    </button>
    <button
      type="button"
      position="bottom"
      cancelText="Leave it"
      confirmColor="danger"
      wrPopconfirm="Publish the draft?"
      (confirmed)="picked.set('b')"
      (cancelled)="cancelled.push('b')"
    >
      B
    </button>
  `,
})
class TwoHost {
  private readonly popconfirms = viewChildren(WrPopconfirm);

  readonly picked = signal<string | null>(null);
  readonly cancelled: string[] = [];

  /**
   * The only way to get two of these showing at once, and a consumer's way too:
   * `open()` is public on the directive, so a keyboard shortcut or a bulk action
   * can raise a second dialog without a press. Through the TRIGGERS it cannot
   * happen — see the first case below.
   */
  openAll(): void {
    for (const popconfirm of this.popconfirms()) popconfirm.open();
  }
}

@Component({
  imports: [WrPopconfirm],
  template: `<button type="button" wrPopconfirm="Удалить?">Удалить</button>`,
})
class RussianHost {}

/**
 * `[wrPopconfirm]` renders its dialog into the CDK overlay container, so nothing
 * the harness reads about a panel is reachable from the fixture — which is why it
 * scopes every panel query by the `aria-controls` id the trigger publishes.
 * `provideWrOverlay()` keeps that container out of the next spec file's.
 */
describe('WrPopconfirmHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const get = (triggerText: string): Promise<WrPopconfirmHarness> =>
    loader.getHarness(WrPopconfirmHarness.with({ triggerText }));

  const log = (): string[] => fixture.componentInstance.log;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('finds every trigger, whichever element the directive sits on', async () => {
    const all = await loader.getAllHarnesses(WrPopconfirmHarness);

    // Two halves of one point. `Delete` binds its question, so `[wrPopconfirm]`
    // leaves NO attribute in the DOM and only the marker class finds it. `Publish`
    // is the `<wr-btn>` element form, which carries a host `[class]` binding of its
    // own — if that binding won over the directive's static host class, the marker
    // would be gone and the whole element form would be unfindable.
    expect(await Promise.all(all.map(p => p.getTriggerText()))).toEqual(['Delete', 'Publish', 'Archive']);
  });

  it('narrows by trigger text and by open state', async () => {
    const byPattern = await loader.getAllHarnesses(WrPopconfirmHarness.with({ triggerText: /^Pub/ }));
    expect(await Promise.all(byPattern.map(p => p.getTriggerText()))).toEqual(['Publish']);

    expect(await loader.getAllHarnesses(WrPopconfirmHarness.with({ open: true }))).toEqual([]);

    await (await get('Delete')).open();

    const open = await loader.getAllHarnesses(WrPopconfirmHarness.with({ open: true }));
    const shut = await loader.getAllHarnesses(WrPopconfirmHarness.with({ open: false }));
    expect(await Promise.all(open.map(p => p.getTriggerText()))).toEqual(['Delete']);
    expect(await Promise.all(shut.map(p => p.getTriggerText()))).toEqual(['Publish', 'Archive']);
  });

  it('opens on the trigger and reports what the dialog announces', async () => {
    const remove = await get('Delete');
    expect(await remove.isOpen()).toBe(false);

    await remove.open();

    expect(await remove.isOpen()).toBe(true);
    expect(await remove.getRole()).toBe('dialog');
    // Non-modal is deliberate: focus moves in but is not trapped, because Escape
    // and an outside press both dismiss.
    expect(await remove.isModal()).toBe(false);
    // Resolved from the pane's modifier class — a bound `position` never reaches
    // the DOM, and the CDK's own offset is an inline style jsdom cannot lay out.
    expect(await remove.getPosition()).toBe('right');
    expect(await remove.getMessage()).toBe('Delete this for good?');
    // The question resolved the way a screen reader resolves it. Without the link
    // the dialog announces its name and then nothing at all.
    expect(await remove.getDescriptionText()).toBe('Delete this for good?');
  });

  it('reads the anchor side off the panel, and re-reads it on the next open', async () => {
    const remove = await get('Delete');
    await remove.open();
    expect(await remove.getPosition()).toBe('right');

    await remove.close();
    fixture.componentInstance.side.set('left');
    fixture.detectChanges();
    await remove.open();

    // `position` is bound, so the trigger carries no attribute to read and the only
    // truthful source is the modifier the pane is given at open time — which also
    // means it has to be re-derived per open, not remembered from the first one.
    expect(await remove.getPosition()).toBe('left');
  });

  it('resolves the description through the aria link, not by reading the paragraph', async () => {
    const remove = await get('Delete');
    await remove.open();
    expect(await remove.getDescriptionText()).toBe('Delete this for good?');

    // Break the naming link the way a regression would — the question is still on
    // screen, but nothing points a screen reader at it. `getDescriptionText()` has to
    // go quiet, because reporting the paragraph regardless would report a dialog that
    // announces its name and then nothing at all as if it were fine.
    document.querySelector('.wr-popconfirm__message')?.removeAttribute('id');

    expect(await remove.getDescriptionText()).toBeNull();
    expect(await remove.getMessage()).toBe('Delete this for good?');
  });

  it('names the dialog, defaulted or overridden', async () => {
    const remove = await get('Delete');
    await remove.open();

    // An unnamed `role="dialog"` announces as a bare "dialog", so the catalog's
    // `popconfirm.label` stands in when the consumer supplies nothing.
    expect(await remove.getLabel()).toBe('Confirm action');

    await remove.close();
    fixture.componentInstance.label.set('Delete invoice');
    fixture.detectChanges();
    await remove.open();

    expect(await remove.getLabel()).toBe('Delete invoice');
  });

  it('reports both action labels and the confirm intent', async () => {
    const remove = await get('Delete');
    await remove.open();

    expect(await remove.getCancelText()).toBe('Keep');
    expect(await remove.getConfirmText()).toBe('Delete');
    // Cancel first: the safe choice leads, because the one being confirmed is
    // usually the destructive one.
    expect(await remove.getActionLabels()).toEqual(['Keep', 'Delete']);
    expect(await remove.getConfirmColor()).toBe('danger');
  });

  it('falls back to the catalog for labels the consumer leaves alone', async () => {
    const publish = await get('Publish');
    await publish.open();

    expect(await publish.getActionLabels()).toEqual(['Cancel', 'Confirm']);
    // `confirmColor` defaults to `primary`, so the confirm button always carries an
    // intent — and the cancel button never does, which is how the two read as a
    // safe choice next to a committed one.
    expect(await publish.getConfirmColor()).toBe('primary');
  });

  it('lands focus inside the dialog, on the safe choice', async () => {
    const remove = await get('Delete');
    await remove.open();

    // Focus used to stay on the trigger, and the overlay container sits at the end
    // of `<body>` — so Tab went to the next thing on the PAGE and the only way to
    // confirm was unreachable.
    expect(await remove.getFocusedActionLabel()).toBe('Keep');
    expect(await remove.isTriggerFocused()).toBe(false);

    // And it reports the action that actually holds focus rather than the first one:
    // cancel leads, so a harness returning `actions[0]` whenever anything is focused
    // would agree with the assertion above and be wrong about every other state.
    await (await remove.getHarness(WrButtonHarness.with({ text: 'Delete' }))).focus();

    expect(await remove.getFocusedActionLabel()).toBe('Delete');
  });

  it('confirms, emits confirmed, closes and hands focus back', async () => {
    const remove = await get('Delete');
    await remove.open();

    await remove.confirm();

    expect(log()).toEqual(['confirmed']);
    expect(await remove.isOpen()).toBe(false);
    // Removing the panel would drop focus to `<body>`; the trigger gets it back
    // because focus was still inside the panel when it went.
    expect(await remove.isTriggerFocused()).toBe(true);
  });

  it('cancels, emitting cancelled', async () => {
    const remove = await get('Delete');
    await remove.open();

    await remove.cancel();

    expect(log()).toEqual(['cancelled']);
    expect(await remove.isOpen()).toBe(false);
  });

  it('dismisses on Escape, emitting cancelled', async () => {
    const remove = await get('Delete');
    await remove.open();

    await remove.sendEscape();

    expect(await remove.isOpen()).toBe(false);
    expect(log()).toEqual(['cancelled']);
  });

  it('dismisses on a press outside the panel, emitting cancelled', async () => {
    const remove = await get('Delete');
    await remove.open();

    await remove.clickOutside();

    expect(await remove.isOpen()).toBe(false);
    expect(log()).toEqual(['cancelled']);
  });

  it('takes the question back on a second press of the trigger, emitting nothing', async () => {
    const remove = await get('Delete');
    await remove.open();

    await remove.close();

    expect(await remove.isOpen()).toBe(false);
    // The surprise worth pinning: every OTHER way out emits `cancelled`, but the
    // directive treats a second press as withdrawing the question rather than as
    // answering it — so a spec that counted on `close()` to report a cancellation
    // would be asserting nothing.
    expect(log()).toEqual([]);
  });

  it('refuses to read a dialog that is not showing, naming what it looked for', async () => {
    const remove = await get('Delete');

    // A silent `null` here becomes a confusing failure three lines later — and with
    // another popconfirm open it would be worse than confusing.
    await expect(remove.getMessage()).rejects.toThrow(/aria-controls/);
    await expect(remove.getRole()).rejects.toThrow(/nothing is showing/);
    await expect(remove.getActionLabels()).rejects.toThrow(/nothing is showing/);
    await expect(remove.getConfirmText()).rejects.toThrow(/nothing is showing/);
    await expect(remove.getFocusedActionLabel()).rejects.toThrow(/nothing is showing/);
    await expect(remove.getHarness(WrButtonHarness)).rejects.toThrow(/nothing is showing/);
  });

  it('says so when a disabled trigger cannot be opened', async () => {
    const archive = await get('Archive');

    // A native `<button disabled>` never receives the click at all, so no amount of
    // pressing helps and a quiet resolve would strand the spec on a shut dialog.
    await expect(archive.open()).rejects.toThrow(/did not open/);
    expect(await archive.isOpen()).toBe(false);
  });

  it("reaches a consumer's own harness inside its own panel", async () => {
    const remove = await get('Delete');
    await remove.open();

    // The content loader is scoped to this dialog, so the button harness resolves
    // against the panel rather than against the whole overlay container.
    const confirm = await remove.getHarness(WrButtonHarness.with({ text: 'Delete' }));
    expect(await confirm.getColor()).toBe('danger');

    await confirm.click();
    expect(log()).toEqual(['confirmed']);
  });
});

/**
 * The scoping case. Two dialogs in one shared overlay container: every panel read
 * has to answer about the instance it was asked of, on the single-element path
 * (`getMessage`, `getPosition`), on the LIST path (`getActionLabels`,
 * `getFocusedActionLabel`) and through the content loader — a bare
 * `.wr-popconfirm` query answers with whichever one opened first on all three.
 */
describe('WrPopconfirmHarness — two dialogs open at once', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const both = (): Promise<WrPopconfirmHarness[]> => loader.getAllHarnesses(WrPopconfirmHarness);

  /** Raise both dialogs through the directive's own `open()` — see `TwoHost.openAll`. */
  const openBoth = async (): Promise<WrPopconfirmHarness[]> => {
    fixture.componentInstance.openAll();
    fixture.detectChanges();
    return both();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('a press on the second trigger dismisses the first', async () => {
    const [a, b] = await both();

    await a.open();
    await b.open();

    // Pressing a trigger is an outside press for every other open dialog, so
    // through the triggers alone only one can ever be showing — which is exactly
    // why the rest of this describe reaches for the directive's `open()`.
    expect(await a.isOpen()).toBe(false);
    expect(await b.isOpen()).toBe(true);
    expect(fixture.componentInstance.cancelled).toEqual(['a']);
  });

  it('reads its own dialog while the other one is open', async () => {
    const [a, b] = await openBoth();

    expect(await a.isOpen()).toBe(true);
    expect(await b.isOpen()).toBe(true);

    expect(await a.getMessage()).toBe('Delete the draft?');
    expect(await b.getMessage()).toBe('Publish the draft?');
    expect(await a.getDescriptionText()).toBe('Delete the draft?');
    expect(await b.getDescriptionText()).toBe('Publish the draft?');
    // Both panes carry `.wr-popconfirm-overlay`, so a class-scoped harness would
    // report the first one's placement twice over.
    expect(await a.getPosition()).toBe('top');
    expect(await b.getPosition()).toBe('bottom');
    expect(await a.getConfirmColor()).toBe('primary');
    expect(await b.getConfirmColor()).toBe('danger');
  });

  it('scopes the list path too, not just the single-element one', async () => {
    const [a, b] = await openBoth();

    // Four action buttons in one container. An unscoped `locatorForAll` would hand
    // back all four, and the first two answer for whichever dialog opened first.
    expect(await a.getActionLabels()).toEqual(['Keep', 'Confirm']);
    expect(await b.getActionLabels()).toEqual(['Leave it', 'Confirm']);

    // The second `open()` moved focus into ITS panel, so the first one holds none —
    // an unscoped read would claim both dialogs had a focused action.
    expect(await a.getFocusedActionLabel()).toBeNull();
    expect(await b.getFocusedActionLabel()).toBe('Leave it');
  });

  it("reaches the confirm button in its own dialog, not the other one's", async () => {
    const [a, b] = await openBoth();

    // Both panels hold a button labelled `Confirm` — an unscoped content loader
    // resolves the first in the container and answers the wrong question.
    await (await b.getHarness(WrButtonHarness.with({ text: 'Confirm' }))).click();

    expect(fixture.componentInstance.picked()).toBe('b');
    // And nothing happened to the other dialog: a press inside one panel is not an
    // outside press for the panels beneath it.
    expect(await a.isOpen()).toBe(true);
    expect(fixture.componentInstance.cancelled).toEqual([]);
  });

  it('dismisses every open dialog when the press lands on the container', async () => {
    const [a, b] = await openBoth();

    await a.clickOutside();

    // The container is outside BOTH panes, and the outside-click source walks its
    // watchers top-most first and only stops at one that contains the press — so a
    // press there is an outside press for every dialog, not just the one it was
    // asked of. Worth knowing before using it as a "close this one" shortcut.
    expect(await a.isOpen()).toBe(false);
    expect(await b.isOpen()).toBe(false);
    expect(fixture.componentInstance.cancelled).toEqual(['b', 'a']);
  });

  it('sends Escape to the topmost dialog, whichever pane it is aimed at', async () => {
    const [a, b] = await openBoth();

    await a.sendEscape();

    // Not a harness bug and worth knowing: the key is picked up by the overlay's
    // keyboard dispatcher, which keeps one document listener and routes to the
    // top-most overlay regardless of the target. So `a.sendEscape()` closes `b`.
    expect(await b.isOpen()).toBe(false);
    expect(await a.isOpen()).toBe(true);
    expect(fixture.componentInstance.cancelled).toEqual(['b']);
  });
});

/**
 * Both button labels and the dialog's name route through the `ngwr/i18n` catalog,
 * so what the harness reports is the RESOLVED text — a spec asserting the English
 * default would be asserting the wrong thing in a localized app.
 */
describe('WrPopconfirmHarness under a localized catalog', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<RussianHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrOverlay(),
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    fixture = TestBed.createComponent(RussianHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reports the labels and the dialog name the catalog supplies', async () => {
    const remove = await loader.getHarness(WrPopconfirmHarness);
    await remove.open();

    expect(await remove.getActionLabels()).toEqual(['Отмена', 'Подтвердить']);
    expect(await remove.getCancelText()).toBe('Отмена');
    expect(await remove.getConfirmText()).toBe('Подтвердить');
    expect(await remove.getLabel()).toBe('Подтверждение действия');
  });
});
