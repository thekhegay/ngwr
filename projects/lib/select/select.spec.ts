import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrOption } from './option';
import { WrSelect } from './select';

/**
 * The panel is a CDK overlay, so its options land in the overlay container
 * rather than in the fixture's own DOM — every query for an option has to go
 * through the document. That is also why this spec provides `provideWrOverlay`:
 * without it the container is CDK's shared root, which the next spec file would
 * then inherit along with anything left in it.
 */
@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select placeholder="Pick a size" ariaLabel="Size" [(value)]="size">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
      <wr-option value="lg" [disabled]="true">Large</wr-option>
    </wr-select>
  `,
})
class Host {
  readonly size = signal<unknown>(null);
}

describe('WrSelect', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-select__trigger')!;
  const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  const label = (): string | undefined => root().querySelector('.wr-select__value')?.textContent?.trim();
  const placeholder = (): string | undefined => root().querySelector('.wr-select__placeholder')?.textContent?.trim();

  const openPanel = (): void => {
    trigger().click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows the placeholder until something is chosen', () => {
    expect(placeholder()).toBe('Pick a size');
    expect(label()).toBeUndefined();
  });

  it('exposes the combobox contract on the trigger', () => {
    expect(trigger().getAttribute('role')).toBe('combobox');
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-label')).toBe('Size');
    // `aria-controls` must name the listbox even while it is closed, so a
    // screen reader can describe what the button owns before opening it.
    expect(trigger().getAttribute('aria-controls')).toBeTruthy();
  });

  it('renders no panel until it is opened', () => {
    expect(options()).toHaveLength(0);
  });

  it('opens on click and flips aria-expanded', () => {
    openPanel();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(options().map(o => o.textContent?.trim())).toEqual(['Small', 'Medium', 'Large']);
  });

  it('puts the panel in a container of its own, not CDK’s shared root', () => {
    openPanel();
    // `provideWrOverlay()` exists so ngwr overlays cannot collide with
    // Material's or NG-ZORRO's — a shared container is how z-index wars start.
    expect(document.querySelector('.wr-overlay-container')).toBeTruthy();
  });

  it('selects on click, writes back, and closes', () => {
    openPanel();
    options()[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.size()).toBe('md');
    expect(label()).toBe('Medium');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(options()).toHaveLength(0);
  });

  it('marks the chosen option as selected when reopened', () => {
    openPanel();
    options()[0].click();
    fixture.detectChanges();

    openPanel();
    expect(options().map(o => o.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
  });

  it('follows a value written from outside', () => {
    fixture.componentInstance.size.set('lg');
    fixture.detectChanges();
    expect(label()).toBe('Large');
  });

  it('does not select a disabled option', () => {
    openPanel();
    const disabled = options()[2];
    expect(disabled.getAttribute('aria-disabled')).toBe('true');

    disabled.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.size()).toBeNull();
  });

  it('opens from the keyboard', () => {
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('tracks the active option with aria-activedescendant, not with focus', () => {
    // The trigger keeps focus the whole time — that is what lets a combobox
    // stay typable while the list is open.
    openPanel();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    const active = trigger().getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)?.getAttribute('role')).toBe('option');
  });

  it('closes on Escape without changing the value', () => {
    openPanel();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.size()).toBeNull();
  });

  it('carries the public BEM classes', () => {
    expect(root().querySelector('.wr-select')).toBeTruthy();
    expect(trigger().classList.contains('wr-select__trigger')).toBe(true);
  });
});
