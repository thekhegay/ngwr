import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrSlider, type WrSliderValue } from 'ngwr/slider';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSliderHarness } from './wr-slider-harness';

@Component({
  imports: [WrSlider],
  template: `
    <wr-slider
      [(value)]="volume"
      [min]="0"
      [max]="100"
      [step]="step()"
      [disabled]="locked()"
      (touch)="touched.set(touched() + 1)"
    />
    <wr-slider range [(value)]="span" [min]="0" [max]="100" />
    <wr-slider [value]="7" [min]="0" [max]="10" [showLabel]="false" />
  `,
})
class Host {
  readonly volume = signal<WrSliderValue>(50);
  readonly span = signal<WrSliderValue>([20, 80]);
  readonly step = signal(1);
  readonly locked = signal(false);
  readonly touched = signal(0);
}

describe('WrSliderHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const all = (): Promise<WrSliderHarness[]> => loader.getAllHarnesses(WrSliderHarness);

  // Sliders are told apart by DOM order rather than by a filter: the only text a
  // slider renders is its own value, and every write test moves it.
  const volume = async (): Promise<WrSliderHarness> => (await all())[0];
  const span = async (): Promise<WrSliderHarness> => (await all())[1];

  /** A pointer press on the track at `clientX` — see the coordinate test below. */
  const pointerDown = async (clientX: number): Promise<void> => {
    const track = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-slider__track')!;
    const event = new Event('pointerdown', { bubbles: true, cancelable: true });

    Object.assign(event, { clientX, clientY: 0 });
    track.dispatchEvent(event);
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('finds every slider and reads the value in the shape the model uses', async () => {
    const values = await Promise.all((await all()).map(slider => slider.getValue()));

    expect(values).toEqual([50, [20, 80], 7]);
  });

  it('tells the two modes apart by the thumbs they carry', async () => {
    expect(await (await volume()).isRange()).toBe(false);
    expect(await (await span()).isRange()).toBe(true);

    expect(await (await volume()).getThumbs()).toHaveLength(1);
    const positions = await Promise.all((await (await span()).getThumbs()).map(thumb => thumb.getPosition()));
    expect(positions).toEqual(['low', 'high']);
  });

  it('narrows by value, by mode and by the text under the track', async () => {
    expect(await loader.getAllHarnesses(WrSliderHarness.with({ value: 50 }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrSliderHarness.with({ value: [20, 80] }))).toHaveLength(1);
    // A tuple never matches a single-thumb slider, even one parked on both ends.
    expect(await loader.getAllHarnesses(WrSliderHarness.with({ value: [50, 50] }))).toEqual([]);
    // Both ends have to agree: sharing the low end is not a match.
    expect(await loader.getAllHarnesses(WrSliderHarness.with({ value: [20, 50] }))).toEqual([]);
    expect(await loader.getAllHarnesses(WrSliderHarness.with({ value: [50, 80] }))).toEqual([]);

    expect(await loader.getAllHarnesses(WrSliderHarness.with({ range: false }))).toHaveLength(2);

    expect(await (await loader.getHarness(WrSliderHarness.with({ labelText: '50' }))).isRange()).toBe(false);
    expect(await (await loader.getHarness(WrSliderHarness.with({ labelText: /–/ }))).isRange()).toBe(true);
  });

  it('prints its value under the track, and none when showLabel is off', async () => {
    expect(await (await volume()).getLabelText()).toBe('50');
    // An EN DASH (U+2013), not a hyphen — an assertion typed with `-` misses.
    expect(await (await span()).getLabelText()).toBe('20 – 80');
    expect(await (await all())[2].getLabelText()).toBeNull();
  });

  it('answers the ARIA range trio a screen reader reads out', async () => {
    const slider = await volume();
    const thumb = await slider.getLowThumb();

    expect([await slider.getMin(), await slider.getValue(), await slider.getMax()]).toEqual([0, 50, 100]);
    expect(await thumb.getRole()).toBe('slider');
    expect(await thumb.getLabel()).toBe('Value');
    expect(await thumb.getPosition()).toBe('low');
    expect(await thumb.isDisabled()).toBe(false);
  });

  it('reads the ceiling off the far thumb, because the two ends bound each other', async () => {
    const slider = await span();
    const [low, high] = [await slider.getLowThumb(), await slider.getHighThumb()];

    // Each thumb announces the OTHER as its limit, so the lower thumb's
    // aria-valuemax is 80, not the slider's max. Believing the near thumb is how
    // a harness reports a ceiling that is really just wherever a user left the
    // other end.
    expect([await low.getMin(), await low.getMax()]).toEqual([0, 80]);
    expect([await high.getMin(), await high.getMax()]).toEqual([20, 100]);
    expect([await slider.getMin(), await slider.getMax()]).toEqual([0, 100]);

    expect([await low.getLabel(), await high.getLabel()]).toEqual(['Lower value', 'Upper value']);
  });

  it('narrows a thumb by position, by value and by accessible name', async () => {
    const slider = await span();

    expect(await (await slider.getThumbs({ position: 'high' }))[0].getValue()).toBe(80);
    expect(await slider.getThumbs({ value: 20 })).toHaveLength(1);
    expect(await (await slider.getThumbs({ label: /Upper/ }))[0].getPosition()).toBe('high');
  });

  it('steps up and down, and the host hears every move', async () => {
    const slider = await volume();

    await slider.stepUp();
    expect(await slider.getValue()).toBe(51);
    expect(fixture.componentInstance.volume()).toBe(51);

    await slider.stepDown();
    await slider.stepDown();
    expect(fixture.componentInstance.volume()).toBe(49);

    // Every key press also marks the control touched, which is how a bound
    // signal-forms field learns it was interacted with.
    expect(fixture.componentInstance.touched()).toBe(3);
  });

  it('honours a custom step', async () => {
    fixture.componentInstance.step.set(10);
    fixture.detectChanges();

    // `step` is published nowhere in the DOM — ARIA has no attribute for it — so
    // moving the thumb is the only way to observe it.
    await (await volume()).stepUp();

    expect(fixture.componentInstance.volume()).toBe(60);
  });

  it('takes the ten-step stride', async () => {
    const thumb = await (await volume()).getLowThumb();

    await thumb.largeStepUp();
    expect(await thumb.getValue()).toBe(60);

    await thumb.largeStepDown();
    await thumb.largeStepDown();
    expect(fixture.componentInstance.volume()).toBe(40);
  });

  it('jumps to either bound in a single press', async () => {
    const slider = await volume();

    await slider.toMin();
    expect(fixture.componentInstance.volume()).toBe(0);

    await slider.toMax();
    expect(fixture.componentInstance.volume()).toBe(100);
  });

  it('walks to a value from the keyboard, uphill and downhill', async () => {
    const slider = await volume();

    await slider.setValue(73);
    expect(await slider.getValue()).toBe(73);
    expect(fixture.componentInstance.volume()).toBe(73);

    await slider.setValue(12);
    expect(fixture.componentInstance.volume()).toBe(12);
  });

  it('walks on the ten-step stride, not one arrow at a time', async () => {
    const slider = await volume();

    await slider.setValue(73);

    expect(await slider.getValue()).toBe(73);
    // Every handled key press also emits `touch`, so the counter IS the press
    // count: 7 with the PageUp stride (50 → 80, back to 70, then three arrows),
    // 23 if the walk ever loses the stride and arrows the whole way.
    expect(fixture.componentInstance.touched()).toBe(7);
  });

  it('refuses a bound the step grid misses, rather than settling next to it', async () => {
    fixture.componentInstance.step.set(3);
    fixture.detectChanges();

    // `aria-valuemax` says 100, but the component snaps to whole steps from 0, so
    // `End` lands on 99 and 100 is announced-but-unreachable. The shortcut checks
    // its landing rather than reporting a jump it did not make.
    await expect((await volume()).setValue(100)).rejects.toThrow(/settled on 99 instead of 100/);
    expect(fixture.componentInstance.volume()).toBe(99);
  });

  it('refuses a value the step grid cannot reach, and says where it stopped', async () => {
    fixture.componentInstance.step.set(10);
    fixture.detectChanges();

    await expect((await volume()).setValue(37)).rejects.toThrow(/whole steps/);
    // Left on the nearest value it could reach, not somewhere arbitrary.
    expect(fixture.componentInstance.volume()).toBe(40);
  });

  it('refuses a value outside the slider without touching it', async () => {
    await expect((await volume()).setValue(150)).rejects.toThrow(/outside the \[0, 100\] window/);

    expect(fixture.componentInstance.volume()).toBe(50);
  });

  it('reports a disabled slider, refuses to walk it, and narrows by it', async () => {
    fixture.componentInstance.locked.set(true);
    fixture.detectChanges();

    const slider = await volume();
    expect(await slider.isDisabled()).toBe(true);
    await expect(slider.setValue(70)).rejects.toThrow(/disabled/);

    // The press lands; the component ignores it.
    await slider.stepUp();
    expect(fixture.componentInstance.volume()).toBe(50);

    expect(await loader.getAllHarnesses(WrSliderHarness.with({ disabled: true }))).toHaveLength(1);
  });

  it('moves focus to the thumb the slider tabs to', async () => {
    const slider = await volume();
    expect(await slider.isFocused()).toBe(false);

    await slider.focus();

    expect(await slider.isFocused()).toBe(true);
    expect(await (await slider.getLowThumb()).isFocused()).toBe(true);
  });

  it('refuses the calls that cannot mean anything in the mode it is in', async () => {
    const single = await volume();
    const dual = await span();

    await expect(dual.setValue(50)).rejects.toThrow(/two thumbs/);
    await expect(dual.stepUp()).rejects.toThrow(/two thumbs/);
    await expect(dual.stepDown()).rejects.toThrow(/two thumbs/);
    await expect(dual.toMin()).rejects.toThrow(/two thumbs/);
    await expect(dual.toMax()).rejects.toThrow(/two thumbs/);

    await expect(single.setRange(10, 20)).rejects.toThrow(/one thumb/);
    await expect(single.getHighThumb()).rejects.toThrow(/one thumb/);
  });

  it('cannot be driven by a coordinate, which is why every write is a key press', async () => {
    const slider = await volume();
    const track = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-slider__track')!;

    // jsdom has no layout, so the track measures 0×0. The component turns a
    // pointer into a value by dividing the offset by that width: 40 / 0 is
    // Infinity, which clamps to a ratio of 1 and writes the MAX. A
    // coordinate-driven harness would hand back a confident, wrong number.
    expect(track.getBoundingClientRect().width).toBe(0);
    await pointerDown(40);
    expect(fixture.componentInstance.volume()).toBe(100);

    // On the left edge it is 0 / 0, and the value becomes NaN — which the
    // harness refuses to report rather than pass off as a number.
    fixture.componentInstance.volume.set(50);
    fixture.detectChanges();
    await pointerDown(0);
    expect(Number.isNaN(fixture.componentInstance.volume() as number)).toBe(true);
    await expect(slider.getValue()).rejects.toThrow(/not a number/);

    // The keyboard still gets there, which is the whole point.
    await slider.toMax();
    expect(fixture.componentInstance.volume()).toBe(100);
  });

  describe('range mode', () => {
    it('moves one end without disturbing the other', async () => {
      const slider = await span();

      await (await slider.getHighThumb()).setValue(90);
      expect(fixture.componentInstance.span()).toEqual([20, 90]);

      await (await slider.getLowThumb()).stepDown();
      expect(fixture.componentInstance.span()).toEqual([19, 90]);
    });

    it('moves the far end first so the thumbs never block each other', async () => {
      const slider = await span();

      // Lower end first, [20, 80] → [90, 95] would pin the lower thumb against
      // the upper one at 80 and never reach 90.
      await slider.setRange(90, 95);
      expect(fixture.componentInstance.span()).toEqual([90, 95]);
      expect(await slider.getValue()).toEqual([90, 95]);

      await slider.setRange(5, 10);
      expect(fixture.componentInstance.span()).toEqual([5, 10]);
    });

    it('refuses a crossed range', async () => {
      await expect((await span()).setRange(80, 20)).rejects.toThrow(/cannot cross/);

      expect(fixture.componentInstance.span()).toEqual([20, 80]);
    });

    it('refuses a target the other end is standing in front of', async () => {
      const slider = await span();

      await expect((await slider.getLowThumb()).setValue(90)).rejects.toThrow(/outside the \[0, 80\] window/);
      expect(fixture.componentInstance.span()).toEqual([20, 80]);
    });

    it('collapses onto its neighbour on Home, rather than crossing it', async () => {
      const slider = await span();

      // `Home` asks for the slider's min; the component refuses to let the ends
      // cross, so the upper thumb stops on the lower one at 20 rather than
      // inverting the range.
      await (await slider.getHighThumb()).toMin();

      expect(fixture.componentInstance.span()).toEqual([20, 20]);
      expect(await slider.getValue()).toEqual([20, 20]);
    });

    it('collapses onto its neighbour on End too', async () => {
      const slider = await span();

      await (await slider.getLowThumb()).toMax();

      expect(fixture.componentInstance.span()).toEqual([80, 80]);
    });
  });
});
