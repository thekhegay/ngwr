import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrButton } from 'ngwr/button';
import { WrButtonHarness } from 'ngwr/button/testing';
import { provideWrOverlay } from 'ngwr/overlay';
import { WrPopover } from 'ngwr/popover';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrPopoverHarness } from './wr-popover-harness';

@Component({
  imports: [WrPopover],
  template: `
    <button type="button" [wrPopover]="panel" [ariaLabel]="panelLabel()">Details</button>
    <button type="button" trigger="hover" [wrPopover]="panel">Hover</button>
    <button type="button" mode="tooltip" position="right" [wrPopover]="tip()">Save</button>

    <ng-template #panel><p>Anything you can render.</p></ng-template>
  `,
})
class Host {
  readonly tip = signal('Save changes');
  readonly panelLabel = signal<string | null>(null);
}

@Component({
  imports: [WrPopover, WrButton],
  template: `
    <button type="button" trigger="hover" position="top" [wrPopover]="one">A</button>
    <button type="button" trigger="hover" [wrPopover]="two">B</button>

    <ng-template #one>
      <div>One<button type="button" wr-btn (click)="picked.set('one')">Confirm</button></div>
    </ng-template>
    <ng-template #two>
      <div>Two<button type="button" wr-btn (click)="picked.set('two')">Confirm</button></div>
    </ng-template>
  `,
})
class TwoHost {
  readonly picked = signal<string | null>(null);
}

@Component({
  imports: [WrPopover],
  template: `
    <button type="button" responsive [wrPopover]="panel">Filters</button>
    <ng-template #panel><p>Sheet content.</p></ng-template>
  `,
})
class SheetHost {}

@Component({
  imports: [WrPopover],
  // `[mode]` BOUND, not the static `mode="tooltip"` the other hosts use: a
  // property binding leaves nothing in the DOM, which is the case the harness's
  // "read the ARIA contract, not the input" rule exists for.
  template: `<button type="button" [mode]="mode()" [wrPopover]="tip()">Bound</button>`,
})
class BoundModeHost {
  readonly mode = signal<'popover' | 'tooltip'>('tooltip');
  readonly tip = signal('Bound tip');
}

/**
 * `[wrPopover]` renders into a CDK overlay, so nothing this spec asserts about a
 * panel is reachable from the fixture — which is exactly why the harness scopes
 * its panel queries by the id the trigger publishes. `provideWrOverlay()` keeps
 * the container out of the next spec file's.
 *
 * Real timers throughout, deliberately: the tooltip's show / hide delays and the
 * hover popover's grace period are real `setTimeout`s, and under zoneless change
 * detection nothing flushes them for us — waiting them out is what the harness's
 * waiters are for. Delay SEMANTICS are `popover.spec.ts`'s job, with a fake clock.
 */
