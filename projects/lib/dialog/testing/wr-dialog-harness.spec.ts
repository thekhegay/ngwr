import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrButton } from 'ngwr/button';
import { WrButtonHarness } from 'ngwr/button/testing';
import { WrDialog, WrDialogContent, WrDialogFooter, WrDialogTitle } from 'ngwr/dialog';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrDialogHarness } from './wr-dialog-harness';

@Component({
  imports: [WrButton, WrDialogTitle, WrDialogContent, WrDialogFooter],
  template: `
    <h2 wrDialogTitle>Delete item</h2>
    <div wrDialogContent>This cannot be undone.</div>
    <div wrDialogFooter>
      <button type="button" wr-btn>Cancel</button>
      <button type="button" wr-btn color="danger">Delete</button>
    </div>
  `,
})
class Confirm {}

@Component({ template: '' })
class Host {
  readonly dialog = inject(WrDialog);
}

/**
 * A dialog is a service call, not an element in a template, and the panel it
 * creates is a sibling of the whole app — so this spec loads its harness from the
 * DOCUMENT ROOT. `provideWrOverlay()` keeps the container out of the next file's.
 */
describe('WrDialogHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let rootLoader: ReturnType<typeof TestbedHarnessEnvironment.documentRootLoader>;

  beforeEach(() => {
    // Test-environment shim, not a claim about the dialog: jsdom lays nothing out,
    // so every element measures 0x0 and the CDK's `InteractivityChecker` reads
    // them all as invisible — the focus trap then finds nothing tabbable and never
    // moves focus. Handing elements a box is what lets the focus assertion test
    // the harness rather than the DOM stub.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(0, 0, 120, 32),
    ] as unknown as DOMRectList);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fixture.destroy();
  });

  it('finds an open dialog and reads its title and content', async () => {
    fixture.componentInstance.dialog.open(Confirm);
    await fixture.whenStable();

    const dialog = await rootLoader.getHarness(WrDialogHarness);

    expect(await dialog.getTitleText()).toBe('Delete item');
    expect(await dialog.getContentText()).toBe('This cannot be undone.');
  });

  it('narrows by title when two dialogs are stacked', async () => {
    fixture.componentInstance.dialog.open(Confirm);
    fixture.componentInstance.dialog.open(Other);
    await fixture.whenStable();

    const other = await rootLoader.getHarness(WrDialogHarness.with({ title: 'Rename' }));

    expect(await other.getContentText()).toBe('Pick a new name.');
  });

  it('reports the role and modality set on the overlay, not on the content', async () => {
    fixture.componentInstance.dialog.open(Confirm);
    await fixture.whenStable();

    const dialog = await rootLoader.getHarness(WrDialogHarness);

    expect(await dialog.getRole()).toBe('dialog');
    expect(await dialog.isModal()).toBe(true);
  });

  it("reaches the consumer's own components inside the dialog", async () => {
    fixture.componentInstance.dialog.open(Confirm);
    await fixture.whenStable();

    const dialog = await rootLoader.getHarness(WrDialogHarness);
    // The point of a content container: a button harness resolves INSIDE this
    // dialog, so a second dialog's "Delete" cannot be picked up by mistake.
    const remove = await dialog.getHarness(WrButtonHarness.with({ text: 'Delete' }));

    expect(await remove.getColor()).toBe('danger');
  });

  it('closes through the built-in dismiss button', async () => {
    fixture.componentInstance.dialog.open(Confirm);
    await fixture.whenStable();

    const dialog = await rootLoader.getHarness(WrDialogHarness);
    expect(await dialog.isClosable()).toBe(true);
    expect(await dialog.getCloseLabel()).toBeTruthy();

    await dialog.close();
    await fixture.whenStable();

    expect(await rootLoader.getHarnessOrNull(WrDialogHarness)).toBeNull();
  });

  it('reports a dialog opened without a dismiss button', async () => {
    fixture.componentInstance.dialog.open(Confirm, { closable: false });
    await fixture.whenStable();

    const dialog = await rootLoader.getHarness(WrDialogHarness);

    expect(await dialog.isClosable()).toBe(false);
    expect(await dialog.getCloseLabel()).toBeNull();
  });

  it('closes on Escape, and leaves an opt-out dialog open', async () => {
    const ref = fixture.componentInstance.dialog.open(Confirm, { closeOnEscape: false });
    await fixture.whenStable();

    const stubborn = await rootLoader.getHarness(WrDialogHarness);
    await stubborn.sendEscape();
    await fixture.whenStable();

    expect(await rootLoader.getHarnessOrNull(WrDialogHarness)).not.toBeNull();
    ref.close();
    await fixture.whenStable();

    fixture.componentInstance.dialog.open(Confirm);
    await fixture.whenStable();

    const normal = await rootLoader.getHarness(WrDialogHarness);
    await normal.sendEscape();
    await fixture.whenStable();

    expect(await rootLoader.getHarnessOrNull(WrDialogHarness)).toBeNull();
  });

  it('sees focus land inside the dialog', async () => {
    fixture.componentInstance.dialog.open(Confirm);
    await fixture.whenStable();

    const dialog = await rootLoader.getHarness(WrDialogHarness);

    expect(await dialog.isFocusTrapped()).toBe(true);
  });
});

@Component({
  imports: [WrDialogTitle, WrDialogContent],
  template: `
    <h2 wrDialogTitle>Rename</h2>
    <div wrDialogContent>Pick a new name.</div>
  `,
})
class Other {}
