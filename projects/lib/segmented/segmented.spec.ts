import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrSegmentedOption } from './interfaces';
import { WrSegmented } from './segmented';

@Component({
  imports: [WrSegmented],
  template: `<wr-segmented [options]="options()" [(value)]="picked" [disabled]="disabled()" />`,
})
class Host {
  readonly options = signal<readonly WrSegmentedOption<string>[]>([
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month', disabled: true },
  ]);
  readonly picked = signal<string | null>('day');
  readonly disabled = signal(false);
}

/**
 * A segmented control is a row of toggle buttons over one value, so the state
 * a screen reader needs is `aria-pressed` — exactly one segment pressed, moving
 * with the value. The sliding thumb is decoration and is correctly hidden from
 * assistive tech.
 */
describe('WrSegmented', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const segments = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-segmented__option')];
  const pressed = (): string[] => segments().map(s => s.getAttribute('aria-pressed')!);
  const picked = (): string | null => fixture.componentInstance.picked();

  const click = (index: number): void => {
    segments()[index].click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('groups the segments and renders one per option', () => {
    expect(root().querySelector('wr-segmented')!.getAttribute('role')).toBe('group');
    expect(segments().map(s => s.textContent.trim())).toEqual(['Day', 'Week', 'Month']);
  });

  it('presses exactly the selected segment', () => {
    expect(pressed()).toEqual(['true', 'false', 'false']);
  });

  it('moves the pressed state with the value', () => {
    click(1);

    expect(picked()).toBe('week');
    expect(pressed()).toEqual(['false', 'true', 'false']);
  });

  it('follows a value written from outside', () => {
    fixture.componentInstance.picked.set('week');
    fixture.detectChanges();

    expect(pressed()).toEqual(['false', 'true', 'false']);
  });

  it('presses nothing for a value that matches no option', () => {
    fixture.componentInstance.picked.set('year');
    fixture.detectChanges();

    expect(pressed()).toEqual(['false', 'false', 'false']);
  });

  it('refuses a segment disabled by its own option', () => {
    click(2);

    expect(picked()).toBe('day');
  });

  it('disables every segment from the host', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    click(1);
    expect(picked()).toBe('day');
  });

  it('hides the sliding thumb from assistive tech', () => {
    // It is a decoration that tracks the selection; announced, it would be a
    // stray unlabelled element inside the group.
    expect(root().querySelector('.wr-segmented__thumb')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('rebuilds when the options change', () => {
    fixture.componentInstance.options.set([
      { value: 'list', label: 'List' },
      { value: 'grid', label: 'Grid' },
    ]);
    fixture.detectChanges();

    expect(segments().map(s => s.textContent.trim())).toEqual(['List', 'Grid']);
  });
});

/**
 * The thumb's position is the one thing here that cannot come out of the
 * stylesheet alone. It is anchored with a physical `left` and slid with
 * `translateX`, and neither has a logical form — while the options are a grid
 * that mirrors, so under `dir="rtl"` the segment at index `i` occupies the slot
 * `count - 1 - i` counted from the physical left. So the component publishes the
 * SLOT, signed from `Directionality`, the way the carousel signs its track.
 *
 * Every case is a pair: the same selection in both directions, expecting
 * different slots. One direction alone cannot tell "mirrors" from "counts from
 * the left in both".
 *
 * What jsdom cannot answer is whether the pill then lands on that segment —
 * there is no layout and the stylesheet is not applied. The custom property is
 * the input to that, and it is the part a unit test can honestly check.
 */
describe('WrSegmented parks its thumb by the reading direction', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const mount = (direction: Direction): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Directionality,
          useValue: { value: direction, valueSignal: signal(direction), change: new Subject<Direction>() },
        },
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  /** The slot the component publishes, off the host's own inline style. */
  const slot = (): string =>
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('wr-segmented')!
      .style.getPropertyValue('--wr-segmented-thumb-index');

  afterEach(() => fixture.destroy());

  it('counts slots from the left in LTR', () => {
    mount('ltr');
    expect(slot()).toBe('0'); // 'day', the first of three

    fixture.componentInstance.picked.set('week');
    fixture.detectChanges();
    expect(slot()).toBe('1');
  });

  it('counts them from the right in RTL, where the strip mirrors', () => {
    mount('rtl');
    expect(slot()).toBe('2'); // 'day' is still first to READ, and last from the left

    fixture.componentInstance.picked.set('week');
    fixture.detectChanges();
    expect(slot()).toBe('1'); // the middle segment is the fixed point, in either direction
  });

  it('keeps the divisor the segment count in both directions', () => {
    for (const direction of ['ltr', 'rtl'] as const) {
      mount(direction);
      expect(
        (fixture.nativeElement as HTMLElement)
          .querySelector<HTMLElement>('wr-segmented')!
          .style.getPropertyValue('--wr-segmented-thumb-count')
      ).toBe('3');
    }
  });

  it('needs no provider at all when nobody set a direction', () => {
    // `optional: true` — the same guarantee the carousel and the table make. A
    // consumer who never thought about `dir` must not have to provide one.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    expect(slot()).toBe('0');
  });
});
