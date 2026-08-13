import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrActionSheet, type WrActionSheetAction } from 'ngwr/action-sheet';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrActionSheetActionHarness } from './wr-action-sheet-action-harness';
import { WrActionSheetHarness } from './wr-action-sheet-harness';

const ACTIONS: readonly WrActionSheetAction[] = [
  { label: 'Take Photo', icon: 'camera', value: 'camera' },
  { label: 'Choose from Library', icon: 'image', value: 'library' },
  { label: 'Delete', role: 'destructive', value: 'delete' },
  { label: 'Locked', value: 'locked', disabled: true },
  { label: 'Cancel', role: 'cancel', value: 'cancel' },
];

@Component({
  imports: [WrActionSheet],
  template: `
    <wr-action-sheet
      [(open)]="open"
      [actions]="actions()"
      [title]="title()"
      [message]="message()"
      [titleFallback]="titleFallback()"
      (action)="chosen.push($event.label)"
    />
  `,
})
class Host {
  readonly open = signal(true);
  readonly actions = signal<readonly WrActionSheetAction[]>(ACTIONS);
  readonly title = signal('');
  readonly message = signal('');
  readonly titleFallback = signal<string | null>(null);
  readonly chosen: string[] = [];
}

/** Two sheets open at once — the setup that catches one answering for the other's rows. */
@Component({
  imports: [WrActionSheet],
  template: `
    <wr-action-sheet [open]="true" title="Photo" [actions]="[{ label: 'Take Photo' }]" />
    <wr-action-sheet [open]="true" title="Document" [actions]="[{ label: 'Scan' }, { label: 'Upload' }]" />
  `,
})
class TwoSheetsHost {}

/**
 * Used exactly as a consumer would: through the ROOT loader, because the sheet renders
 * through `<wr-drawer>` into the overlay container and a fixture-scoped loader sees
 * nothing at all.
 *
 * Each spec provides its own `provideWrOverlay()` so its container does not survive into
 * the next file's.
 */
