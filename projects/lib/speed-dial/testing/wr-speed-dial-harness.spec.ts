import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrSpeedDial, type WrSpeedDialAction, type WrSpeedDialDirection } from 'ngwr/speed-dial';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSpeedDialActionHarness } from './wr-speed-dial-action-harness';
import { WrSpeedDialHarness } from './wr-speed-dial-harness';

const ACTIONS: readonly WrSpeedDialAction[] = [
  { id: 'share', label: 'Share', icon: 'link' },
  { id: 'copy', label: 'Copy link' },
];

@Component({
  imports: [WrSpeedDial],
  template: `
    <wr-speed-dial
      [(open)]="open"
      [actions]="actions()"
      [direction]="direction()"
      [triggerLabel]="triggerLabel()"
      [disabled]="disabled()"
      [safeArea]="safeArea()"
      (pick)="picked.push($event.id)"
    />
  `,
})
class Host {
  readonly open = signal(false);
  readonly actions = signal<readonly WrSpeedDialAction[]>(ACTIONS);
  readonly direction = signal<WrSpeedDialDirection>('up');
  readonly triggerLabel = signal<string | null>(null);
  readonly disabled = signal(false);
  readonly safeArea = signal(false);
  readonly picked: string[] = [];
}

/** Two dials, so a menu query that is not scoped answers for the wrong trigger. */
@Component({
  imports: [WrSpeedDial],
  template: `
    <wr-speed-dial triggerLabel="Compose" [actions]="[{ id: 'mail', label: 'Mail' }]" />
    <wr-speed-dial triggerLabel="Create" [actions]="[{ id: 'doc', label: 'Doc' }]" />
  `,
})
class TwoDialsHost {}

/**
 * Used as a consumer would. The one thing to know reading these: the actions are in
 * the DOM whether the dial is open or not — `visibility` is what hides them, and a
 * unit test applies no CSS — so every assertion about them goes through a harness
 * that refuses to answer while the dial is closed.
 */
