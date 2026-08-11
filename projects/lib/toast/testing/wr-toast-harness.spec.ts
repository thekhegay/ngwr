import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { WrToast } from 'ngwr/toast';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrToastHarness } from './wr-toast-harness';

@Component({ template: '' })
class Host {
  readonly toast = inject(WrToast);
}

/**
 * `WrToast` renders its stack into an overlay, so the harness is loaded from the
 * document root rather than from the fixture.
 *
 * Every toast here is shown with `duration: 0` — not for convenience, but because
 * a live auto-dismiss timer would race the harness: it resolves promises, and a
 * toast that dismissed itself mid-assertion fails in a way that says nothing about
 * the harness. Auto-dismiss itself is `toast.spec.ts`'s job, with fake timers.
 */
describe('WrToastHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let rootLoader: ReturnType<typeof TestbedHarnessEnvironment.documentRootLoader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  });

  afterEach(() => {
    fixture.componentInstance.toast.dismissAll();
    fixture.destroy();
  });

  it("reads a toast's title and message", async () => {
    fixture.componentInstance.toast.show({ title: 'Saved', message: 'Profile updated.', duration: 0 });
    await fixture.whenStable();

    const toast = await rootLoader.getHarness(WrToastHarness);

    expect(await toast.getTitle()).toBe('Saved');
    expect(await toast.getMessage()).toBe('Profile updated.');
  });

  it('reports no title when the toast was shown without one', async () => {
    fixture.componentInstance.toast.show({ message: 'Permalink copied', duration: 0 });
    await fixture.whenStable();

    const toast = await rootLoader.getHarness(WrToastHarness);

    expect(await toast.getTitle()).toBeNull();
  });

  it('narrows a stack by message, title and intent', async () => {
    fixture.componentInstance.toast.show({ message: 'Saved', type: 'success', duration: 0 });
    fixture.componentInstance.toast.show({ title: 'Oops', message: 'Could not save', type: 'danger', duration: 0 });
    await fixture.whenStable();

    const bad = await rootLoader.getHarness(WrToastHarness.with({ type: 'danger' }));
    const byTitle = await rootLoader.getHarness(WrToastHarness.with({ title: 'Oops' }));
    const byMessage = await rootLoader.getHarness(WrToastHarness.with({ message: /^Sav/ }));

    expect(await bad.getMessage()).toBe('Could not save');
    expect(await byTitle.getMessage()).toBe('Could not save');
    expect(await byMessage.getType()).toBe('success');
  });

  it('reports how urgently each intent announces itself', async () => {
    fixture.componentInstance.toast.show({ message: 'FYI', type: 'info', duration: 0 });
    fixture.componentInstance.toast.show({ message: 'Careful', type: 'warning', duration: 0 });
    fixture.componentInstance.toast.show({ message: 'Broken', type: 'danger', duration: 0 });
    await fixture.whenStable();

    const info = await rootLoader.getHarness(WrToastHarness.with({ message: 'FYI' }));
    const warning = await rootLoader.getHarness(WrToastHarness.with({ message: 'Careful' }));
    const danger = await rootLoader.getHarness(WrToastHarness.with({ message: 'Broken' }));

    // The escalation is the accessible behaviour worth pinning: only danger
    // interrupts, and warning still jumps the queue.
    expect([await info.getRole(), await info.getLiveLevel()]).toEqual(['status', 'polite']);
    expect([await warning.getRole(), await warning.getLiveLevel()]).toEqual(['status', 'assertive']);
    expect([await danger.getRole(), await danger.getLiveLevel()]).toEqual(['alert', 'assertive']);
  });

  it('dismisses the toast it was given', async () => {
    fixture.componentInstance.toast.show({ message: 'Keep me', duration: 0 });
    fixture.componentInstance.toast.show({ message: 'Close me', duration: 0 });
    await fixture.whenStable();

    const doomed = await rootLoader.getHarness(WrToastHarness.with({ message: 'Close me' }));
    await doomed.dismiss();
    await fixture.whenStable();

    const left = await rootLoader.getAllHarnesses(WrToastHarness);
    expect(await Promise.all(left.map(t => t.getMessage()))).toEqual(['Keep me']);
  });

  it('dismisses a toast that also offers a copy button', async () => {
    // Both controls are `.wr-toast__action`; only the modifier tells them apart,
    // so a harness matching on the base class would hit copy and leave the toast
    // standing.
    fixture.componentInstance.toast.show({ message: 'Permalink', showCopy: true, duration: 0 });
    await fixture.whenStable();

    const toast = await rootLoader.getHarness(WrToastHarness);
    expect(await toast.hasCopyAction()).toBe(true);
    expect(await toast.isDismissible()).toBe(true);

    await toast.dismiss();
    await fixture.whenStable();

    expect(await rootLoader.getHarnessOrNull(WrToastHarness)).toBeNull();
  });

  it('reports a toast that cannot be dismissed by hand', async () => {
    fixture.componentInstance.toast.show({ message: 'Working…', dismissible: false, duration: 0 });
    await fixture.whenStable();

    const toast = await rootLoader.getHarness(WrToastHarness);

    expect(await toast.isDismissible()).toBe(false);
    expect(await toast.hasCopyAction()).toBe(false);
    await expect(toast.dismiss()).rejects.toThrow();
  });

  it('sees the auto-dismiss progress bar only when there is a duration to show', async () => {
    fixture.componentInstance.toast.show({ message: 'Timed', showProgress: true, duration: 4000 });
    fixture.componentInstance.toast.show({ message: 'Sticky', showProgress: true, duration: 0 });
    await fixture.whenStable();

    const timed = await rootLoader.getHarness(WrToastHarness.with({ message: 'Timed' }));
    const sticky = await rootLoader.getHarness(WrToastHarness.with({ message: 'Sticky' }));

    expect(await timed.hasProgressBar()).toBe(true);
    expect(await sticky.hasProgressBar()).toBe(false);
  });
});
