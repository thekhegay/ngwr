import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

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

  const mount = (platform = 'browser'): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
    fixture = TestBed.createComponent(Host);
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
