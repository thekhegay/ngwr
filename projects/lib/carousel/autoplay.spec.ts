import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { compileSass } from '../spec-sass';

import { WrCarousel } from './carousel';
import { WrCarouselSlide } from './carousel-slide';

@Component({
  imports: [WrCarousel, WrCarouselSlide],
  template: `
    <wr-carousel [(active)]="active" [autoplay]="autoplay()" [intervalMs]="500">
      @for (label of slides(); track label) {
        <wr-carousel-slide>{{ label }}</wr-carousel-slide>
      }
    </wr-carousel>
  `,
})
class Host {
  readonly slides = signal(['one', 'two', 'three']);
  readonly active = signal(0);
  readonly autoplay = signal(true);
}

/**
 * What autoplay owes a reader who did not ask for it: a button that stops it
 * (WCAG 2.2.2), silence while it runs and a spoken position when the reader
 * moves the carousel (the WAI-ARIA carousel pattern), and no start at all under
 * `prefers-reduced-motion` until they press play.
 */
describe('WrCarousel autoplay controls', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let reduced: ReturnType<typeof signal<boolean>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-carousel')!;
  const toggle = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-carousel__toggle')!;
  const live = (): HTMLElement => root().querySelector<HTMLElement>('.wr-carousel__live')!;
  const next = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-carousel__nav--next')!;
  const dots = (): HTMLButtonElement[] => [...root().querySelectorAll<HTMLButtonElement>('.wr-carousel__dot')];
  const active = (): number => fixture.componentInstance.active();

  const click = (el: HTMLElement): void => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  const fire = (el: HTMLElement, event: Event): void => {
    el.dispatchEvent(event);
    fixture.detectChanges();
  };

  /** `whenStable()` deadlocks under fake timers, so the pass is driven by hand. */
  const advance = (ms: number): void => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };

  const mount = (reducedMotion = false, autoplay = true): void => {
    reduced = signal(reducedMotion);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: WrPlatform, useValue: { prefersReducedMotion: reduced.asReadonly() } },
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.autoplay.set(autoplay);
    fixture.detectChanges();
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  describe('the pause button', () => {
    it('is a real button, first in the carousel, and only under autoplay', () => {
      mount();
      expect(toggle().tagName).toBe('BUTTON');
      expect(toggle().type).toBe('button');
      // The way to stop the slides is the first tab stop, before the slides.
      expect(host().firstElementChild).toBe(toggle());

      mount(false, false);
      expect(toggle()).toBeNull();
    });

    it('is absent with a single slide, which never moves', () => {
      mount();
      fixture.componentInstance.slides.set(['only']);
      fixture.detectChanges();

      expect(toggle()).toBeNull();
    });

    it('stops the slides, and starts them again', () => {
      mount();
      expect(toggle().getAttribute('aria-label')).toBe('Pause');
      advance(500);
      expect(active()).toBe(1);

      click(toggle());
      expect(toggle().getAttribute('aria-label')).toBe('Play');
      advance(5000);
      expect(active()).toBe(1);

      click(toggle());
      expect(toggle().getAttribute('aria-label')).toBe('Pause');
      advance(500);
      expect(active()).toBe(2);
    });

    it('stays stopped when the pointer and the keyboard leave', () => {
      mount();
      fire(host(), new MouseEvent('mouseenter'));
      fire(toggle(), new FocusEvent('focusin', { bubbles: true }));
      click(toggle());

      fire(toggle(), new FocusEvent('focusout', { bubbles: true }));
      fire(host(), new MouseEvent('mouseleave'));
      advance(5000);

      // A hold lets go when its source leaves. A press does not.
      expect(active()).toBe(0);
      expect(toggle().getAttribute('aria-label')).toBe('Play');
    });

    it('keeps its name while a hover or a focus only holds the slides', () => {
      mount();
      fire(host(), new MouseEvent('mouseenter'));
      advance(5000);

      expect(active()).toBe(0);
      // Held, not switched off: a press would still pause it.
      expect(toggle().getAttribute('aria-label')).toBe('Pause');
    });

    it('starts the slides on play though the press came from inside the carousel', () => {
      mount();
      click(toggle());

      // The press itself: the pointer is over the carousel and focus is on the button.
      fire(host(), new MouseEvent('mouseenter'));
      fire(toggle(), new FocusEvent('focusin', { bubbles: true }));
      click(toggle());
      advance(500);
      expect(active()).toBe(1);

      // The holds are back with the next move inside it.
      fire(next(), new FocusEvent('focusin', { bubbles: true }));
      advance(5000);
      expect(active()).toBe(1);
    });

    it('takes its two names from the inputs', () => {
      TestBed.resetTestingModule();
      @Component({
        imports: [WrCarousel, WrCarouselSlide],
        template: `
          <wr-carousel autoplay pauseLabel="Stop the slides" playLabel="Start the slides">
            <wr-carousel-slide>one</wr-carousel-slide>
            <wr-carousel-slide>two</wr-carousel-slide>
          </wr-carousel>
        `,
      })
      class Named {}
      const named = TestBed.createComponent(Named);
      named.detectChanges();
      const button = (named.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.wr-carousel__toggle')!;

      expect(button.getAttribute('aria-label')).toBe('Stop the slides');
      button.click();
      named.detectChanges();
      expect(button.getAttribute('aria-label')).toBe('Start the slides');

      named.destroy();
      mount();
    });
  });

  describe('under prefers-reduced-motion', () => {
    it('waits for play, and then runs', () => {
      mount(true);
      expect(toggle().getAttribute('aria-label')).toBe('Play');
      advance(5000);
      expect(active()).toBe(0);

      click(toggle());
      expect(toggle().getAttribute('aria-label')).toBe('Pause');
      advance(500);
      expect(active()).toBe(1);
    });

    it('does not start when the preference is lifted after a pause', () => {
      mount(true);
      click(toggle());
      click(toggle());

      reduced.set(false);
      fixture.detectChanges();
      advance(5000);

      expect(active()).toBe(0);
    });
  });

  describe('the live region', () => {
    it('is one element, there before anything is said', () => {
      mount();

      expect(root().querySelectorAll('[aria-live]')).toHaveLength(1);
      expect(live().getAttribute('aria-atomic')).toBe('true');
      expect(live().textContent.trim()).toBe('');
    });

    it('is off while the slides advance on their own, and polite once they stand', () => {
      mount();
      expect(live().getAttribute('aria-live')).toBe('off');

      fire(host(), new MouseEvent('mouseenter'));
      expect(live().getAttribute('aria-live')).toBe('polite');
      fire(host(), new MouseEvent('mouseleave'));
      expect(live().getAttribute('aria-live')).toBe('off');

      click(toggle());
      expect(live().getAttribute('aria-live')).toBe('polite');
    });

    it('is polite on a carousel that never autoplays', () => {
      mount(false, false);

      expect(live().getAttribute('aria-live')).toBe('polite');
    });

    it('says nothing for an autoplay tick', () => {
      mount();
      advance(1000);

      expect(active()).toBe(2);
      expect(live().textContent.trim()).toBe('');
    });

    it('says the position after an arrow and after a dot', () => {
      mount(false, false);

      click(next());
      expect(live().textContent.trim()).toBe('Slide 2 of 3');
      click(dots()[2]);
      expect(live().textContent.trim()).toBe('Slide 3 of 3');
    });

    it('says nothing when a dot leads to the slide already showing', () => {
      mount(false, false);
      click(dots()[0]);

      expect(live().textContent.trim()).toBe('');
    });

    it('clears on a tick, so the same position can be said again', () => {
      mount();
      fire(host(), new MouseEvent('mouseenter'));
      click(next());
      expect(live().textContent.trim()).toBe('Slide 2 of 3');

      fire(host(), new MouseEvent('mouseleave'));
      advance(500);
      expect(active()).toBe(2);
      expect(live().textContent.trim()).toBe('');
    });

    it('takes the sentence from the catalog', async () => {
      vi.useRealTimers();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
          provideWrI18nStaticLoader({ ru: wrRu }),
        ],
      });
      fixture = TestBed.createComponent(Host);
      fixture.componentInstance.autoplay.set(false);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      click(next());
      expect(live().textContent.trim()).toBe('Слайд 2 из 3');
    });
  });
});

