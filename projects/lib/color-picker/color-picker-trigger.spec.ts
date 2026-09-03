import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrColorPickerTrigger } from './color-picker-trigger';

@Component({
  imports: [WrColorPickerTrigger],
  template: `
    <button type="button" wrColorPickerTrigger [(value)]="brand">Brand</button>
    <button type="button" id="elsewhere">Something else</button>
  `,
})
class Host {
  readonly brand = signal('#ff0000');
}

/**
 * The panel this trigger opens is a portal at the end of `<body>` holding a
 * `role="group"` surface and two `role="slider"` elements, every one of them
 * `tabindex="0"` — and the directive used to contain no focus code at all. Focus
 * stayed on the trigger, so Tab went to the next thing on the PAGE and the
 * picker was unreachable from the keyboard for as long as it was open; closing
 * disposed the overlay without handing focus back, dropping it to `<body>`.
 *
 * These are the two halves of that, plus the one case where taking focus back
 * would be stealing. Deliberately no trap, matching `wr-popover` /
 * `[wrPopconfirm]`: an outside click or Escape closes this panel, so trapping
 * would only make it harder to leave.
 *
 * The panel lives in the NGWR overlay container rather than in the fixture, so
 * it is queried off the document — and `provideWrOverlay()` keeps this file's
 * container out of the next one's.
 */
describe('[wrColorPickerTrigger] focus', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('[wrColorPickerTrigger]')!;
  const elsewhere = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('#elsewhere')!;
  const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-color-picker');
  const surface = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-color-picker__sv');

  const click = (el: HTMLElement): void => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();
  };

  const open = (): void => {
    trigger().focus();
    click(trigger());
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('moves focus into the panel, onto the surface that carries the colour', () => {
    open();

    expect(panel()).not.toBeNull();
    expect(document.activeElement).toBe(surface());
  });

  it('renders the picker before reaching for it', () => {
    // The focus is synchronous with the open, not deferred to a frame — a
    // deferred focus is the class of bug this repo keeps finding, and under
    // zoneless CD it lands after the element it was aiming at has moved.
    open();

    expect(document.activeElement).not.toBe(document.body);
  });

  it('hands focus back to the trigger when it closes', () => {
    open();
    click(trigger());

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('hands it back when Escape closes the panel', () => {
    open();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('leaves focus where the user put it when they close it by leaving', () => {
    // The counterpart of handing focus back: if the panel is dismissed because
    // the user reached for something else, that is where focus belongs.
    open();
    elsewhere().focus();
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    elsewhere().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(elsewhere());
  });

  it('does not trap: everything in the panel stays reachable from the page', () => {
    open();

    // No focus trap means no CDK anchors bracketing the pane — the panel is
    // non-modal, and the anchors would be the tell that it is not.
    expect(document.querySelectorAll('.cdk-focus-trap-anchor')).toHaveLength(0);
    expect(elsewhere().getAttribute('aria-hidden')).toBeNull();
  });
});

/**
 * `exportAs` is what lets a template drive the trigger from somewhere else on the
 * page — `#swatch="wrColorPickerTrigger"` then `(click)="swatch.open()"`. Without
 * it the reference is a compile error, so mounting the host is half the assertion.
 */
describe('WrColorPickerTrigger template reference', () => {
  @Component({
    imports: [WrColorPickerTrigger],
    template: `<button type="button" wrColorPickerTrigger #ref="wrColorPickerTrigger">Colour</button>`,
  })
  class ExportHost {
    readonly trigger = viewChild.required<WrColorPickerTrigger>('ref');
  }

  it('publishes the instance as `wrColorPickerTrigger`', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });

    const fixture = TestBed.createComponent(ExportHost);
    fixture.detectChanges();

    expect(fixture.componentInstance.trigger()).toBeInstanceOf(WrColorPickerTrigger);

    fixture.destroy();
  });
});
