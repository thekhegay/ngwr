import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSlider } from './slider';
import type { WrSliderSize } from './types';

@Component({
  imports: [WrSlider],
  template: `<wr-slider [size]="size()" [value]="40" />`,
})
class Host {
  readonly size = signal<WrSliderSize>('md');
}

/**
 * The class half of `size`. What each size does to the hooks is read off the
 * compiled sheet in `size-hooks.spec.ts`.
 */
describe('WrSlider size', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-slider')!;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('paints no size modifier at md, the default', () => {
    expect(host().classList.contains('wr-slider')).toBe(true);
    expect(host().className).not.toMatch(/wr-slider--(sm|md|lg)/);
  });

  it.each(['sm', 'lg'] as const)('adds wr-slider--%s and drops it on the way back to md', async size => {
    fixture.componentInstance.size.set(size);
    await fixture.whenStable();

    expect(host().classList.contains(`wr-slider--${size}`)).toBe(true);

    fixture.componentInstance.size.set('md');
    await fixture.whenStable();

    expect(host().className).not.toMatch(/wr-slider--(sm|md|lg)/);
  });
});
