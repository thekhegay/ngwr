import { Directionality } from '@angular/cdk/bidi';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrSplitter } from 'ngwr/splitter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSplitterHarness } from './wr-splitter-harness';

@Component({
  imports: [WrSplitter],
  template: `
    <wr-splitter
      [(position)]="position"
      [orientation]="orientation()"
      [minPosition]="min()"
      [maxPosition]="max()"
      [disabled]="disabled()"
      [dividerLabel]="dividerLabel()"
    >
      <div wrSplitterStart>Files</div>
      <div wrSplitterEnd>Editor</div>
    </wr-splitter>
  `,
})
class Host {
  readonly position = signal(50);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly min = signal(0);
  readonly max = signal(100);
  readonly disabled = signal(false);
  readonly dividerLabel = signal<string | null>(null);
}

/**
 * Used as a consumer would, and entirely through the keyboard. The drag turns a
 * client coordinate into a percentage against a measured box, and jsdom has no
 * layout — so a synthetic gesture would write `NaN` and pass.
 */
describe('WrSplitterHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const splitter = (): Promise<WrSplitterHarness> => loader.getHarness(WrSplitterHarness);

  const mount = (providers: unknown[] = []): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  beforeEach(() => mount());

  afterEach(() => fixture.destroy());

  it('reads the position and the range off the divider', async () => {
    const harness = await splitter();

    expect(await harness.getPosition()).toBe(50);
    expect([await harness.getMinPosition(), await harness.getMaxPosition()]).toEqual([0, 100]);
  });

  it('answers the axis twice, because the two names are opposites', async () => {
    const harness = await splitter();

    // Panes side by side, so the divider between them is a vertical line.
    expect([await harness.getOrientation(), await harness.getDividerOrientation()]).toEqual(['horizontal', 'vertical']);

    fixture.componentInstance.orientation.set('vertical');
    await fixture.whenStable();

    expect([await harness.getOrientation(), await harness.getDividerOrientation()]).toEqual(['vertical', 'horizontal']);
  });

  it('reads the projected panes and the share each is asking for', async () => {
    const harness = await splitter();

    expect([await harness.getStartText(), await harness.getEndText()]).toEqual(['Files', 'Editor']);
    expect(await harness.getPaneSizes()).toEqual({ start: 50, end: 50 });

    fixture.componentInstance.position.set(70);
    await fixture.whenStable();

    expect(await harness.getPaneSizes()).toEqual({ start: 70, end: 30 });
  });

  it('names the divider, defaulting to plain English with no catalog', async () => {
    const harness = await splitter();
    expect(await harness.getDividerLabel()).toBe('Resize panes');

    fixture.componentInstance.dividerLabel.set('Resize the sidebar');
    await fixture.whenStable();

    expect(await harness.getDividerLabel()).toBe('Resize the sidebar');
  });

  it('steps by one, and by ten with shift', async () => {
    const harness = await splitter();

    await harness.pressArrow('right');
    expect(await harness.getPosition()).toBe(51);

    await harness.pressArrow('left');
    expect(await harness.getPosition()).toBe(50);

    await harness.pressArrow('right', { shift: true });
    expect(await harness.getPosition()).toBe(60);
  });

  it('ignores the arrows that are off its axis', async () => {
    const harness = await splitter();

    await harness.pressArrow('up');
    await harness.pressArrow('down');

    expect(await harness.getPosition()).toBe(50);
  });

  it('jumps to the bounds with Home and End', async () => {
    fixture.componentInstance.min.set(20);
    fixture.componentInstance.max.set(80);
    await fixture.whenStable();

    const harness = await splitter();

    await harness.pressEnd();
    expect(await harness.getPosition()).toBe(80);

    await harness.pressHome();
    expect(await harness.getPosition()).toBe(20);
  });

  it('walks to a position and writes it back through the two-way binding', async () => {
    const harness = await splitter();

    await harness.setPosition(73);

    expect(await harness.getPosition()).toBe(73);
    expect(fixture.componentInstance.position()).toBe(73);
    expect(await harness.getPaneSizes()).toEqual({ start: 73, end: 27 });

    await harness.setPosition(28);
    expect(await harness.getPosition()).toBe(28);
  });

  it('walks down the block axis on a vertical splitter', async () => {
    fixture.componentInstance.orientation.set('vertical');
    await fixture.whenStable();

    const harness = await splitter();

    await harness.pressArrow('down');
    expect(await harness.getPosition()).toBe(51);

    await harness.setPosition(35);
    expect(await harness.getPosition()).toBe(35);
  });

  it('refuses a target the splitter would clamp away', async () => {
    fixture.componentInstance.min.set(20);
    fixture.componentInstance.max.set(80);
    await fixture.whenStable();

    const harness = await splitter();

    await expect(harness.setPosition(90)).rejects.toThrow(/accepts 20–80/);
    expect(await harness.getPosition()).toBe(50);
  });

  it('says where it stopped when the walk cannot land exactly', async () => {
    fixture.componentInstance.position.set(50.5);
    await fixture.whenStable();

    const harness = await splitter();

    await expect(harness.setPosition(60)).rejects.toThrow(/stopped at 59.5/);
  });

  it('reports a disabled splitter, and refuses to walk one', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    const harness = await splitter();

    expect([await harness.isDisabled(), await harness.isDividerFocusable()]).toEqual([true, false]);

    await harness.pressArrow('right');
    expect(await harness.getPosition()).toBe(50);

    await expect(harness.setPosition(70)).rejects.toThrow(/stopped moving/);
  });

  it('keeps the divider focusable and reports where focus is', async () => {
    const harness = await splitter();

    expect([await harness.isDividerFocusable(), await harness.isDividerFocused()]).toEqual([true, false]);

    await harness.focusDivider();
    expect(await harness.isDividerFocused()).toBe(true);
  });

  it('matches on the axis, the divider name and the disabled state', async () => {
    expect(await loader.getHarnessOrNull(WrSplitterHarness.with({ orientation: 'horizontal' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrSplitterHarness.with({ orientation: 'vertical' }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrSplitterHarness.with({ dividerLabel: /Resize/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrSplitterHarness.with({ disabled: true }))).toBeNull();
  });

  describe('under dir="rtl"', () => {
    beforeEach(() =>
      mount([{ provide: Directionality, useValue: { value: 'rtl', change: { subscribe: () => ({}) } } }])
    );

    it('mirrors the arrows, because the start pane is the one on the right', async () => {
      const harness = await splitter();

      await harness.pressArrow('right');
      expect(await harness.getPosition()).toBe(49);

      await harness.pressArrow('left');
      expect(await harness.getPosition()).toBe(50);
    });

    it('still walks to the number asked for, having worked out which key grows it', async () => {
      const harness = await splitter();

      await harness.setPosition(73);
      expect(await harness.getPosition()).toBe(73);
    });

    it('leaves Home and End alone — they are semantic, not directional', async () => {
      const harness = await splitter();

      await harness.pressHome();
      expect(await harness.getPosition()).toBe(0);

      await harness.pressEnd();
      expect(await harness.getPosition()).toBe(100);
    });
  });
});
