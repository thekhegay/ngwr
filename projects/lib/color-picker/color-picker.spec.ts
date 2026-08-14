import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrColorPicker } from './color-picker';
import type { WrColorFormat } from './interfaces';

@Component({
  imports: [WrColorPicker],
  template: `
    <wr-color-picker
      [(value)]="value"
      [alpha]="alpha()"
      [format]="format()"
      [swatches]="swatches()"
      [disabled]="disabled()"
      (touch)="touched = touched + 1"
    />
  `,
})
class Host {
  readonly value = signal('#ff8800');
  readonly alpha = signal(true);
  readonly format = signal<WrColorFormat>('hex');
  readonly swatches = signal<readonly string[]>(['#00ff00', '#0000ff40']);
  readonly disabled = signal(false);
  touched = 0;
}

/**
 * The colour maths has its own spec next door; this file is about the component's
 * two contracts. First, what lands in `value` — the format was a documented input
 * that nothing read, so every picker emitted hex whatever it was told. Second, the
 * drag: jsdom has no layout and no `PointerEvent`, so surfaces get a stubbed rect
 * and events are built by hand, which is the only way to assert what a gesture
 * does to the colour.
 */
describe('WrColorPicker', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const sv = (): HTMLElement => root().querySelector<HTMLElement>('.wr-color-picker__sv')!;
  const hue = (): HTMLElement => root().querySelector<HTMLElement>('.wr-color-picker__slider--hue')!;
  const alphaBar = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-color-picker__slider--alpha');
  const hexField = (): HTMLInputElement =>
    root().querySelector<HTMLInputElement>('.wr-color-picker__inputs--hex input')!;
  const swatches = (): HTMLButtonElement[] => [
    ...root().querySelectorAll<HTMLButtonElement>('.wr-color-picker__swatch'),
  ];
  const value = (): string => fixture.componentInstance.value();

  /**
   * A pointer event jsdom does not implement, with the fields the component
   * reads. `setPointerCapture` is stubbed on the surface for the same reason.
   */
  const pointer = (type: string, init: Partial<PointerEvent> = {}): Event => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerId: 1, button: 0, isPrimary: true, clientX: 0, clientY: 0, ...init });
    return event;
  };

  /** Give a surface a 200×100 box at the origin, so a fraction is a coordinate. */
  const place = (el: HTMLElement): HTMLElement => {
    el.getBoundingClientRect = (): DOMRect => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
    el.setPointerCapture = (): void => undefined;
    el.releasePointerCapture = (): void => undefined;
    return el;
  };

  const drag = (el: HTMLElement, x: number, y = 0, init: Partial<PointerEvent> = {}): void => {
    place(el).dispatchEvent(pointer('pointerdown', { clientX: x, clientY: y, ...init }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('reads the incoming colour into the surfaces and the hex field', () => {
    expect(hexField().value).toBe('#ff8800ff');
    expect(root().querySelector<HTMLElement>('.wr-color-picker__thumb')!.style.left).toBe('100%');
  });

  it('falls back to black for a value it cannot read', () => {
    fixture.componentInstance.value.set('not a colour');
    fixture.detectChanges();

    expect(hexField().value).toBe('#000000ff');
  });

  describe('the format it emits', () => {
    it('writes hex by default', () => {
      drag(hue(), 0);
      expect(value()).toMatch(/^#[0-9a-f]{8}$/);
    });

    it('writes rgba when asked, rather than hex regardless', () => {
      // `format` was declared, documented, and forwarded by the trigger — and
      // never read, so every picker emitted hex whatever it was told.
      fixture.componentInstance.format.set('rgba');
      fixture.detectChanges();
      drag(alphaBar()!, 100);

      expect(value()).toBe('rgba(255, 136, 0, 0.5)');
    });

    it('writes hsla when asked', () => {
      fixture.componentInstance.format.set('hsla');
      fixture.detectChanges();
      drag(alphaBar()!, 200);

      expect(value()).toBe('hsla(32, 100%, 50%, 1)');
    });

    it('sheds the alpha channel from every format when the slider is off', () => {
      fixture.componentInstance.alpha.set(false);
      fixture.componentInstance.format.set('rgba');
      fixture.detectChanges();
      drag(hue(), 0);

      expect(value()).toBe('rgb(255, 0, 0)');
      expect(alphaBar()).toBeNull();
    });

    it('reads a colour written in any format it can emit', () => {
      // The picker receives back what it wrote — from a form patch, a route
      // param, a stored theme — and parsing only hex there turned every non-hex
      // value into black. Note this has to be a value the picker did NOT emit
      // itself: its own last emit is skipped by design, so re-feeding it proves
      // nothing about parsing.
      // The hsl spellings land one step off (`#007fff`, not `#0080ff`): 50%
      // lightness is 127.5 of 255, and the conversion rounds down through
      // floating point. That is the maths, not the parsing.
      for (const [written, expected] of [
        ['rgba(0, 128, 255, 0.5)', '#0080ff80'],
        ['rgb(0 128 255)', '#0080ffff'],
        ['hsla(210, 100%, 50%, 0.5)', '#007fff80'],
        ['hsl(210deg 100% 50%)', '#007fffff'],
      ] as const) {
        fixture.componentInstance.value.set(written);
        fixture.detectChanges();
        expect(hexField().value, written).toBe(expected);
      }
    });
  });

  describe('dragging', () => {
    it('reads the saturation / value square as a fraction of its box', () => {
      drag(sv(), 100, 50);

      // Half across, half down: saturation 50%, value 50%.
      const thumb = root().querySelector<HTMLElement>('.wr-color-picker__thumb')!;
      expect(thumb.style.left).toBe('50%');
      expect(thumb.style.top).toBe('50%');
    });

    it('clamps a drag that leaves the box', () => {
      drag(sv(), -500, 500);

      const thumb = root().querySelector<HTMLElement>('.wr-color-picker__thumb')!;
      expect(thumb.style.left).toBe('0%');
      expect(thumb.style.top).toBe('100%');
    });

    it('maps the hue slider across the full circle', () => {
      drag(hue(), 100);
      expect(value().toLowerCase()).toBe('#00ffffff');

      drag(hue(), 200);
      expect(value().toLowerCase()).toBe('#ff0000ff');
    });

    it('keeps following the pointer while it moves', () => {
      const bar = place(hue());
      bar.dispatchEvent(pointer('pointerdown', { clientX: 0 }));
      bar.dispatchEvent(pointer('pointermove', { clientX: 100 }));
      fixture.detectChanges();

      expect(value().toLowerCase()).toBe('#00ffffff');
    });

    it('ignores anything but the primary button and the primary pointer', () => {
      const before = value();
      drag(hue(), 100, 0, { button: 2 });
      expect(value()).toBe(before);

      drag(hue(), 100, 0, { isPrimary: false });
      expect(value()).toBe(before);
    });

    it('stops following a pointer whose gesture was cancelled', () => {
      // `pointercancel` is never followed by a `pointerup`, so the move listener
      // outlived the drag: the surface kept repainting under a hovering pointer.
      const bar = place(hue());
      bar.dispatchEvent(pointer('pointerdown', { clientX: 0 }));
      bar.dispatchEvent(pointer('pointercancel', { clientX: 0 }));
      fixture.detectChanges();
      const after = value();

      // Half way across, not all the way: hue 360 is hue 0, so a move to the far
      // edge would land back on the colour it started from and prove nothing.
      bar.dispatchEvent(pointer('pointermove', { clientX: 100 }));
      fixture.detectChanges();
      expect(value()).toBe(after);
    });

    it('marks itself touched when the gesture ends', () => {
      const bar = place(hue());
      bar.dispatchEvent(pointer('pointerdown', { clientX: 10 }));
      expect(fixture.componentInstance.touched).toBe(0);

      bar.dispatchEvent(pointer('pointerup', { clientX: 10 }));
      expect(fixture.componentInstance.touched).toBe(1);
    });

    it('does nothing at all while disabled', () => {
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();
      const before = value();
      drag(hue(), 100);

      expect(value()).toBe(before);
    });
  });

  describe('typing and swatches', () => {
    it('takes a hex the moment it becomes valid, and ignores it until then', () => {
      const field = hexField();
      field.value = '#00f';
      field.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(value().toLowerCase()).toBe('#0000ffff');

      field.value = '#00';
      field.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(value().toLowerCase()).toBe('#0000ffff');
    });

    /**
     * "Ignore this write" is not "ignore this string, forever".
     *
     * The guard that stops a drag re-quantising through its own hex round-trip
     * was set and never cleared, so once the picker had emitted a colour, an
     * app writing that same colour back — a reset button, a form patch, an
     * undo — was dropped for the rest of the component's life.
     */
    it('honours an external write of a colour it emitted earlier', async () => {
      const original = fixture.componentInstance.value();

      // The picker emits: pick a swatch.
      swatches()[0].click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const emitted = value();
      expect(emitted.toLowerCase()).not.toBe(original.toLowerCase());

      // Somewhere else moves it away...
      fixture.componentInstance.value.set(original);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(hexField().value.toLowerCase()).toContain('ff8800');

      // ...and then back to exactly what the picker had emitted.
      fixture.componentInstance.value.set(emitted);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(hexField().value.toLowerCase(), 'the write-back was swallowed').toBe(emitted.toLowerCase());
    });

    it('puts the canonical value back in the field on blur', () => {
      const field = hexField();
      field.value = 'garbage';
      field.dispatchEvent(new Event('input'));
      // Change detection between the two events, because the binding only writes
      // the field back when the value it last wrote has actually changed — in a
      // browser each event is its own CD pass.
      fixture.detectChanges();
      field.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(field.value).toBe('#ff8800ff');
      expect(fixture.componentInstance.touched).toBe(1);
    });

    it('applies a swatch, keeping the alpha the swatch does not mention', () => {
      // A 6-digit swatch says nothing about alpha, and `parseHex` reports the
      // absence as 1 — so picking a preset used to snap a translucent colour
      // back to fully opaque.
      drag(alphaBar()!, 100);
      expect(value().toLowerCase()).toBe('#ff880080');

      swatches()[0].click();
      fixture.detectChanges();
      expect(value().toLowerCase()).toBe('#00ff0080');
    });

    it('takes the alpha from a swatch that carries one', () => {
      swatches()[1].click();
      fixture.detectChanges();

      expect(value().toLowerCase()).toBe('#0000ff40');
    });

    it('disables the swatch buttons along with everything else', () => {
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      expect(swatches().every(button => button.disabled)).toBe(true);
    });
  });

  describe('the numeric tabs', () => {
    const tab = (label: string): void => {
      const button = [...root().querySelectorAll<HTMLElement>('.wr-color-picker__tabs button')].find(
        b => b.textContent.trim() === label
      )!;
      button.click();
      fixture.detectChanges();
    };
    const fields = (): HTMLInputElement[] => [
      ...root().querySelectorAll<HTMLInputElement>('.wr-color-picker__inputs input'),
    ];

    it('shows the channels of the current colour', () => {
      tab('RGB');
      expect(fields().map(f => f.value)).toEqual(['255', '136', '0', '100']);

      tab('HSL');
      expect(fields().map(f => f.value)).toEqual(['32', '100', '50', '100']);
    });

    it('applies an edited rgb channel', () => {
      tab('RGB');
      const [r] = fields();
      r.value = '0';
      r.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(value().toLowerCase()).toBe('#008800ff');
    });

    it('clamps an rgb channel to the byte range', () => {
      tab('RGB');
      const [r] = fields();
      r.value = '999';
      r.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(value().toLowerCase().startsWith('#ff')).toBe(true);
    });

    it('applies an edited hsl channel as a percentage', () => {
      tab('HSL');
      const [, s] = fields();
      s.value = '0';
      s.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // Saturation zero at half lightness is mid grey, whatever the hue was.
      expect(value().toLowerCase()).toBe('#808080ff');
    });

    it('reads the alpha field as a percentage', () => {
      tab('RGB');
      const alphaInput = fields()[3];
      alphaInput.value = '50';
      alphaInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(value().toLowerCase()).toBe('#ff880080');
    });
  });
});