describe('WrActionSheetHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let rootLoader: ReturnType<typeof TestbedHarnessEnvironment.documentRootLoader>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('is invisible to a fixture-scoped loader and found from the document root', async () => {
    const local = TestbedHarnessEnvironment.loader(fixture);
    expect(await local.getHarnessOrNull(WrActionSheetHarness)).toBeNull();
    expect(await rootLoader.getHarnessOrNull(WrActionSheetHarness)).not.toBeNull();
  });

  it('reads the title and message, and answers null for the ones not given', async () => {
    const sheet = await rootLoader.getHarness(WrActionSheetHarness);
    expect([await sheet.getTitle(), await sheet.getMessage()]).toEqual([null, null]);

    fixture.componentInstance.title.set('Photo');
    fixture.componentInstance.message.set('Pick a source');
    await fixture.whenStable();

    expect([await sheet.getTitle(), await sheet.getMessage()]).toEqual(['Photo', 'Pick a source']);
  });

  it('announces a name even with no visible title, and prefers the visible one', async () => {
    const sheet = await rootLoader.getHarness(WrActionSheetHarness);
    expect(await sheet.getAccessibleName()).toBe('Actions');
    expect(await sheet.isTitleVisible()).toBe(false);

    fixture.componentInstance.titleFallback.set('Photo options');
    await fixture.whenStable();
    expect(await sheet.getAccessibleName()).toBe('Photo options');

    fixture.componentInstance.title.set('Photo');
    await fixture.whenStable();
    expect([await sheet.getAccessibleName(), await sheet.isTitleVisible()]).toEqual(['Photo', true]);
  });

  it('wires the dialog to whichever name it is using', async () => {
    const sheet = await rootLoader.getHarness(WrActionSheetHarness);
    expect(await sheet.isNamed()).toBe(true);

    fixture.componentInstance.title.set('Photo');
    await fixture.whenStable();

    expect([await sheet.getAccessibleName(), await sheet.isNamed()]).toEqual(['Photo', true]);
  });

  it('lists every row in DOM order', async () => {
    const sheet = await rootLoader.getHarness(WrActionSheetHarness);
    expect(await sheet.getActionLabels()).toEqual(['Take Photo', 'Choose from Library', 'Delete', 'Locked', 'Cancel']);
  });

  it('keeps the cancel row in a group of its own', async () => {
    const sheet = await rootLoader.getHarness(WrActionSheetHarness);

    expect(await sheet.getActionGroups()).toEqual([
      ['Take Photo', 'Choose from Library', 'Delete', 'Locked'],
      ['Cancel'],
    ]);
    expect(await sheet.hasCancelGroup()).toBe(true);
  });

  it('draws no cancel group when nothing carries the role', async () => {
    fixture.componentInstance.actions.set([{ label: 'Share' }, { label: 'Delete', role: 'destructive' }]);
    await fixture.whenStable();

    const sheet = await rootLoader.getHarness(WrActionSheetHarness);
    expect(await sheet.hasCancelGroup()).toBe(false);
    expect(await sheet.getActionGroups()).toEqual([['Share', 'Delete']]);
  });

  it('reads the role, icon and disabled state of each row', async () => {
    const sheet = await rootLoader.getHarness(WrActionSheetHarness);
    const [photo, , remove, locked, cancel] = await sheet.getActions();

    expect([await photo.getRole(), await remove.getRole(), await cancel.getRole()]).toEqual([
      'default',
      'destructive',
      'cancel',
    ]);
    expect([await photo.hasIcon(), await photo.getIconName()]).toEqual([true, 'camera']);
    expect([await remove.hasIcon(), await remove.getIconName()]).toEqual([false, null]);
    expect([await photo.isDisabled(), await locked.isDisabled()]).toEqual([false, true]);
  });

  it('filters rows by label, role and disabled state', async () => {
    const sheet = await rootLoader.getHarness(WrActionSheetHarness);

    const destructive = await sheet.getActions({ role: 'destructive' });
    expect(await Promise.all(destructive.map(row => row.getLabel()))).toEqual(['Delete']);

    const enabled = await sheet.getActions({ disabled: false });
    expect(enabled).toHaveLength(4);

    const byPattern = await sheet.getActions({ label: /^Choose/ });
    expect(await byPattern[0].getLabel()).toBe('Choose from Library');
  });

  it('emits the chosen row and closes, leaving the harness stale', async () => {
    const sheet = await rootLoader.getHarness(WrActionSheetHarness);
    expect(await sheet.isOpen()).toBe(true);

    await sheet.select({ label: 'Delete' });

    expect(fixture.componentInstance.chosen).toEqual(['Delete']);
    expect(fixture.componentInstance.open()).toBe(false);
    expect(await sheet.isOpen()).toBe(false);
    expect(await rootLoader.getHarnessOrNull(WrActionSheetHarness)).toBeNull();
  });

  it('refuses a disabled row instead of reporting a pick that never happened', async () => {
    const sheet = await rootLoader.getHarness(WrActionSheetHarness);

    await expect(sheet.select({ label: 'Locked' })).rejects.toThrow(/disabled/);
    expect(fixture.componentInstance.chosen).toEqual([]);
    expect(await sheet.isOpen()).toBe(true);
  });

  it('names what it does offer when nothing matches', async () => {
    const sheet = await rootLoader.getHarness(WrActionSheetHarness);
    await expect(sheet.select({ label: 'Print' })).rejects.toThrow(/Take Photo, Choose from Library/);
  });

  it('dismisses on Escape without emitting', async () => {
    const sheet = await rootLoader.getHarness(WrActionSheetHarness);

    await sheet.sendEscape();
    await fixture.whenStable();

    expect(fixture.componentInstance.chosen).toEqual([]);
    expect(fixture.componentInstance.open()).toBe(false);
    expect(await sheet.isOpen()).toBe(false);
  });

  it('follows a close written from outside', async () => {
    const sheet = await rootLoader.getHarness(WrActionSheetHarness);

    fixture.componentInstance.open.set(false);
    await fixture.whenStable();

    expect(await sheet.isOpen()).toBe(false);
  });

  it('matches on the title, the message and the announced name', async () => {
    fixture.componentInstance.title.set('Photo');
    fixture.componentInstance.message.set('Pick a source');
    await fixture.whenStable();

    expect(await rootLoader.getHarnessOrNull(WrActionSheetHarness.with({ title: 'Photo' }))).not.toBeNull();
    expect(await rootLoader.getHarnessOrNull(WrActionSheetHarness.with({ message: /source$/ }))).not.toBeNull();
    expect(await rootLoader.getHarnessOrNull(WrActionSheetHarness.with({ accessibleName: 'Photo' }))).not.toBeNull();
    expect(await rootLoader.getHarnessOrNull(WrActionSheetHarness.with({ title: 'Document' }))).toBeNull();
  });
});

describe('WrActionSheetHarness — two sheets open at once', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoSheetsHost>>;
  let rootLoader: ReturnType<typeof TestbedHarnessEnvironment.documentRootLoader>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TwoSheetsHost);
    fixture.detectChanges();
    await fixture.whenStable();
    rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('gives each sheet only its own rows', async () => {
    const photo = await rootLoader.getHarness(WrActionSheetHarness.with({ title: 'Photo' }));
    const document_ = await rootLoader.getHarness(WrActionSheetHarness.with({ title: 'Document' }));

    expect(await photo.getActionLabels()).toEqual(['Take Photo']);
    expect(await document_.getActionLabels()).toEqual(['Scan', 'Upload']);
  });

  it('names each sheet from its own title', async () => {
    const photo = await rootLoader.getHarness(WrActionSheetHarness.with({ title: 'Photo' }));
    const document_ = await rootLoader.getHarness(WrActionSheetHarness.with({ title: 'Document' }));

    expect([await photo.isNamed(), await document_.isNamed()]).toEqual([true, true]);
  });

  it('finds every row from the root loader, which is the query that has to be scoped', async () => {
    const all = await rootLoader.getAllHarnesses(WrActionSheetActionHarness);
    expect(all).toHaveLength(3);
  });
});
