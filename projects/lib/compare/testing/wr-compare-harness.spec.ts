import { Directionality } from '@angular/cdk/bidi';
import type { Direction } from '@angular/cdk/bidi';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { WrCompare } from 'ngwr/compare';
import { afterEach, describe, expect, it } from 'vitest';

import { WrCompareHarness } from './wr-compare-harness';

@Component({
  imports: [WrCompare],
  template: `
    <wr-compare
      [(position)]="position"
      [orientation]="orientation()"
      [disabled]="disabled()"
      [minPosition]="min()"
      [maxPosition]="max()"
      [showHandle]="handle()"
      [ariaLabel]="label()"
    >
      <p wrCompareBefore>Draft</p>
      <p wrCompareAfter>Final</p>
    </wr-compare>
  `,
})
class Host {
  readonly position = signal(50);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly disabled = signal(false);
  readonly min = signal(0);
  readonly max = signal(100);
  readonly handle = signal(true);
  readonly label = signal<string | null>(null);
}

describe('WrCompareHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const mount = async (direction: Direction = 'ltr'): Promise<WrCompareHarness> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: direction, change: new Subject<Direction>() } }],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return TestbedHarnessEnvironment.loader(fixture).getHarness(WrCompareHarness);
  };

  afterEach(() => fixture.destroy());

  it('reads the position, its bounds, the axis and the label', async () => {
    const compare = await mount();

    expect([
      await compare.getPosition(),
      await compare.getMinPosition(),
      await compare.getMaxPosition(),
      await compare.getOrientation(),
      await compare.getLabel(),
    ]).toEqual([50, 0, 100, 'horizontal', 'Comparison divider']);

    fixture.componentInstance.orientation.set('vertical');
    fixture.componentInstance.label.set('Before and after');
    await fixture.whenStable();

    expect([await compare.getOrientation(), await compare.getLabel()]).toEqual(['vertical', 'Before and after']);
  });

  it('reads both layers and the handle', async () => {
    const compare = await mount();
    expect([await compare.getBeforeText(), await compare.getAfterText(), await compare.hasHandle()]).toEqual([
      'Draft',
      'Final',
      true,
    ]);

    fixture.componentInstance.handle.set(false);
    await fixture.whenStable();

    expect(await compare.hasHandle()).toBe(false);
  });

  it.each([
    ['ltr', 'horizontal'],
    ['rtl', 'horizontal'],
    ['ltr', 'vertical'],
    ['rtl', 'vertical'],
  ] as const)('walks the divider both ways under %s, %s', async (direction, orientation) => {
    const compare = await mount(direction);
    fixture.componentInstance.orientation.set(orientation);
    await fixture.whenStable();

    await compare.setPosition(73);
    expect([await compare.getPosition(), fixture.componentInstance.position()]).toEqual([73, 73]);

    await compare.setPosition(8);
    expect([await compare.getPosition(), fixture.componentInstance.position()]).toEqual([8, 8]);
  });

  it('reaches the bounds, and walks away from one under rtl', async () => {
    const compare = await mount('rtl');

    await compare.setPosition(100);
    expect(await compare.getPosition()).toBe(100);

    // At the ceiling the first guess, the arrow that shrinks in LTR, is clamped
    // and moves nothing: the walk has to turn around rather than give up.
    await compare.setPosition(97);
    expect(await compare.getPosition()).toBe(97);

    await compare.setPosition(0);
    expect(await compare.getPosition()).toBe(0);
    await compare.setPosition(4);
    expect(await compare.getPosition()).toBe(4);
  });

  it('honours bounds the host narrows', async () => {
    const compare = await mount();
    fixture.componentInstance.min.set(20);
    fixture.componentInstance.max.set(80);
    await fixture.whenStable();

    await compare.setPosition(80);
    expect(await compare.getPosition()).toBe(80);
    await compare.setPosition(20);
    expect(await compare.getPosition()).toBe(20);
    await expect(compare.setPosition(81)).rejects.toThrow(/whole percents in 20–80/);
  });

  it('refuses a target no key lands on', async () => {
    const compare = await mount();

    await expect(compare.setPosition(101)).rejects.toThrow(/unreachable/);
    await expect(compare.setPosition(12.5)).rejects.toThrow(/unreachable/);
    expect(await compare.getPosition()).toBe(50);
  });

  it('reports a disabled slider and says where it stayed', async () => {
    const compare = await mount();
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(await compare.isDisabled()).toBe(true);
    await expect(compare.setPosition(60)).rejects.toThrow(/stopped at 50, from 50/);
    await expect(compare.setPosition(0)).rejects.toThrow(/stopped at 50/);
  });

  it('moves focus to the slider and reports it', async () => {
    const compare = await mount();
    expect(await compare.isFocused()).toBe(false);

    await compare.focus();

    expect(await compare.isFocused()).toBe(true);
  });

  it('narrows by label, orientation and disabled', async () => {
    await mount();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const count = async (filters: Parameters<typeof WrCompareHarness.with>[0]): Promise<number> =>
      (await loader.getAllHarnesses(WrCompareHarness.with(filters))).length;

    expect(await count({ label: 'Comparison divider', orientation: 'horizontal', disabled: false })).toBe(1);
    expect(await count({ label: /nothing/ })).toBe(0);
    expect(await count({ orientation: 'vertical' })).toBe(0);
    expect(await count({ disabled: true })).toBe(0);
  });
});