/**
 * jsdom lays nothing out, so the 24px of WCAG 2.5.8 is held in the compiled
 * stylesheet: an 8px dot passes only on the spacing exception, which needs the
 * centres of two neighbours 24px apart.
 */
describe('WrCarousel dot targets', () => {
  const css = compileSass(`@use 'carousel/styles';`);
  const rule = (selector: string): string => {
    const at = css.indexOf(`${selector} {`);
    expect(at, selector).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf('}', at));
  };
  const rem = (block: string, property: string): number =>
    Number(new RegExp(`(?:^|[\\s;{])${property}:\\s*([\\d.]+)rem`).exec(block)?.[1] ?? NaN);

  it('puts the centres of two resting dots 24px apart', () => {
    const dot = rule('.wr-carousel__dot');
    const gapToken = /--wr-carousel-dots-gap:\s*var\((--wr-space-\w+)\)/.exec(css)?.[1];
    const tokens = readFileSync(join(process.cwd(), 'projects/lib/theme/styles/_variables.scss'), 'utf8');
    const gap = Number(new RegExp(`${gapToken}:\\s*([\\d.]+)rem`).exec(tokens)?.[1] ?? NaN);

    expect(rule('.wr-carousel__dots')).toMatch(/gap:\s*var\(--wr-carousel-dots-gap\)/);
    expect((rem(dot, 'width') + gap) * 16).toBeGreaterThanOrEqual(24);
  });

  it('gives each dot a hit area 24px tall that reaches half the gap to each side', () => {
    const dot = rule('.wr-carousel__dot');
    const area = rule('.wr-carousel__dot::after');
    const inset = /inset:\s*-([\d.]+)rem calc\(var\(--wr-carousel-dots-gap\) \/ -2\)/.exec(area);

    expect(dot).toMatch(/position:\s*relative/);
    expect(inset).not.toBeNull();
    expect((rem(dot, 'height') + 2 * Number(inset![1])) * 16).toBeGreaterThanOrEqual(24);
  });
});