describe('WrPopoverHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const get = (triggerText: string): Promise<WrPopoverHarness> =>
    loader.getHarness(WrPopoverHarness.with({ triggerText }));

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('finds every trigger and tells the two shapes apart', async () => {
    const all = await loader.getAllHarnesses(WrPopoverHarness);

    expect(await Promise.all(all.map(p => p.getTriggerText()))).toEqual(['Details', 'Hover', 'Save']);
    // The mode is read from the ARIA contract, not from the `mode` input — which
    // is the only option, since a bound `[mode]` never reaches the DOM.
    expect(await Promise.all(all.map(p => p.getMode()))).toEqual(['popover', 'popover', 'tooltip']);
  });

  it('narrows by trigger text, by mode and by open state', async () => {
    const tooltips = await loader.getAllHarnesses(WrPopoverHarness.with({ mode: 'tooltip' }));
    expect(await Promise.all(tooltips.map(p => p.getTriggerText()))).toEqual(['Save']);

    const byPattern = await loader.getAllHarnesses(WrPopoverHarness.with({ triggerText: /^H/ }));
    expect(await Promise.all(byPattern.map(p => p.getTriggerText()))).toEqual(['Hover']);

    expect(await loader.getAllHarnesses(WrPopoverHarness.with({ open: true }))).toEqual([]);

    await (await get('Details')).open();

    const open = await loader.getAllHarnesses(WrPopoverHarness.with({ open: true }));
    const shut = await loader.getAllHarnesses(WrPopoverHarness.with({ open: false }));
    expect(await Promise.all(open.map(p => p.getTriggerText()))).toEqual(['Details']);
    expect(await Promise.all(shut.map(p => p.getTriggerText()))).toEqual(['Hover', 'Save']);
  });

  it('opens a popover on click and reports what the panel announces', async () => {
    const details = await get('Details');
    expect(await details.isOpen()).toBe(false);

    await details.open();

    expect(await details.isOpen()).toBe(true);
    expect(await details.getContentText()).toBe('Anything you can render.');
    expect(await details.getRole()).toBe('dialog');
    // Non-modal is deliberate: focus is not trapped, the panel dismisses on
    // outside click / Escape rather than blocking the page.
    expect(await details.isModal()).toBe(false);
    expect(await details.isSheet()).toBe(false);
    // Resolved, not given — the directive defaults a popover to `bottom`.
    expect(await details.getPosition()).toBe('bottom');
  });

  it('reports the dialog name, defaulted or overridden', async () => {
    const details = await get('Details');
    await details.open();

    // `role="dialog"` with no name announces as a bare "dialog", so the catalog
    // default stands in when the consumer supplies nothing.
    expect(await details.getLabel()).toBe('Popover');

    await details.close();
    fixture.componentInstance.panelLabel.set('Order details');
    fixture.detectChanges();
    await details.open();

    expect(await details.getLabel()).toBe('Order details');
  });

  it('closes a popover on Escape typed at the trigger', async () => {
    const details = await get('Details');
    await details.open();

    // The raw gesture, which is what `close()` sends: a popover has no Escape
    // binding of its own, so this only works because the overlay's keyboard
    // dispatcher picks the key up off the document.
    await details.sendEscape();
    await details.waitUntilClosed();

    expect(await details.isOpen()).toBe(false);
    // Nothing to read once the panel is gone, and the id it was read through is
    // gone with it.
    await expect(details.getContentText()).rejects.toThrow(/nothing is showing/);
  });

  it('refuses to read a panel that is not showing, naming the attribute it looked for', async () => {
    const details = await get('Details');
    const save = await get('Save');

    // A silent `null` here becomes a confusing failure three lines later.
    await expect(details.getRole()).rejects.toThrow(/aria-controls/);
    await expect(save.getPosition()).rejects.toThrow(/aria-describedby/);
    await expect(details.getHarness(WrButtonHarness)).rejects.toThrow(/nothing is showing/);
  });

  it('opens a hover-driven popover on the pointer alone, then waits out its grace period', async () => {
    const hover = await get('Hover');

    // `trigger` is an input, so the DOM does not say which gesture this trigger
    // wants: the harness hovers first and only falls back to a click — which is
    // what the click-driven `Details` popover above takes.
    await hover.open();
    expect(await hover.isOpen()).toBe(true);

    await hover.mouseAway();
    // Not shut yet: the pointer is given 120ms to cross the gap into the panel.
    expect(await hover.isOpen()).toBe(true);

    await hover.waitUntilClosed();
    expect(await hover.isOpen()).toBe(false);
  });

  it('a popover describes nothing — it is owned by its trigger, not read as its description', async () => {
    const details = await get('Details');
    await details.open();

    expect(await details.getDescriptionText()).toBeNull();
  });

  it('shows a tooltip on hover and wires it up as the trigger description', async () => {
    const save = await get('Save');
    expect(await save.isOpen()).toBe(false);

    await save.hover();
    await save.waitUntilOpen();

    expect(await save.getRole()).toBe('tooltip');
    expect(await save.getContentText()).toBe('Save changes');
    // Resolving `aria-describedby` the way a screen reader would: the trigger
    // points at the pane, and the pane is the one element carrying the role.
    expect(await save.getDescriptionText()).toBe('Save changes');
    expect(await save.getPosition()).toBe('right');
    // A tooltip has no name of its own; it IS the description.
    expect(await save.getLabel()).toBeNull();
  });

  it('shows a tooltip on focus too, and hides it again on blur', async () => {
    const save = await get('Save');

    await save.focus();
    await save.waitUntilOpen();
    expect(await save.isOpen()).toBe(true);

    await save.blur();
    await save.waitUntilClosed();
    expect(await save.isOpen()).toBe(false);
    expect(await save.getDescriptionText()).toBeNull();
  });

  it('says so when a tooltip never opens, instead of waiting out the full budget', async () => {
    fixture.componentInstance.tip.set('');
    fixture.detectChanges();

    const save = await get('Save');
    await save.hover();

    // An empty string schedules no show at all, so no amount of waiting helps.
    await expect(save.waitUntilOpen(50)).rejects.toThrow(/nothing opened within 50ms/);
  });

  it('opens and closes a tooltip through open() / close(), which a click cannot do', async () => {
    const save = await get('Save');

    await save.open();
    expect(await save.isOpen()).toBe(true);

    // A click is no part of tooltip mode — it neither opens nor toggles one,
    // which is why `open()` reaches for the pointer and not the mouse button.
    await save.click();
    expect(await save.isOpen()).toBe(true);

    await save.close();
    expect(await save.isOpen()).toBe(false);
  });
});

