import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrColorPicker } from './color-picker';
import { WrColorPickerTrigger } from './color-picker-trigger';
import type { WrColorPickerSwatch } from './types';

@Component({
  imports: [WrColorPicker, WrColorPickerTrigger],
  template: `
    @if (inline()) {
      <wr-color-picker [alpha]="false" [(value)]="value" [swatches]="swatches()" />
    }
    <button type="button" class="open" wrColorPickerTrigger [(value)]="value" [swatches]="swatches()">Brand</button>
  `,
})
class Host {
  readonly inline = signal(true);
  readonly value = signal('#000000');
  readonly swatches = signal<readonly WrColorPickerSwatch[]>([
    { value: '#3366ff', label: 'Brand blue' },
    '#00ff00',
    { value: '#ff8800', label: 'Sunset' },
  ]);
}

/** A named swatch shows its name in the picker's one shared tooltip; a bare one shows none. */
describe('WrColorPicker swatch tooltip', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const swatch = (i: number, within: ParentNode = root()): HTMLButtonElement =>
    within.querySelectorAll<HTMLButtonElement>('.wr-color-picker__swatch')[i];
  const panes = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-tooltip-overlay')];
  const text = (): string | null => panes()[0]?.textContent?.trim() ?? null;

  function settle(ms = 200): void {
    fixture.detectChanges();
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  }

  function hover(el: HTMLElement): void {
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    settle(0);
    el.dispatchEvent(new MouseEvent('mouseenter'));
    settle();
  }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    });
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('shows the label of a named swatch on hover, after the delay', () => {
    swatch(0).dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    settle(50);
    expect(panes()).toEqual([]);

    settle(150);
    expect(text()).toBe('Brand blue');
    expect(panes()[0].getAttribute('role')).toBe('tooltip');
  });

  it('shows the label on keyboard focus', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    swatch(2).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    settle();

    expect(text()).toBe('Sunset');
  });

  it('shows nothing for a swatch with no label', () => {
    hover(swatch(1));

    expect(panes()).toEqual([]);
  });

  it('keeps the label as the only accessible name and describes nothing twice', () => {
    hover(swatch(0));

    expect(swatch(0).getAttribute('aria-label')).toBe('Brand blue');
    expect(swatch(0).hasAttribute('aria-describedby')).toBe(false);
    expect(swatch(0).textContent?.trim()).toBe('');
    expect(root().querySelectorAll('[aria-describedby]').length).toBe(1);
    expect(root().querySelector('[aria-describedby]')?.hasAttribute('hidden')).toBe(true);
  });

  it('serves every named swatch from one tooltip', () => {
    hover(swatch(0));
    const pane = panes()[0];
    hover(swatch(2));

    expect(panes()).toEqual([pane]);
    expect(text()).toBe('Sunset');
  });

  it('hides when the pointer leaves the swatch', () => {
    hover(swatch(0));
    expect(text()).toBe('Brand blue');
    swatch(0).dispatchEvent(new MouseEvent('mouseleave'));
    settle();

    expect(panes()).toEqual([]);
  });

  it('works inside the trigger panel and closes with it', () => {
    fixture.componentInstance.inline.set(false);
    fixture.detectChanges();
    root().querySelector<HTMLElement>('.open')!.click();
    settle(0);
    const panel = document.querySelector<HTMLElement>('.cdk-overlay-container .wr-color-picker')!;
    expect(panel).not.toBeNull();

    hover(swatch(0, panel));
    expect(text()).toBe('Brand blue');
    expect(panel.contains(panes()[0])).toBe(false);

    root().querySelector<HTMLElement>('.open')!.click();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    settle();
    expect(document.querySelector('.cdk-overlay-container .wr-color-picker')).toBeNull();
    expect(panes()).toEqual([]);
  });
});
