import { type Direction, Directionality } from '@angular/cdk/bidi';
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

/**
 * A flip of the reading direction while the picker is OPEN.
 *
 * The CDK reads the direction once, as a string, when an overlay is created and
 * writes it as the host's `dir` on attach; `updatePosition()` never touches it
 * again. This panel is where that shows worst, because it is the one that
 * carries a `<wr-segmented>`: the strip reads `Directionality` LIVE, so the
 * thumb mirrors to the far slot while the box around it is still laid out the
 * old way, and parks under the wrong tab. Two of the trigger's four fallbacks
 * anchor on `end` besides, so the side the panel hangs off is direction-decided
 * too.
 *
 * All three halves are asserted, because they fail independently: the `dir`
 * attribute every logical rule inside the pane reads, the thumb slot that made
 * the mismatch visible, and the anchored edge, which is what says the CDK
 * re-resolved the position rather than merely relabelling the box.
 */
describe('[wrColorPickerTrigger] follows a direction flip while its panel is open', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const trigger = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[wrColorPickerTrigger]')!;
  const pane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-color-picker-overlay');
  /**
   * `panelClass` lands on the PANE; the `dir` attribute and the position styles
   * are written on the host wrapper around it, so that is what these read.
   */
  const overlayHost = (): HTMLElement => pane()!.parentElement!;
  /**
   * jsdom gives every element a 0×0 rect, so there are no coordinates to
   * compare — what survives is which viewport edge the CDK anchored the box to,
   * and that is decided by `start` resolving against the overlay's direction.
   */
  const anchoredEdge = (): [string, string] => [overlayHost().style.left, overlayHost().style.right];
  /**
   * The slot the strip's thumb parks in, counted from the physical left — an
   * inline custom property `wr-segmented` writes itself, so it is readable off
   * the `style` attribute where a stylesheet-computed value would not be. Three
   * tabs, `hex` selected: slot 0 reading left-to-right, slot 2 mirrored.
   */
  const thumbSlot = (): string =>
    document
      .querySelector<HTMLElement>('.wr-color-picker wr-segmented')!
      .style.getPropertyValue('--wr-segmented-thumb-index');

  /** A signal write is state, not an event: it lands on the next change detection. */
  const flipTo = (direction: Direction): void => {
    TestBed.inject(Directionality).valueSignal.set(direction);
    TestBed.tick();
    fixture.detectChanges();
  };

  const open = (): void => {
    trigger().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();
  };

  const escape = (): void => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('rewrites the open panel’s `dir`', () => {
    open();
    expect(overlayHost().getAttribute('dir')).toBe('ltr');

    flipTo('rtl');

    expect(overlayHost().getAttribute('dir')).toBe('rtl');
  });

  it('keeps the tab strip and the pane it sits in reading the same way', () => {
    open();
    expect(thumbSlot()).toBe('0');

    flipTo('rtl');

    // The symptom itself: the strip mirrors on its own, so a pane left behind
    // means a thumb under the wrong tab. Both, or neither.
    expect(thumbSlot()).toBe('2');
    expect(overlayHost().getAttribute('dir')).toBe('rtl');
  });

  it('re-anchors the panel against the direction just set', () => {
    open();
    expect(anchoredEdge()).toEqual(['0px', 'auto']);

    flipTo('rtl');

    // `setDirection()` rewrites the attribute and nothing else — without the
    // reposition that follows it, the panel keeps hanging off the edge the
    // direction it left resolved `start` to.
    expect(anchoredEdge()).toEqual(['auto', '0px']);
  });

  it('gives a panel reopened after a flip a follower of its own', () => {
    open();
    escape();
    expect(pane()).toBeNull();

    // The follower went down with the disposed ref; nothing here may write
    // through it. Reopening is always a NEW ref in this library, so the second
    // panel has to install its own.
    flipTo('rtl');
    open();
    expect(overlayHost().getAttribute('dir')).toBe('rtl');

    flipTo('ltr');

    expect(overlayHost().getAttribute('dir')).toBe('ltr');
  });
});
