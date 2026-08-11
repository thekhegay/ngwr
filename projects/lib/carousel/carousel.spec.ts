import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrCarousel } from './carousel';
import { WrCarouselSlide } from './carousel-slide';

@Component({
  imports: [WrCarousel, WrCarouselSlide],
  template: `
    <wr-carousel [(active)]="active" [autoplay]="autoplay()" [loop]="loop()" [intervalMs]="500">
      @for (label of slides(); track label) {
        <wr-carousel-slide>{{ label }}</wr-carousel-slide>
      }
    </wr-carousel>
  `,
})
class Host {
  readonly slides = signal(['one', 'two', 'three']);
  readonly active = signal(0);
  readonly autoplay = signal(false);
  readonly loop = signal(true);
}

/**
 * The track is moved with a `translateX` percentage, which is the one piece of layout
 * jsdom can report — the inline style itself — so where the carousel IS gets asserted
 * through that rather than through geometry.
 *
 * Autoplay is the part with teeth. It moves content on its own, so WCAG 2.2.2 wants a
 * way to stop it, and that way has to reach a keyboard: hovering is not a mechanism
 * for someone who never touches a mouse.
 */
describe('WrCarousel', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-carousel')!;
  const viewport = (): HTMLElement => root().querySelector<HTMLElement>('.wr-carousel__viewport')!;
  const track = (): HTMLElement => root().querySelector<HTMLElement>('.wr-carousel__track')!;
  const next = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-carousel__nav--next')!;
  const prev = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-carousel__nav--prev')!;
  const dots = (): HTMLButtonElement[] => [...root().querySelectorAll<HTMLButtonElement>('.wr-carousel__dot')];
  const active = (): number => fixture.componentInstance.active();

  const click = (el: HTMLElement): void => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();
  };

  const mount = (platform = 'browser', dir: Direction = 'ltr'): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        // `Directionality` resolves the document's direction when it is constructed,
        // so a fake is the only way to test the other one without writing
        // `document.dir` and leaking it into whatever runs next.
        {
          provide: Directionality,
          useValue: { value: dir, valueSignal: signal(dir), change: new Subject<Direction>() },
        },
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  /**
   * jsdom implements neither `TouchEvent` nor layout, so a touch is a plain event
   * carrying the one field the component reads, and the viewport's width — which
   * sets the 20% swipe threshold — is declared.
   */
  const touch = (type: string, clientX?: number): Event => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { touches: clientX === undefined ? [] : [{ clientX }] });
    return event;
  };

  /** Drag the track `dx` physical pixels and release. Threshold is 60px of 300. */
  const swipe = (dx: number): void => {
    const el = viewport();
    Object.defineProperty(el, 'offsetWidth', { value: 300, configurable: true });
    el.dispatchEvent(touch('touchstart', 100));
    el.dispatchEvent(touch('touchmove', 100 + dx));
    el.dispatchEvent(touch('touchend'));
    fixture.detectChanges();
  };

  beforeEach(() => mount());
  afterEach(() => fixture.destroy());

  it('starts on the first slide and moves the track by whole viewports', () => {
    expect(track().style.transform).toBe('translateX(0%)');

    click(next());
    expect(active()).toBe(1);
    expect(track().style.transform).toBe('translateX(-100%)');
  });

  it('wraps at both ends while looping, and stops without it', () => {
    click(prev());
    expect(active()).toBe(2);
    click(next());
    expect(active()).toBe(0);

    fixture.componentInstance.loop.set(false);
    fixture.detectChanges();
    click(prev());
    expect(active()).toBe(0);
  });

  it('jumps to a slide from its dot, and marks the current one', () => {
    expect(dots().length).toBe(3);
    click(dots()[2]);

    expect(active()).toBe(2);
    expect(dots()[2].getAttribute('aria-current')).toBe('true');
    expect(dots()[0].hasAttribute('aria-current')).toBe(false);
    expect(dots()[2].classList.contains('wr-carousel__dot--active')).toBe(true);
  });

  it('describes the viewport as a carousel on an element that can carry it', () => {
    // `aria-roledescription` only means something on an element with a semantic role —
    // on a bare div it is dropped. `wr-carousel-slide` already gets this right.
    expect(viewport().getAttribute('aria-roledescription')).toBe('carousel');
    expect(viewport().getAttribute('role')).toBeTruthy();
    expect(viewport().getAttribute('aria-label')).toBeTruthy();
  });

  it('hides the arrows and dots when there is nothing to page through', () => {
    fixture.componentInstance.slides.set(['only']);
    fixture.detectChanges();
    expect(root().querySelector('.wr-carousel__nav')).toBeNull();
    expect(dots()).toEqual([]);
  });

  it('pulls the active index back when the slides shrink under it', () => {
    // `active` is a plain `model`, so nothing reconciled it against the slide count:
    // a filtered list left it pointing past the end, translating the track into blank
    // space with no dot lit.
    click(dots()[2]);
    expect(active()).toBe(2);

    fixture.componentInstance.slides.set(['one']);
    fixture.detectChanges();

    expect(active()).toBe(0);
    expect(track().style.transform).toBe('translateX(0%)');
  });

  it('pulls an out-of-range write back into the range', () => {
    fixture.componentInstance.active.set(9);
    fixture.detectChanges();
    expect(active()).toBe(2);
  });

  /**
   * The track is moved with a PHYSICAL `translateX` while the slides are laid out
   * on the inline axis, so the sign has to follow the reading direction. Both
   * directions are asserted for every case: an RTL assertion on its own cannot
   * tell "mirrors correctly" from "always goes left".
   *
   * What does NOT mirror is the buttons — `next` is the next slide in both
   * directions. Only the physical motion under them turns around.
   */
  describe('reading direction', () => {
    it('moves the track toward the far side of the strip — ltr', () => {
      mount('browser', 'ltr');

      click(next());
      expect(active()).toBe(1);
      expect(track().style.transform).toBe('translateX(-100%)');
    });

    it('moves the track toward the far side of the strip — rtl', () => {
      // Mirrored, the flex track runs right-to-left: slide 1 sits to the LEFT of
      // slide 0, so reaching it means moving the track the other way. Unsigned,
      // this translated the carousel off into blank space.
      mount('browser', 'rtl');

      click(next());
      expect(active()).toBe(1);
      expect(track().style.transform).toBe('translateX(100%)');
    });

    it('keeps the buttons semantic — prev is the earlier slide either way', () => {
      for (const dir of ['ltr', 'rtl'] as const) {
        mount('browser', dir);

        click(prev()); // wraps backwards off the first slide
        expect(active(), dir).toBe(2);
        click(next());
        expect(active(), dir).toBe(0);
      }
    });

    it('advances on a swipe toward the next slide — ltr', () => {
      mount('browser', 'ltr');

      swipe(-120); // the next slide is off to the right, so the finger drags left
      expect(active()).toBe(1);

      swipe(120);
      expect(active()).toBe(0);

      swipe(-20); // under the 20% threshold — snaps back
      expect(active()).toBe(0);
    });

    it('advances on a swipe toward the next slide — rtl', () => {
      // Mirrored, the next slide is off to the LEFT instead, so it is a rightward
      // drag that pulls it into view.
      mount('browser', 'rtl');

      swipe(120);
      expect(active()).toBe(1);

      swipe(-120);
      expect(active()).toBe(0);

      swipe(20);
      expect(active()).toBe(0);
    });

    it('drags the track WITH the finger in both directions — the offset is not mirrored', () => {
      // The one physical quantity that must NOT flip. `dragX` is the finger's own
      // displacement, so 30px of rightward travel is 30px of rightward track
      // travel whichever way the strip reads; signing it would drag the track
      // away from the touch. Only the SETTLED offset (the base) is direction-aware.
      for (const dir of ['ltr', 'rtl'] as const) {
        mount('browser', dir);
        const el = viewport();
        Object.defineProperty(el, 'offsetWidth', { value: 300, configurable: true });

        el.dispatchEvent(touch('touchstart', 100));
        el.dispatchEvent(touch('touchmove', 130));
        fixture.detectChanges();
        expect(track().style.transform, dir).toBe('translateX(calc(0% + 30px))');

        el.dispatchEvent(touch('touchend'));
        fixture.detectChanges();
      }
    });
  });

  describe('autoplay', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    /** `whenStable()` deadlocks under fake timers, so the pass is driven by hand. */
    const advance = (ms: number): void => {
      vi.advanceTimersByTime(ms);
      fixture.detectChanges();
    };

    it('advances on its own once it is switched on', () => {
      fixture.componentInstance.autoplay.set(true);
      fixture.detectChanges();

      advance(500);
      expect(active()).toBe(1);
      advance(500);
      expect(active()).toBe(2);
    });

    it('schedules nothing on the server', () => {
      // No platform guard meant the prerender ran the timer too — work nobody will
      // ever see, on a slide index that gets serialized.
      mount('server');
      fixture.componentInstance.autoplay.set(true);
      fixture.detectChanges();

      advance(2000);
      expect(active()).toBe(0);
    });

    it('holds while the pointer is anywhere over the carousel', () => {
      // The listeners were on the viewport, and the arrows and dots are its SIBLINGS —
      // so a slide could change under a cursor that was aiming at an arrow. In a real
      // browser entering an arrow enters the host too; jsdom does not synthesize that,
      // so this asserts the listener is on the host, which is the fix.
      fixture.componentInstance.autoplay.set(true);
      fixture.detectChanges();

      host().dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();
      advance(2000);
      expect(active()).toBe(0);

      host().dispatchEvent(new MouseEvent('mouseleave'));
      fixture.detectChanges();
      advance(500);
      expect(active()).toBe(1);
    });

    it('holds while the keyboard is inside it', () => {
      // WCAG 2.2.2 asks for a way to stop moving content, and hover is not one for
      // someone who never touches a mouse: tabbing to the arrows used to leave the
      // slides moving under the focus.
      fixture.componentInstance.autoplay.set(true);
      fixture.detectChanges();

      next().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      fixture.detectChanges();
      advance(2000);
      expect(active()).toBe(0);

      next().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      fixture.detectChanges();
      advance(500);
      expect(active()).toBe(1);
    });

    it('stops when it is switched off, and when the carousel goes away', () => {
      fixture.componentInstance.autoplay.set(true);
      fixture.detectChanges();
      advance(500);
      expect(active()).toBe(1);

      fixture.componentInstance.autoplay.set(false);
      fixture.detectChanges();
      advance(5000);
      expect(active()).toBe(1);
    });

    it('never runs with a single slide', () => {
      fixture.componentInstance.slides.set(['only']);
      fixture.componentInstance.autoplay.set(true);
      fixture.detectChanges();

      advance(5000);
      expect(active()).toBe(0);
    });
  });
});

/**
 * The dot labels used to be a hard-coded English template while the three labels
 * beside them routed through `ngwr/i18n` — so a localized app got two languages in
 * one pagination strip. Only a real catalog can tell the difference: without one, a
 * catalog lookup falls back to the same English string and the assertion passes
 * whether the wiring exists or not.
 */
describe('WrCarousel under a localized catalog', () => {
  it('takes every label it renders from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const dots = [...el.querySelectorAll('.wr-carousel__dot')];
    expect(dots[0].getAttribute('aria-label')).toBe('Перейти к слайду 1');
    expect(el.querySelector('.wr-carousel__nav--next')!.getAttribute('aria-label')).toBe('Следующий слайд');
    expect(el.querySelector('.wr-carousel__viewport')!.getAttribute('aria-label')).toBe('Карусель');

    fixture.destroy();
  });
});
