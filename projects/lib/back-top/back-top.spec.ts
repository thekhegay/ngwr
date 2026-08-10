import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { WrScroll } from 'ngwr/scroll';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrBackTop } from './back-top';

@Component({
  imports: [WrBackTop],
  template: ` <wr-back-top [visibilityThreshold]="threshold()" [offset]="offset()" [ariaLabel]="ariaLabel()" /> `,
})
class Host {
  readonly threshold = signal(400);
  readonly offset = signal(0);
  readonly ariaLabel = signal<string | null>(null);
}

@Component({
  imports: [WrBackTop],
  template: `<wr-back-top><span class="custom-icon">↑</span></wr-back-top>`,
})
class IconHost {}

/**
 * Visibility is driven by a real `scroll` listener reading `window.scrollY`, both
 * of which jsdom provides — `scrollY` as a settable property, the event as one we
 * can dispatch. What jsdom has no opinion on is whether the hidden button is
 * reachable, and that was the bug: `aria-hidden` does not remove anything from
 * the tab order, so a keyboard reached an invisible, unannounceable control. The
 * attribute that does is `inert`, verified in a real Chromium (axe 4.13 agrees,
 * and `focus()` no longer lands) before it was written here.
 */
describe('WrBackTop', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let scroll: { to: ReturnType<typeof vi.fn>; toTop: ReturnType<typeof vi.fn> };

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-back-top')!;
  const button = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.wr-back-top__button')!;

  /** Put the page at `y` and let the listener react. */
  const scrollTo = (y: number): void => {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
  };

  const mount = (providers: unknown[] = []): void => {
    scroll = { to: vi.fn(), toTop: vi.fn() };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: WrScroll, useValue: scroll }, ...(providers as never[])],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    mount();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('starts hidden, and out of reach as well as out of sight', () => {
    // `aria-hidden` on its own left a focusable 44px button in the tab order.
    expect(host().className).toBe('wr-back-top');
    expect(host().getAttribute('aria-hidden')).toBe('true');
    expect(host().getAttribute('inert')).toBe('');
  });

  it('appears once the page is scrolled past the threshold', () => {
    scrollTo(401);

    expect(host().className).toContain('wr-back-top--visible');
    // `aria-hidden="false"` rather than no attribute is the existing contract
    // here; what has to go away is `inert`, since that is what gates the button.
    expect(host().getAttribute('aria-hidden')).toBe('false');
    expect(host().getAttribute('inert')).toBeNull();
  });

  it('stays hidden exactly at the threshold, and hides again on the way back up', () => {
    scrollTo(400);
    expect(host().className).not.toContain('wr-back-top--visible');

    scrollTo(500);
    expect(host().className).toContain('wr-back-top--visible');

    scrollTo(10);
    expect(host().className).not.toContain('wr-back-top--visible');
    expect(host().getAttribute('inert')).toBe('');
  });

  it('honours a threshold given as an attribute string, and refuses a negative one', () => {
    fixture.componentInstance.threshold.set(-100);
    fixture.detectChanges();
    scrollTo(1);

    // Floored at 0, so any scroll at all reveals it rather than none ever doing.
    expect(host().className).toContain('wr-back-top--visible');
  });

  it('is already visible when the page loads part way down', () => {
    Object.defineProperty(window, 'scrollY', { value: 900, configurable: true });
    mount();

    expect(host().className).toContain('wr-back-top--visible');
  });

  it('scrolls to the top with the offset it was given', () => {
    fixture.componentInstance.offset.set(80);
    fixture.detectChanges();
    button().click();

    expect(scroll.toTop).toHaveBeenCalledWith({ offset: 80 });
  });

  it('names the button, taking the consumer over the catalog', () => {
    expect(button().getAttribute('aria-label')).toBe('Back to top');

    fixture.componentInstance.ariaLabel.set('To the top');
    fixture.detectChanges();
    expect(button().getAttribute('aria-label')).toBe('To the top');
  });

  it('keeps the built-in arrow out of the accessible tree', () => {
    expect(button().querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('drops its listener when it goes away', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    fixture.destroy();

    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('listens to nothing on the server, and prerenders out of reach', () => {
    const add = vi.spyOn(window, 'addEventListener');
    mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(add).not.toHaveBeenCalledWith('scroll', expect.anything(), expect.anything());
    expect(host().getAttribute('inert')).toBe('');
  });
});

describe('WrBackTop with a projected icon', () => {
  it('replaces the built-in arrow rather than sitting next to it', () => {
    // The documented custom-icon example used to render both glyphs in one 44px
    // circle, because `<ng-content />` was a sibling of the default svg instead
    // of wrapping it as fallback content.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: WrScroll, useValue: { toTop: vi.fn() } }] });
    const fixture = TestBed.createComponent(IconHost);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('.wr-back-top__button')!;
    expect(button.querySelector('.custom-icon')).not.toBeNull();
    expect(button.querySelector('svg')).toBeNull();

    fixture.destroy();
  });
});

describe('WrBackTop under a localized catalog', () => {
  it('names the button from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: WrScroll, useValue: { toTop: vi.fn() } },
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('.wr-back-top__button')!;
    expect(button.getAttribute('aria-label')).toBeTruthy();
    expect(button.getAttribute('aria-label')).not.toBe('Back to top');

    fixture.destroy();
  });
});
