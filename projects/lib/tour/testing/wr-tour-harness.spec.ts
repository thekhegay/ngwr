import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { WrTour, type WrTourStep } from 'ngwr/tour';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTourHarness } from './wr-tour-harness';

@Component({
  template: `
    <div id="one">one</div>
    @if (showTwo()) {
      <div id="two">two</div>
    }
    <div id="three">three</div>
  `,
})
class Host {
  readonly showTwo = signal(true);
}

const STEPS: readonly WrTourStep[] = [
  { target: '#one', title: 'First', content: 'Look here' },
  { target: '#two', content: 'Then here' },
  { target: '#three', title: 'Last', content: 'And finally here' },
];

/**
 * `WrTour` is a service with no element of its own, so the card comes from the
 * DOCUMENT ROOT loader — and only one card exists at a time, since the service tears
 * a step down before opening the next.
 *
 * jsdom implements no `scrollIntoView`, which the tour calls on every step's target;
 * production code should not carry a guard for a test environment, so the stub lives
 * here.
 */
describe('WrTourHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let rootLoader: ReturnType<typeof TestbedHarnessEnvironment.documentRootLoader>;
  let tour: WrTour;

  const card = (): Promise<WrTourHarness> => rootLoader.getHarness(WrTourHarness);

  const start = async (steps: readonly WrTourStep[] = STEPS): Promise<WrTourHarness> => {
    tour.start(steps);
    await fixture.whenStable();
    return card();
  };

  beforeEach(() => {
    Element.prototype.scrollIntoView = (): undefined => undefined;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    tour = TestBed.inject(WrTour);
  });

  afterEach(() => {
    tour.stop();
    fixture.destroy();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('has no card until a tour is started, which is how you ask', async () => {
    expect(await rootLoader.getHarnessOrNull(WrTourHarness)).toBeNull();

    await start();

    expect(await rootLoader.getHarnessOrNull(WrTourHarness)).not.toBeNull();
  });

  it('reads the step, and answers null for a title the step was not given', async () => {
    const first = await start();

    expect([await first.getTitle(), await first.getContent()]).toEqual(['First', 'Look here']);

    await first.next();
    const second = await card();

    expect([await second.getTitle(), await second.getContent()]).toEqual([null, 'Then here']);
  });

  it('prints the progress, and parses the two numbers out of it', async () => {
    const first = await start();

    expect(await first.getProgressText()).toBe('Step 1 of 3');
    expect(await first.getProgress()).toEqual({ current: 1, total: 3 });
  });

  it('names the dialog from the title and the progress, or from the progress alone', async () => {
    const first = await start();

    expect(await first.isModal()).toBe(true);
    expect(await first.getAccessibleName()).toBe('First — Step 1 of 3');

    await first.next();
    expect(await (await card()).getAccessibleName()).toBe('Step 2 of 3');
  });

  it('walks forward and back, and hides Back on the first step', async () => {
    const first = await start();
    expect(await first.hasBack()).toBe(false);
    await expect(first.back()).rejects.toThrow(/first step/);
    await expect(first.getBackLabel()).rejects.toThrow(/first step/);

    await first.next();
    const second = await card();

    expect([await second.hasBack(), await second.getBackLabel()]).toEqual([true, 'Back']);

    await second.back();
    expect(await (await card()).getTitle()).toBe('First');
  });

  it('leaves a held harness stale once the tour moves on', async () => {
    const first = await start();
    expect(await first.isShowing()).toBe(true);

    await first.next();

    // The whole step is torn down and rebuilt, so the old card is a detached element
    // while the loader answers with the new one.
    expect(await first.isShowing()).toBe(false);
    expect(await (await card()).getContent()).toBe('Then here');
  });

  it('says Done on the last step, and ends the tour there', async () => {
    const first = await start();
    expect(await first.getPrimaryLabel()).toBe('Next');

    await first.next();
    await (await card()).next();

    const last = await card();
    expect([await last.getTitle(), await last.getPrimaryLabel()]).toEqual(['Last', 'Done']);

    await last.next();
    expect(await rootLoader.getHarnessOrNull(WrTourHarness)).toBeNull();
  });

  it('skips a step whose target is not on the page, and still counts it', async () => {
    fixture.componentInstance.showTwo.set(false);
    await fixture.whenStable();

    const first = await start();
    await first.next();
    const second = await card();

    // Step two was skipped, so this is the third — and the printed total is still 3,
    // because it counts what the tour was started with.
    expect([await second.getTitle(), await second.getProgress()]).toEqual(['Last', { current: 3, total: 3 }]);
  });

  it('reads Done off the button, not off the count, when the last step is missing', async () => {
    fixture.componentInstance.showTwo.set(false);
    await fixture.whenStable();

    // Two steps given, and the second one's target does not exist — so the FIRST
    // card is the last the user will see. `current === total` would say otherwise.
    const only = await start([STEPS[0], STEPS[1]]);

    expect(await only.getProgress()).toEqual({ current: 1, total: 2 });
    expect(await only.getPrimaryLabel()).toBe('Done');

    await only.next();
    expect(await rootLoader.getHarnessOrNull(WrTourHarness)).toBeNull();
  });

  it('ends the tour from Skip, at any point', async () => {
    const first = await start();
    expect(await first.getSkipLabel()).toBe('Skip tour');

    await first.next();
    await (await card()).skipTour();

    expect(await rootLoader.getHarnessOrNull(WrTourHarness)).toBeNull();
  });

  it('matches on the title and the content', async () => {
    await start();

    expect(await rootLoader.getHarnessOrNull(WrTourHarness.with({ title: 'First' }))).not.toBeNull();
    expect(await rootLoader.getHarnessOrNull(WrTourHarness.with({ content: /^Look/ }))).not.toBeNull();
    expect(await rootLoader.getHarnessOrNull(WrTourHarness.with({ title: 'Last' }))).toBeNull();
  });
});
