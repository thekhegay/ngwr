import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrColorPicker } from './color-picker';
import { WrColorPickerTrigger } from './color-picker-trigger';
import type { WrColorPickerSize } from './types';

@Component({
  imports: [WrColorPicker, WrColorPickerTrigger],
  template: `
    <wr-color-picker value="#ff8800" [size]="size()" />
    <button type="button" wrColorPickerTrigger value="#ff8800" [size]="size()">Brand</button>
  `,
})
class Host {
  readonly size = signal<WrColorPickerSize>('md');
}

/**
 * The class half of `size`, on the inline picker and on the panel a trigger
 * opens. What each size does to the hooks is read off the compiled sheet in
 * `size-hooks.spec.ts`.
 */
describe('WrColorPicker size', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const inline = (): HTMLElement => root().querySelector<HTMLElement>('wr-color-picker')!;
  const trigger = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('[wrColorPickerTrigger]')!;
  /** The panel is in the overlay container, so it is found by the id the trigger publishes. */
  const panel = (): HTMLElement =>
    document
      .getElementById(trigger().getAttribute('aria-controls') ?? '')!
      .querySelector<HTMLElement>('wr-color-picker')!;

  const set = async (size: WrColorPickerSize): Promise<void> => {
    fixture.componentInstance.size.set(size);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('paints no size modifier at md, the default', () => {
    expect(inline().classList.contains('wr-color-picker')).toBe(true);
    expect(inline().className).not.toMatch(/wr-color-picker--(sm|md|lg)/);
  });

  it.each(['sm', 'lg'] as const)('adds wr-color-picker--%s and drops it on the way back to md', async size => {
    await set(size);

    expect(inline().classList.contains(`wr-color-picker--${size}`)).toBe(true);

    await set('md');

    expect(inline().className).not.toMatch(/wr-color-picker--(sm|md|lg)/);
  });

  it('opens an md panel from a trigger that sets no size', async () => {
    trigger().click();
    await fixture.whenStable();

    expect(panel().className).not.toMatch(/wr-color-picker--(sm|md|lg)/);
  });

  it.each(['sm', 'lg'] as const)('hands the trigger size %s to the panel it opens', async size => {
    await set(size);
    trigger().click();
    await fixture.whenStable();

    expect(panel().classList.contains(`wr-color-picker--${size}`)).toBe(true);
  });
});
