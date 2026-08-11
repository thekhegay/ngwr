import { Directionality } from '@angular/cdk/bidi';
import type { Type } from '@angular/core';
import { Component, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSlider } from './slider';

@Component({
  imports: [WrSlider],
  template: ` <wr-slider [(value)]="amount" [min]="min()" [max]="max()" [step]="step()" [disabled]="disabled()" /> `,
})
class Host {
  readonly amount = signal<number | [number, number]>(50);
  readonly min = signal(0);
  readonly max = signal(100);
  readonly step = signal(1);
  readonly disabled = signal(false);
}

@Component({
  imports: [WrSlider],
  template: `<wr-slider range [(value)]="span" [min]="0" [max]="100" />`,
})
class RangeHost {
  readonly span = signal<[number, number]>([20, 80]);
}

/**
 * Dragging needs a real compositor, so what a unit suite can own here is the
 * half that does not: the ARIA contract a screen reader reads, and the keyboard
 * path — which for a slider is the ONLY path some users have.
 */
describe('WrSlider', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const thumb = (): HTMLElement => root().querySelector<HTMLElement>('[role="slider"]')!;
  const amount = (): number => fixture.componentInstance.amount() as number;

  const press = (key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    thumb().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('presents a thumb with the full ARIA slider contract', () => {
    expect(thumb().getAttribute('aria-valuemin')).toBe('0');
    expect(thumb().getAttribute('aria-valuemax')).toBe('100');
    expect(thumb().getAttribute('aria-valuenow')).toBe('50');
    // A native <button> carrying the role — focusable without a `tabindex`, and
    // it goes out of the tab order by itself when disabled.
    expect(thumb().tagName).toBe('BUTTON');
    expect((thumb() as HTMLButtonElement).disabled).toBe(false);
  });

  it('moves aria-valuenow with the value', () => {
    fixture.componentInstance.amount.set(75);
    fixture.detectChanges();

    expect(thumb().getAttribute('aria-valuenow')).toBe('75');
  });

  it('steps with the arrows in both directions', () => {
    press('ArrowRight');
    expect(amount()).toBe(51);

    press('ArrowUp');
    expect(amount()).toBe(52);

    press('ArrowLeft');
    press('ArrowDown');
    expect(amount()).toBe(50);
  });

  it('honours a custom step', () => {
    fixture.componentInstance.step.set(10);
    fixture.detectChanges();

    press('ArrowRight');
    expect(amount()).toBe(60);
  });

  it('clamps at both bounds', () => {
    fixture.componentInstance.amount.set(99);
    fixture.detectChanges();
    press('ArrowRight');
    press('ArrowRight');
    expect(amount()).toBe(100);

    fixture.componentInstance.amount.set(1);
    fixture.detectChanges();
    press('ArrowLeft');
    press('ArrowLeft');
    expect(amount()).toBe(0);
  });

  it('jumps to the bounds with Home and End', () => {
    press('Home');
    expect(amount()).toBe(0);

    press('End');
    expect(amount()).toBe(100);
  });

  it('takes a bigger stride with PageUp and PageDown', () => {
    const before = amount();
    press('PageUp');

    // A 1% step over a 0-100 range makes the keyboard unusable without one.
    expect(amount()).toBeGreaterThan(before + 1);
  });

  it('respects a min above zero', () => {
    fixture.componentInstance.min.set(20);
    fixture.componentInstance.amount.set(21);
    fixture.detectChanges();

    press('Home');
    expect([amount(), thumb().getAttribute('aria-valuemin')]).toEqual([20, '20']);
  });

  it('ignores the keyboard while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    press('ArrowRight');
    expect(amount()).toBe(50);
  });

  it('leaves keys it does not own to the page', () => {
    expect(press('Tab').defaultPrevented).toBe(false);
  });

  describe('range mode', () => {
    let range: ReturnType<typeof TestBed.createComponent<RangeHost>>;

    const thumbs = (): HTMLElement[] => [
      ...(range.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="slider"]'),
    ];

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      range = TestBed.createComponent(RangeHost);
      range.detectChanges();
    });

    afterEach(() => range.destroy());

    it('gives each end its own thumb, named and bounded by the other', () => {
      expect(thumbs()).toHaveLength(2);
      expect(thumbs().map(t => t.getAttribute('aria-valuenow'))).toEqual(['20', '80']);
      // The ends bound each other, so a screen reader reads the real room each
      // thumb has rather than the whole track.
      expect(thumbs()[0].getAttribute('aria-valuemax')).toBe('80');
      expect(thumbs()[1].getAttribute('aria-valuemin')).toBe('20');
      expect(thumbs().map(t => t.getAttribute('aria-label'))).toEqual(['Lower value', 'Upper value']);
    });

    it('moves one end without disturbing the other', () => {
      thumbs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      range.detectChanges();

      expect(range.componentInstance.span()).toEqual([21, 80]);
    });

    it('does not let the lower end cross the upper one', () => {
      range.componentInstance.span.set([79, 80]);
      range.detectChanges();

      for (let i = 0; i < 4; i++) {
        thumbs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
        range.detectChanges();
      }

      // Crossing would invert the range and every consumer reading `[from, to]`
      // would silently get them backwards.
      const [low, high] = range.componentInstance.span();
      expect(low).toBeLessThanOrEqual(high);
    });
  });

  /**
   * Under `dir="rtl"` the track is drawn the other way round: the minimum sits
   * on the RIGHT. Everything that names a side of the screen — the horizontal
   * arrows, the offset a pointer is measured by, and therefore which thumb a
   * track click grabs — has to follow it; everything that names a VALUE must
   * not. Every case here is a pair, because a suite that only asserts the RTL
   * half cannot tell "mirrors" from "always goes the other way".
   */
  describe('reading direction', () => {
    type Direction = 'ltr' | 'rtl';

    /**
     * `Directionality` reads the document once, at construction, so a spec that
     * wants RTL provides the answer rather than trying to stage a document. The
     * DOM is left with no `dir` at all — nothing here reads one.
     */
    const mount = <T>(host: Type<T>, direction: Direction): ComponentFixture<T> => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: Directionality, useValue: { value: direction, change: new Subject<Direction>() } }],
      });
      const mounted = TestBed.createComponent(host);
      mounted.detectChanges();
      return mounted;
    };

    const pressOn = (target: ComponentFixture<Host>, key: string, init: KeyboardEventInit = {}): number => {
      const el = (target.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="slider"]')!;
      el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
      target.detectChanges();
      return target.componentInstance.amount() as number;
    };

    /**
     * jsdom has no layout, so the track measures 0×0 and every ratio the
     * component takes divides by zero. A stubbed rect is what makes the pointer
     * maths — the thing under test — measurable at all: a 200px track pinned at
     * x 0, where `clientX: 150` is three quarters along it in LTR and one
     * quarter along it in RTL.
     */
    const trackOf = (target: ComponentFixture<unknown>, width = 200): HTMLElement => {
      const track = (target.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-slider__track')!;
      track.getBoundingClientRect = (): DOMRect =>
        ({ left: 0, right: width, width, top: 0, bottom: 8, height: 8, x: 0, y: 0 }) as DOMRect;
      return track;
    };

    const clickTrack = (target: ComponentFixture<unknown>, clientX: number): void => {
      trackOf(target).dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX }));
      target.detectChanges();
    };

    it('sends ArrowRight toward the visual right, which in RTL is the lower end', () => {
      expect(pressOn(mount(Host, 'ltr'), 'ArrowRight')).toBe(51);
      expect(pressOn(mount(Host, 'rtl'), 'ArrowRight')).toBe(49);
    });

    it('sends ArrowLeft the other way, in both directions', () => {
      expect(pressOn(mount(Host, 'ltr'), 'ArrowLeft')).toBe(49);
      expect(pressOn(mount(Host, 'rtl'), 'ArrowLeft')).toBe(51);
    });

    it('mirrors the Shift stride with the arrow it is holding', () => {
      expect(pressOn(mount(Host, 'ltr'), 'ArrowRight', { shiftKey: true })).toBe(60);
      expect(pressOn(mount(Host, 'rtl'), 'ArrowRight', { shiftKey: true })).toBe(40);
    });

    // The block axis is not what `dir` governs — flipping ↑ / ↓ would be a bug
    // only a Hebrew-speaking user ever reports.
    it('leaves the vertical arrows alone', () => {
      expect(pressOn(mount(Host, 'ltr'), 'ArrowUp')).toBe(51);
      expect(pressOn(mount(Host, 'rtl'), 'ArrowUp')).toBe(51);
      expect(pressOn(mount(Host, 'ltr'), 'ArrowDown')).toBe(49);
      expect(pressOn(mount(Host, 'rtl'), 'ArrowDown')).toBe(49);
    });

    // PageUp / PageDown name a stride, not a side, so they follow ↑ / ↓.
    it('leaves PageUp and PageDown alone', () => {
      expect(pressOn(mount(Host, 'ltr'), 'PageUp')).toBe(60);
      expect(pressOn(mount(Host, 'rtl'), 'PageUp')).toBe(60);
      expect(pressOn(mount(Host, 'ltr'), 'PageDown')).toBe(40);
      expect(pressOn(mount(Host, 'rtl'), 'PageDown')).toBe(40);
    });

    // Home / End mean first / last — a semantic position, not a physical one.
    it('keeps Home on the min and End on the max', () => {
      expect(pressOn(mount(Host, 'ltr'), 'Home')).toBe(0);
      expect(pressOn(mount(Host, 'rtl'), 'Home')).toBe(0);
      expect(pressOn(mount(Host, 'ltr'), 'End')).toBe(100);
      expect(pressOn(mount(Host, 'rtl'), 'End')).toBe(100);
    });

    it('measures a pointer from the edge the track starts at', () => {
      const ltr = mount(Host, 'ltr');
      clickTrack(ltr, 150);
      expect(ltr.componentInstance.amount()).toBe(75);

      // Same pixel, mirrored track: three quarters from the right is 25.
      const rtl = mount(Host, 'rtl');
      clickTrack(rtl, 150);
      expect(rtl.componentInstance.amount()).toBe(25);
    });

    it('grabs the thumb that is nearest ON SCREEN, so the pick mirrors too', () => {
      const ltr = mount(RangeHost, 'ltr');
      clickTrack(ltr, 180);
      expect(ltr.componentInstance.span()).toEqual([20, 90]);

      // In RTL the upper thumb is the one on the LEFT, so the very same click
      // near the right edge is nearest the LOWER end.
      const rtl = mount(RangeHost, 'rtl');
      clickTrack(rtl, 180);
      expect(rtl.componentInstance.span()).toEqual([10, 80]);
    });

    it('still refuses to let the ends cross, whichever key raises the low one', () => {
      const lowThumb = (target: ComponentFixture<RangeHost>): HTMLElement =>
        (target.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-slider__thumb--low')!;

      const walk = (target: ComponentFixture<RangeHost>, key: string): [number, number] => {
        target.componentInstance.span.set([79, 80]);
        target.detectChanges();
        for (let i = 0; i < 4; i++) {
          lowThumb(target).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
          target.detectChanges();
        }
        return target.componentInstance.span();
      };

      expect(walk(mount(RangeHost, 'ltr'), 'ArrowRight')).toEqual([80, 80]);
      // ← is the raising key in RTL, and it stops at the neighbour just the same.
      expect(walk(mount(RangeHost, 'rtl'), 'ArrowLeft')).toEqual([80, 80]);
    });

    it('paints its parts on the inline axis, so the track mirrors from CSS alone', () => {
      // Not a pair: this is the reason there is no direction in the drawing
      // code at all. `inset-inline-start` IS `left` in LTR and the right edge
      // in RTL, so a physical `left` here would leave the thumb painted at the
      // wrong end of a track whose keyboard had already been mirrored.
      const painted = mount(Host, 'ltr');
      const thumb = (painted.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-slider__thumb--low')!;
      const fill = (painted.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-slider__fill')!;

      expect(thumb.style.getPropertyValue('inset-inline-start')).toBe('50%');
      expect(thumb.style.getPropertyValue('left')).toBe('');
      expect(fill.style.getPropertyValue('width')).toBe('50%');
      expect(fill.style.getPropertyValue('left')).toBe('');
    });

    it('needs no provider at all when nobody set a direction', () => {
      // `optional: true` — a consumer that never thought about `dir` must not
      // have to provide anything, and a bare TestBed must still behave as LTR.
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const bare = TestBed.createComponent(Host);
      bare.detectChanges();

      expect(pressOn(bare, 'ArrowRight')).toBe(51);
    });
  });
});
