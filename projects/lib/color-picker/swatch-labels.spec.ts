import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrColorPicker } from './color-picker';
import { WrColorPickerTrigger } from './color-picker-trigger';
import type { WrColorPickerSwatch } from './types';

@Component({
  imports: [WrColorPicker, WrColorPickerTrigger],
  template: `
    <wr-color-picker [alpha]="false" [(value)]="value" [swatches]="swatches()" />
    <button type="button" wrColorPickerTrigger [(value)]="value" [swatches]="swatches()">Brand</button>
  `,
})
class Host {
  readonly value = signal('#000000');
  readonly swatches = signal<readonly WrColorPickerSwatch[]>([
    { value: '#3366ff', label: 'Brand blue' },
    '#00ff00',
    { value: '#ff8800', label: 'Sunset' },
  ]);
}

/**
 * A preset is a button with nothing in it but a colour, so its accessible name
 * is all a screen reader gets: the consumer's label when there is one, the raw
 * string when there is not.
 */
describe('WrColorPicker swatch names', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const swatches = (within: HTMLElement): HTMLButtonElement[] => [
    ...within.querySelectorAll<HTMLButtonElement>('.wr-color-picker__swatch'),
  ];
  const inline = (): HTMLElement => root().querySelector<HTMLElement>('wr-color-picker')!;
  const names = (within: HTMLElement): (string | null)[] => swatches(within).map(el => el.getAttribute('aria-label'));

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('names a preset by its label, and a bare string by itself', () => {
    expect(names(inline())).toEqual(['Brand blue', '#00ff00', 'Sunset']);
  });

  it('keeps the colour on the button whatever it is called', () => {
    expect(swatches(inline()).map(el => el.getAttribute('data-color'))).toEqual(['#3366ff', '#00ff00', '#ff8800']);
  });

  it('still takes a plain array of strings, each announcing itself', async () => {
    fixture.componentInstance.swatches.set(['#111111', '#222222']);
    await fixture.whenStable();

    expect(names(inline())).toEqual(['#111111', '#222222']);
  });

  it('applies the colour of a named preset, not its name', async () => {
    swatches(inline())[0].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('#3366ff');
  });

  it('carries the names into the panel a trigger opens', async () => {
    const trigger = root().querySelector<HTMLButtonElement>('[wrColorPickerTrigger]')!;
    trigger.click();
    await fixture.whenStable();

    const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '')!;

    expect(names(panel)).toEqual(['Brand blue', '#00ff00', 'Sunset']);
  });
});
