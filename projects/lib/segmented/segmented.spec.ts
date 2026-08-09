import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

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