describe('WrSpeedDialHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const dial = (): Promise<WrSpeedDialHarness> => loader.getHarness(WrSpeedDialHarness);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('starts closed, and opens and closes from the trigger', async () => {
    const harness = await dial();
    expect(await harness.isOpen()).toBe(false);

    await harness.open();
    expect([await harness.isOpen(), fixture.componentInstance.open()]).toEqual([true, true]);

    await harness.close();
    expect([await harness.isOpen(), fixture.componentInstance.open()]).toEqual([false, false]);
  });

  it('refuses to hand back actions the user cannot reach', async () => {
    const harness = await dial();

    await expect(harness.getActions()).rejects.toThrow(/the dial is closed/);
    await expect(harness.getActionLabels()).rejects.toThrow(/the dial is closed/);

    // Counting them is not reaching for them, so that answers either way.
    expect(await harness.getActionCount()).toBe(2);
  });

  it('lists the actions once it is open', async () => {
    const harness = await dial();
    await harness.open();

    expect(await harness.getActionLabels()).toEqual(['Share', 'Copy link']);
  });

  it('reads what each action draws, which is not what it is called', async () => {
    const harness = await dial();
    await harness.open();

    const [share, copy] = await harness.getActions();

    expect([await share.getLabel(), await share.hasIcon(), await share.getIconName()]).toEqual(['Share', true, 'link']);
    // No icon, so the button draws the first glyph of the label and nothing else.
    expect([await copy.getLabel(), await copy.hasIcon(), await copy.getInitial()]).toEqual(['Copy link', false, 'C']);
  });

  it('draws a whole emoji rather than half a surrogate pair', async () => {
    fixture.componentInstance.actions.set([{ id: 'party', label: '🎉 Celebrate' }]);
    await fixture.whenStable();

    const harness = await dial();
    await harness.open();

    const [party] = await harness.getActions();
    expect(await party.getInitial()).toBe('🎉');
  });

  it('picks an action, emits it and closes', async () => {
    const harness = await dial();

    await harness.pick({ label: 'Share' });

    expect(fixture.componentInstance.picked).toEqual(['share']);
    expect(await harness.isOpen()).toBe(false);
  });

  it('puts focus back on the trigger when the picked action collapses', async () => {
    // The keyboard path: the caret is on the action when it is activated, and the
    // wrapper it lives in becomes `visibility: hidden` — a browser blurs what it hides,
    // so without the return the caret lands on `<body>`.
    const harness = await dial();
    await harness.open();

    const [share] = await harness.getActions();
    await share.focus();
    await share.click();

    expect([await harness.isOpen(), await harness.isTriggerFocused()]).toEqual([false, true]);
    expect(fixture.componentInstance.picked).toEqual(['share']);
  });

  it('opens on its own when asked to pick from a closed dial', async () => {
    const harness = await dial();
    expect(await harness.isOpen()).toBe(false);

    await harness.pick({ label: 'Copy link' });

    expect(fixture.componentInstance.picked).toEqual(['copy']);
  });

  it('names what it does offer when nothing matches', async () => {
    const harness = await dial();
    await expect(harness.pick({ label: 'Print' })).rejects.toThrow(/Share, Copy link/);
  });

  it('closes on Escape and puts focus back on the trigger', async () => {
    const harness = await dial();
    await harness.open();

    const [share] = await harness.getActions();
    await share.focus();
    expect(await harness.isTriggerFocused()).toBe(false);

    await harness.sendEscape();

    expect([await harness.isOpen(), await harness.isTriggerFocused()]).toEqual([false, true]);
    expect(fixture.componentInstance.picked).toEqual([]);
  });

  it('names the trigger, defaulting to plain English with no catalog', async () => {
    const harness = await dial();
    expect(await harness.getTriggerLabel()).toBe('Actions');
    expect(await harness.getTriggerIcon()).toBe('add');

    fixture.componentInstance.triggerLabel.set('Compose');
    await fixture.whenStable();

    expect(await harness.getTriggerLabel()).toBe('Compose');
  });

  it('reports the direction and the safe-area padding', async () => {
    const harness = await dial();
    expect([await harness.getDirection(), await harness.hasSafeArea()]).toEqual(['up', false]);

    fixture.componentInstance.direction.set('left');
    fixture.componentInstance.safeArea.set(true);
    await fixture.whenStable();

    expect([await harness.getDirection(), await harness.hasSafeArea()]).toEqual(['left', true]);
  });

  it('pairs the trigger with its own action list', async () => {
    const harness = await dial();

    // `list`, not `menu`: the dial has none of the menu keys, and the role is spelled
    // out only because `list-style: none` costs the implicit semantics in Safari.
    expect(await harness.getMenuRole()).toBe('list');
    expect(await harness.isMenuBound()).toBe(true);
  });

  it('reports a disabled dial and refuses to open it', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    const harness = await dial();

    expect(await harness.isDisabled()).toBe(true);
    await expect(harness.open()).rejects.toThrow(/did not open/);
  });

  it('follows an open state written from outside, and a disable that closes it', async () => {
    const harness = await dial();

    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    expect(await harness.isOpen()).toBe(true);

    // A disabled trigger is the only way to close the dial, so the component closes
    // it rather than stranding it fanned out.
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(await harness.isOpen()).toBe(false);
  });

  it('matches on the trigger name, the direction and the two states', async () => {
    expect(await loader.getHarnessOrNull(WrSpeedDialHarness.with({ triggerLabel: 'Actions' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrSpeedDialHarness.with({ direction: 'up' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrSpeedDialHarness.with({ direction: 'down' }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrSpeedDialHarness.with({ open: false }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrSpeedDialHarness.with({ disabled: true }))).toBeNull();
  });
});

describe('WrSpeedDialHarness — two dials on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoDialsHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(TwoDialsHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('gives each dial its own actions and its own menu id', async () => {
    const compose = await loader.getHarness(WrSpeedDialHarness.with({ triggerLabel: 'Compose' }));
    const create = await loader.getHarness(WrSpeedDialHarness.with({ triggerLabel: 'Create' }));

    await compose.open();
    await create.open();

    expect(await compose.getActionLabels()).toEqual(['Mail']);
    expect(await create.getActionLabels()).toEqual(['Doc']);
    expect([await compose.isMenuBound(), await create.isMenuBound()]).toEqual([true, true]);
  });

  it('finds every action from the fixture loader, which is the unscoped query', async () => {
    expect(await loader.getAllHarnesses(WrSpeedDialActionHarness)).toHaveLength(2);
  });
});