describe('WrPopoverHarness — two panels open at once', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  /**
   * Both triggers are hover-driven, which is what makes two panels open at once
   * possible at all — and this doubles as the pin on `open()` leading with the
   * pointer: a click on the second trigger is an outside pointer event for the
   * first panel, so a harness that clicked first would quietly leave one panel
   * open and prove nothing about scoping.
   */
  const openBoth = async (): Promise<WrPopoverHarness[]> => {
    const both = await loader.getAllHarnesses(WrPopoverHarness);
    for (const popover of both) await popover.open();
    return both;
  };

  it('reads its own panel while the other one is open', async () => {
    const [a, b] = await openBoth();

    expect(await a.isOpen()).toBe(true);
    expect(await b.isOpen()).toBe(true);
    expect(await a.getContentText()).toBe('OneConfirm');
    expect(await b.getContentText()).toBe('TwoConfirm');
    // Both panes carry `.wr-popover-overlay`, so a class-scoped harness would
    // answer with the first one's placement twice over.
    expect(await a.getPosition()).toBe('top');
    expect(await b.getPosition()).toBe('bottom');
  });

  it("reaches the consumer's own component inside its own panel", async () => {
    const [, b] = await openBoth();

    // Both panels hold a button labelled `Confirm`: an unscoped content loader
    // resolves the first one in the container and clicks the wrong popover's.
    await (await b.getHarness(WrButtonHarness.with({ text: 'Confirm' }))).click();

    expect(fixture.componentInstance.picked()).toBe('two');
  });
});

describe('WrPopoverHarness — mode bound rather than set statically', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<BoundModeHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(BoundModeHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('tells the shape from ARIA, which is all a bound [mode] leaves to read', async () => {
    const bound = await loader.getHarness(WrPopoverHarness);

    // The static `mode="tooltip"` elsewhere in this file stays in the DOM as a
    // plain attribute, so a harness that read the input's spelling would look
    // right there and wrong here. `aria-haspopup` is the signal that survives
    // either spelling — absent on a tooltip trigger, `"dialog"` on a popover's.
    expect(await bound.getMode()).toBe('tooltip');
    expect(await loader.getAllHarnesses(WrPopoverHarness.with({ mode: 'popover' }))).toEqual([]);

    // And the mode read drives everything downstream: hover, not click, and the
    // panel id comes off `aria-describedby`.
    await bound.open();
    expect(await bound.getRole()).toBe('tooltip');
    expect(await bound.getDescriptionText()).toBe('Bound tip');
  });
});

describe('WrPopoverHarness — presented as a sheet', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SheetHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    // `responsive` docks the panel to the bottom edge below 640px. jsdom reports
    // a 1024px window and offers no way to resize it, so the width is stubbed —
    // and stubs are not auto-restored, so afterEach undoes it or the next file
    // opens every popover as a sheet.
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(400);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(SheetHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('reports a sheet, which has no anchor and so no placement', async () => {
    const filters = await loader.getHarness(WrPopoverHarness);
    await filters.open();

    expect(await filters.isSheet()).toBe(true);
    // No position modifier on the pane: a sheet is docked to the viewport, not
    // pointed at the trigger, and its arrow is switched off in CSS to match.
    expect(await filters.getPosition()).toBeNull();
    expect(await filters.getContentText()).toBe('Sheet content.');
    expect(await filters.getRole()).toBe('dialog');
  });
});
