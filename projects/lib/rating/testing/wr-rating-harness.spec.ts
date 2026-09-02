import { Directionality } from '@angular/cdk/bidi';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { WrRating } from 'ngwr/rating';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrRatingHarness } from './wr-rating-harness';

@Component({
  imports: [WrRating],
  template: `
    <wr-rating ariaLabel="Overall" [(value)]="score" (touch)="touched.set(touched() + 1)" />
    <wr-rating ariaLabel="Precision" step="0.5" size="lg" [(value)]="precision" />
    <wr-rating ariaLabel="Published" [count]="6" [value]="4" [readonly]="true" />
    <wr-rating ariaLabel="Locked" [value]="1" [disabled]="true" />
  `,
})
class Host {
  readonly score = signal<number | null>(null);
  readonly precision = signal<number | null>(null);
  readonly touched = signal(0);
}

/** Used exactly as a consumer would: through the loader, with no internals touched. */
describe('WrRatingHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const ratingFor = (label: string): Promise<WrRatingHarness> => loader.getHarness(WrRatingHarness.with({ label }));

  /**
   * Give every star a box.
   *
   * The rating snaps its value from where the pointer sits inside a star, and in
   * jsdom every element is 0×0 — so the pointer half of this component is
   * untestable until the boxes exist. The width is the only part that matters:
   * the harness aims relative to the same rect the component measures.
   */
  const layOutStars = (): void => {
    const box: DOMRect = {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 20,
      bottom: 20,
      width: 20,
      height: 20,
      toJSON: () => ({}),
    };
    const stars = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-rating__slot');
    stars.forEach(star => vi.spyOn(star, 'getBoundingClientRect').mockReturnValue(box));
  };

  /**
   * Rebuild the fixture as a right-to-left app.
   *
   * Both halves are needed and they answer different questions: the component
   * injects `Directionality`, while the harness reads the COMPUTED `direction` —
   * which comes from the `dir` attribute, so a provider alone would leave the
   * harness aiming the LTR way at a mirrored row.
   */
  const rebuildRtl = (): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: 'rtl', change: new Subject<'ltr' | 'rtl'>() } }],
    });
    fixture = TestBed.createComponent(Host);
    (fixture.nativeElement as HTMLElement).setAttribute('dir', 'rtl');
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    layOutStars();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => {
    // The star rects are per-element spies; left in place they would follow the
    // elements into the next spec's fixture.
    vi.restoreAllMocks();
    fixture.destroy();
  });

  it('finds every rating and reads the name it announces', async () => {
    const all = await loader.getAllHarnesses(WrRatingHarness);

    expect(await Promise.all(all.map(r => r.getLabel()))).toEqual(['Overall', 'Precision', 'Published', 'Locked']);
  });

  it('is a slider, not a group of radios', async () => {
    // The role is the promise about the keyboard: arrows step, Home and End bound.
    const overall = await ratingFor('Overall');

    expect(await overall.getRole()).toBe('slider');
  });

  it('reports a range that matches the stars it paints', async () => {
    const published = await ratingFor('Published');

    expect(await published.getMax()).toBe(6);
    expect(await published.getCount()).toBe(6);
  });

  it('reports the size, defaulting to md with no modifier of its own', async () => {
    expect(await (await ratingFor('Overall')).getSize()).toBe('md');
    expect(await (await ratingFor('Precision')).getSize()).toBe('lg');
  });

  it('sets a value from the keyboard, writing back to the host', async () => {
    const overall = await ratingFor('Overall');

    await overall.setValue(3);

    expect(await overall.getValue()).toBe(3);
    expect(fixture.componentInstance.score()).toBe(3);
    expect(await overall.getFills()).toEqual([1, 1, 1, 0, 0]);
  });

  it('reaches both ends of the range', async () => {
    const overall = await ratingFor('Overall');

    await overall.setValue(5);
    expect(fixture.componentInstance.score()).toBe(5);

    // Zero is a rating, not the absence of one — this commits it. `clear()` is
    // the one that empties the model.
    await overall.setValue(0);
    expect(fixture.componentInstance.score()).toBe(0);
  });

  it('sets a half star when the rating steps in halves', async () => {
    const precision = await ratingFor('Precision');

    await precision.setValue(2.5);

    expect(fixture.componentInstance.precision()).toBe(2.5);
    expect(await precision.getFills()).toEqual([1, 1, 0.5, 0, 0]);

    const [first, , third, fourth] = await precision.getItems();
    expect(await third.isPartiallyFilled()).toBe(true);
    expect(await third.isFilled()).toBe(false);
    // Part-way means part-way: neither a whole star nor an empty one qualifies.
    expect(await first.isPartiallyFilled()).toBe(false);
    expect(await fourth.isPartiallyFilled()).toBe(false);
  });

  it('reads a half star on a whole-star rating, because a bound fraction is never snapped', async () => {
    // The `step` governs the keyboard and the pointer only: a fraction written
    // straight into `value` is clamped to the range and painted as it is. So a
    // partially filled star is not evidence of `step="0.5"`.
    const overall = await ratingFor('Overall');
    fixture.componentInstance.score.set(3.5);
    fixture.detectChanges();

    expect(await overall.getFills()).toEqual([1, 1, 1, 0.5, 0]);
    const [, , , fourth] = await overall.getItems();
    expect(await fourth.isPartiallyFilled()).toBe(true);
  });

  it('refuses a value outside the range instead of clamping it silently', async () => {
    const overall = await ratingFor('Overall');

    await expect(overall.setValue(9)).rejects.toThrow(/outside this rating's range of \[0, 5\]/);
    expect(fixture.componentInstance.score()).toBeNull();
  });

  it('refuses a value the step cannot land on', async () => {
    const overall = await ratingFor('Overall');

    await expect(overall.setValue(2.5)).rejects.toThrow(/not a multiple of its `step`/);
  });

  it('refuses to pretend a readonly rating took the value', async () => {
    const published = await ratingFor('Published');

    await expect(published.setValue(2)).rejects.toThrow(/readonly or disabled/);
    expect(await published.getValue()).toBe(4);
  });

  it('clears to null, which the slider still announces as zero', async () => {
    // The gap that silently breaks a spec: `value` is `number | null` and ARIA has
    // no null, so a cleared rating and a zero rating read identically from the DOM.
    // Only the model tells them apart.
    const overall = await ratingFor('Overall');
    await overall.setValue(4);

    await overall.clear();

    expect(fixture.componentInstance.score()).toBeNull();
    expect(await overall.getValue()).toBe(0);
    expect(await overall.getFills()).toEqual([0, 0, 0, 0, 0]);
  });

  it('steps by the rating own step, and clamps at the bottom', async () => {
    const precision = await ratingFor('Precision');

    await precision.clear();
    await precision.stepUp();
    expect(fixture.componentInstance.precision()).toBe(0.5);

    await precision.stepUp();
    expect(fixture.componentInstance.precision()).toBe(1);

    await precision.stepDown();
    await precision.stepDown();
    await precision.stepDown();
    expect(fixture.componentInstance.precision()).toBe(0);
  });

  it('reports readonly and disabled from what a screen reader is told, and narrows by both', async () => {
    const published = await ratingFor('Published');
    const locked = await ratingFor('Locked');

    expect([await published.isReadonly(), await published.isDisabled()]).toEqual([true, false]);
    expect([await locked.isReadonly(), await locked.isDisabled()]).toEqual([false, true]);

    const readonly = await loader.getAllHarnesses(WrRatingHarness.with({ readonly: true }));
    expect(await Promise.all(readonly.map(r => r.getLabel()))).toEqual(['Published']);

    const disabled = await loader.getAllHarnesses(WrRatingHarness.with({ disabled: true }));
    expect(await Promise.all(disabled.map(r => r.getLabel()))).toEqual(['Locked']);
  });

  it('answers readonly and disabled from ARIA even when the paint says otherwise', async () => {
    // The class and the attribute are set together by the component, so nothing the
    // component does can tell the two readings apart — a consumer styling a rating
    // read-only-looking can. That is the bug the harness exists to catch: it must
    // report what the rating ANNOUNCES, not how it looks.
    const overall = await ratingFor('Overall');
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-rating');
    host?.classList.add('wr-rating--readonly', 'wr-rating--disabled');

    expect([await overall.isReadonly(), await overall.isDisabled()]).toEqual([false, false]);

    const readonly = await loader.getAllHarnesses(WrRatingHarness.with({ readonly: true }));
    expect(await Promise.all(readonly.map(r => r.getLabel()))).toEqual(['Published']);

    const disabled = await loader.getAllHarnesses(WrRatingHarness.with({ disabled: true }));
    expect(await Promise.all(disabled.map(r => r.getLabel()))).toEqual(['Locked']);
  });

  it('refuses to report a value the slider does not announce as a number', async () => {
    // Reachable: `clamp(NaN, …)` is NaN and the component's re-clamp effect sees no
    // change, so a NaN written to the model renders as aria-valuenow="NaN". Reporting
    // that as 0 would turn a broken rating into a passing assertion.
    const overall = await ratingFor('Overall');
    fixture.componentInstance.score.set(Number.NaN);
    fixture.detectChanges();

    await expect(overall.getValue()).rejects.toThrow(/aria-valuenow="NaN", which is not a number/);
  });

  it('refuses to report a fill it cannot read', async () => {
    // The half star lives only in `--wr-rating-fill`; an environment that drops
    // custom properties has to fail loudly rather than report every star empty.
    const overall = await ratingFor('Overall');
    const [first] = await overall.getItems();
    const star = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-rating__slot');
    star?.style.setProperty('--wr-rating-fill', 'none');

    await expect(first.getFill()).rejects.toThrow(/could not read this star's fill/);
  });

  it('narrows by the announced value', async () => {
    const found = await loader.getAllHarnesses(WrRatingHarness.with({ value: 4 }));

    expect(await Promise.all(found.map(r => r.getLabel()))).toEqual(['Published']);
  });

  it('leaves the tab order when disabled, and keeps it when merely readonly', async () => {
    // The two states part company exactly here. `disabled` drops out of the tab
    // order; `readonly` stays in it, because a value a keyboard user may not
    // change is still a value they have to be able to reach and hear — the same
    // rule the platform applies to `<input readonly>` against `<input disabled>`.
    //
    // This spec asserted `false` for both, and its sibling in the knob harness
    // said so out loud: "read-only also leaves the tab order, so the dial cannot
    // be reached to be read". That sentence describes the defect it was pinning.
    expect(await (await ratingFor('Overall')).isFocusable()).toBe(true);
    expect(await (await ratingFor('Published')).isFocusable()).toBe(true);
    expect(await (await ratingFor('Locked')).isFocusable()).toBe(false);
  });

  it('focuses the row, and emits touch on blur', async () => {
    const overall = await ratingFor('Overall');

    await overall.focus();
    expect(await overall.isFocused()).toBe(true);

    await overall.blur();
    expect(fixture.componentInstance.touched()).toBe(1);
  });

  it('reads the stars, and narrows them by fill and by interactivity', async () => {
    const overall = await ratingFor('Overall');
    await overall.setValue(2);

    expect((await overall.getItems({ fill: 1 })).length).toBe(2);
    expect((await overall.getItems({ fill: 0 })).length).toBe(3);
    expect((await overall.getItems({ interactive: true })).length).toBe(5);

    const locked = await ratingFor('Locked');
    expect((await locked.getItems({ interactive: true })).length).toBe(0);

    const [first] = await locked.getItems();
    expect([await first.getFill(), await first.isFilled(), await first.isInteractive()]).toEqual([1, true, false]);
  });

  it('refuses a pointer it cannot aim rather than committing the NaN it computes', async () => {
    // Without layout the component divides by a zero-width star. Left to run, the
    // model would take a NaN and the failure would surface somewhere else entirely.
    const overall = await ratingFor('Overall');
    const [, , third] = await overall.getItems();

    await expect(third.click()).rejects.toThrow(/no layout/);
    await expect(third.hover()).rejects.toThrow(/no layout/);
    expect(fixture.componentInstance.score()).toBeNull();
  });

  it('picks a rating by clicking a star — and clears it by clicking the same one again', async () => {
    // The trap this control springs on a consumer: a click is a TOGGLE. Clicking
    // the value the rating already holds clears it, so a spec that clicks its way
    // to three stars twice ends up with nothing.
    layOutStars();
    const overall = await ratingFor('Overall');
    const [, , third] = await overall.getItems();

    await third.click();
    expect(fixture.componentInstance.score()).toBe(3);
    expect(await overall.getValue()).toBe(3);

    await third.click();
    expect(fixture.componentInstance.score()).toBeNull();
  });

  it('clicks a half star, and snaps up to a whole one when the rating has no halves', async () => {
    layOutStars();
    const precision = await ratingFor('Precision');
    const overall = await ratingFor('Overall');

    const [, , precisionThird] = await precision.getItems();
    await precisionThird.clickHalf();
    expect(fixture.componentInstance.precision()).toBe(2.5);

    // `click()` picks the star WHOLE even where halves exist — it aims at the
    // trailing edge, so the same star that just gave 2.5 now gives 3.
    await precisionThird.click();
    expect(fixture.componentInstance.precision()).toBe(3);

    const [, , overallThird] = await overall.getItems();
    await overallThird.clickHalf();
    expect(fixture.componentInstance.score()).toBe(3);
  });

  it('previews on hover without committing, and drops the preview on leave', async () => {
    layOutStars();
    const overall = await ratingFor('Overall');
    await overall.setValue(1);
    const items = await overall.getItems();

    await items[3].hover();

    expect(await overall.getFills()).toEqual([1, 1, 1, 1, 0]);
    // The stars preview; the slider keeps announcing the committed value, and the
    // model has not moved.
    expect(await overall.getValue()).toBe(1);
    expect(fixture.componentInstance.score()).toBe(1);

    await overall.unhover();
    expect(await overall.getFills()).toEqual([1, 0, 0, 0, 0]);
  });

  it('takes no pointer input while disabled', async () => {
    layOutStars();
    const locked = await ratingFor('Locked');
    const [, , , , fifth] = await locked.getItems();

    await fifth.click();

    expect(await locked.getValue()).toBe(1);
  });

  it('picks the same star under dir="rtl", where the row is mirrored', async () => {
    // `click()` aims at the star's inline-END edge, and under `dir="rtl"` that is
    // the PHYSICAL left one — the component measures the pointer from the right.
    // Aimed at the physical right edge regardless, this reads ratio 0 and commits
    // 2, one star fewer, which is the kind of off-by-one a spec blames on the
    // component. Same star, same call, same answer in both directions.
    rebuildRtl();
    const overall = await ratingFor('Overall');
    const [, , third] = await overall.getItems();

    await third.click();

    expect(fixture.componentInstance.score()).toBe(3);
  });

  it('sets a value from the keyboard under dir="rtl"', async () => {
    // The reason `setValue` walks with `ArrowUp` rather than `ArrowRight`: the
    // inline arrows follow visual order, so `ArrowRight` DECREMENTS a mirrored
    // row. Driven that way this walk never leaves 0, and the harness reports a
    // readonly-or-disabled rating — naming a cause that is not the one.
    rebuildRtl();
    const overall = await ratingFor('Overall');

    await overall.setValue(3);

    expect(fixture.componentInstance.score()).toBe(3);

    await overall.stepUp();
    expect(fixture.componentInstance.score()).toBe(4);

    await overall.stepDown();
    expect(fixture.componentInstance.score()).toBe(3);
  });
});
