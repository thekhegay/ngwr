import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrKnob } from 'ngwr/knob';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrKnobHarness } from './wr-knob-harness';

@Component({
  imports: [WrKnob],
  template: `
    <wr-knob
      [(value)]="value"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [suffix]="suffix()"
      [showValue]="showValue()"
      [ariaLabel]="ariaLabel()"
      [readonly]="readonly()"
      [disabled]="disabled()"
      (touch)="touched = touched + 1"
    />
  `,
})
class Host {
  readonly value = signal(50);
  readonly min = signal(0);
  readonly max = signal(100);
  readonly step = signal(1);
  readonly suffix = signal('%');
  readonly showValue = signal(true);
  readonly ariaLabel = signal<string | null>(null);
  readonly readonly = signal(false);
  readonly disabled = signal(false);
  touched = 0;
}

/**
 * Used as a consumer would, entirely through the keyboard. Turning the dial with a
 * pointer maps an angle measured from the centre of a box jsdom never lays out, so
 * every synthetic gesture would land on the same end of the arc and pass.
 */
describe('WrKnobHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const knob = (): Promise<WrKnobHarness> => loader.getHarness(WrKnobHarness);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads the value and the range off the slider', async () => {
    const harness = await knob();

    expect(await harness.getValue()).toBe(50);
    expect([await harness.getMin(), await harness.getMax()]).toEqual([0, 100]);
  });

  it('separates the announced number from the printed string', async () => {
    const harness = await knob();

    // The suffix is in the dial and not in `aria-valuenow`, which is why these are
    // two methods: a screen reader is told 50 for a dial that reads 50%.
    expect(await harness.getValue()).toBe(50);
    expect(await harness.getDisplayValue()).toBe('50%');
    expect(await harness.getSuffix()).toBe('%');
  });

  it('has no printed value at all when the dial hides it', async () => {
    fixture.componentInstance.showValue.set(false);
    await fixture.whenStable();

    const harness = await knob();
    expect([await harness.getDisplayValue(), await harness.getSuffix()]).toEqual([null, null]);
    expect(await harness.getValue()).toBe(50);
  });

  it('names the dial, defaulting to plain English with no catalog', async () => {
    const harness = await knob();
    expect(await harness.getLabel()).toBe('Value');

    fixture.componentInstance.ariaLabel.set('Volume');
    await fixture.whenStable();

    expect(await harness.getLabel()).toBe('Volume');
  });

  it('steps with all four arrows, and by ten with shift', async () => {
    const harness = await knob();

    await harness.pressArrow('right');
    await harness.pressArrow('up');
    expect(await harness.getValue()).toBe(52);

    await harness.pressArrow('left');
    await harness.pressArrow('down');
    expect(await harness.getValue()).toBe(50);

    await harness.pressArrow('up', { shift: true });
    expect(await harness.getValue()).toBe(60);
  });

  it('jumps to the ends of the range', async () => {
    const harness = await knob();

    await harness.pressEnd();
    expect(await harness.getValue()).toBe(100);

    await harness.pressHome();
    expect(await harness.getValue()).toBe(0);
  });

  it('walks to a value and writes it back through the two-way binding', async () => {
    const harness = await knob();

    await harness.setValue(73);

    expect(await harness.getValue()).toBe(73);
    expect(fixture.componentInstance.value()).toBe(73);

    await harness.setValue(12);
    expect(await harness.getValue()).toBe(12);
  });

  it('walks a coarse grid without being told the step', async () => {
    fixture.componentInstance.step.set(5);
    fixture.componentInstance.value.set(0);
    await fixture.whenStable();

    const harness = await knob();

    await harness.setValue(35);
    expect(await harness.getValue()).toBe(35);
  });

  it('refuses a value the dial would clamp away', async () => {
    const harness = await knob();

    await expect(harness.setValue(140)).rejects.toThrow(/accepts 0–100/);
    expect(await harness.getValue()).toBe(50);
  });

  it('says where it landed when the target is between two grid points', async () => {
    fixture.componentInstance.step.set(10);
    await fixture.whenStable();

    const harness = await knob();

    await expect(harness.setValue(63)).rejects.toThrow(/straight past the target/);
  });

  it('reports a disabled dial, and refuses to walk one', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    const harness = await knob();

    expect([await harness.isDisabled(), await harness.isFocusable()]).toEqual([true, false]);

    await harness.pressArrow('right');
    expect(await harness.getValue()).toBe(50);

    await expect(harness.setValue(70)).rejects.toThrow(/stopped moving/);
  });

  it('reports a read-only dial the same way, which is the interesting part', async () => {
    fixture.componentInstance.readonly.set(true);
    await fixture.whenStable();

    const harness = await knob();

    // Read-only keeps its tab stop: the dial refuses the edit and still has to
    // be reachable, so a keyboard user can hear the value it is holding.
    // `disabled` is the state that leaves the tab order.
    expect([await harness.isReadonly(), await harness.isDisabled(), await harness.isFocusable()]).toEqual([
      true,
      false,
      true,
    ]);

    await harness.pressArrow('right');
    expect(await harness.getValue()).toBe(50);
  });

  it('moves the handle with the value, from attributes rather than a measured box', async () => {
    const harness = await knob();

    const middle = await harness.getHandlePosition();

    await harness.pressHome();
    const bottom = await harness.getHandlePosition();

    await harness.pressEnd();
    const top = await harness.getHandlePosition();

    // The arc runs from 7 o'clock to 5 o'clock, so min and max sit on opposite sides
    // of the centre and the midpoint is at the top.
    expect(bottom.x).toBeLessThan(middle.x);
    expect(top.x).toBeGreaterThan(middle.x);
    expect(middle.y).toBeLessThan(bottom.y);
  });

  it('emits touch on blur, which is the only source for a keyboard-only dial', async () => {
    const harness = await knob();

    await harness.focus();
    expect(await harness.isFocused()).toBe(true);

    await harness.pressArrow('right');
    expect(fixture.componentInstance.touched).toBe(0);

    await harness.blur();
    expect(fixture.componentInstance.touched).toBe(1);
  });

  it('matches on the name, the value and the two off states', async () => {
    expect(await loader.getHarnessOrNull(WrKnobHarness.with({ value: 50 }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrKnobHarness.with({ value: 51 }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrKnobHarness.with({ label: 'Value' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrKnobHarness.with({ disabled: true }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrKnobHarness.with({ readonly: false }))).not.toBeNull();
  });
});
