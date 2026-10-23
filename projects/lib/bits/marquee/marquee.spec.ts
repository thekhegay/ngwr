import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, type TemplateRef, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrMarquee } from './marquee';
import type { WrMarqueeItem } from './types';

const ITEMS: readonly WrMarqueeItem[] = [
  { src: '/a.png', alt: 'Acme' },
  { src: '/b.png', alt: 'Beta', href: 'https://example.test' },
  { src: '/c.png', href: 'https://example.test/c' },
];

@Component({
  imports: [WrMarquee],
  template: `
    <wr-marquee
      [items]="items()"
      [ariaLabel]="ariaLabel()"
      [fadeOut]="fadeOut()"
      [gap]="gap()"
      [itemHeight]="itemHeight()"
    />
  `,
})
class Host {
  readonly items = signal<readonly WrMarqueeItem[]>(ITEMS);
  readonly ariaLabel = signal<string | null>(null);
  readonly fadeOut = signal(false);
  readonly gap = signal(32);
  readonly itemHeight = signal(28);
}

/**
 * The scroll itself is `requestAnimationFrame` over measured widths, and jsdom
 * measures everything as zero — so what is pinned here is the markup the loop
 * scrolls: the duplicated copies (only the first of which is in the accessible
 * tree), the names on links that have no text of their own, and the custom
 * properties the stylesheet reads.
 */
describe('WrMarquee', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-marquee')!;
  const lists = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-marquee__list')];
  /** Links in the FIRST copy only — the others are duplicates of these. */
  const links = (): HTMLAnchorElement[] => [...lists()[0].querySelectorAll<HTMLAnchorElement>('.wr-marquee__link')];

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('is a named region', () => {
    expect(host().getAttribute('role')).toBe('region');
    expect(host().getAttribute('aria-label')).toBe('Marquee');
  });

  it('takes a name from the consumer', () => {
    fixture.componentInstance.ariaLabel.set('Our customers');
    fixture.detectChanges();

    expect(host().getAttribute('aria-label')).toBe('Our customers');
  });

  it('repeats the list, and reads out only the first copy', () => {
    // The copies exist to make the loop seamless; announcing each one would read
    // the same logos three times over.
    expect(lists().length).toBeGreaterThan(1);
    expect(lists()[0].getAttribute('aria-hidden')).toBe('false');
    for (const copy of lists().slice(1)) expect(copy.getAttribute('aria-hidden')).toBe('true');
  });

  it('takes the duplicate copies out of the tab order, not just out of the reader', () => {
    // The two halves have to move together. Every item with an `href` renders an
    // anchor in EVERY copy, so `aria-hidden` alone left each duplicate focusable and
    // silent — an `aria-hidden-focus` violation, and the same link as N tab stops.
    expect(lists()[0].getAttribute('inert')).toBeNull();
    for (const copy of lists().slice(1)) {
      expect(copy.getAttribute('inert')).toBe('');
      expect(copy.querySelectorAll('.wr-marquee__link').length).toBeGreaterThan(0);
    }
  });

  it('renders every item in each copy', () => {
    expect(lists()[0].querySelectorAll('.wr-marquee__item').length).toBe(3);
  });

  it('names a link from its alt text, and falls back for one with none', () => {
    expect(links().length).toBe(2);
    expect(links()[0].getAttribute('aria-label')).toBe('Beta');
    // The fallback used to be the literal English word `link`, inline in the
    // template of a component with no other hard-coded text.
    expect(links()[1].getAttribute('aria-label')).toBe('link');
  });

  it('opens links safely', () => {
    expect(links()[0].getAttribute('target')).toBe('_blank');
    expect(links()[0].getAttribute('rel')).toBe('noreferrer noopener');
  });

  it('publishes the geometry the stylesheet reads', () => {
    expect(host().style.getPropertyValue('--wr-marquee-gap')).toBe('32px');
    expect(host().style.getPropertyValue('--wr-marquee-height')).toBe('28px');

    fixture.componentInstance.gap.set(8);
    fixture.componentInstance.itemHeight.set(64);
    fixture.detectChanges();
    expect(host().style.getPropertyValue('--wr-marquee-gap')).toBe('8px');
    expect(host().style.getPropertyValue('--wr-marquee-height')).toBe('64px');
  });

  it('takes the fade modifier only when asked', () => {
    expect(host().className).not.toContain('wr-marquee--fade');

    fixture.componentInstance.fadeOut.set(true);
    fixture.detectChanges();
    expect(host().className).toContain('wr-marquee--fade');
  });

  it('gives every image an alt attribute, empty when it is decoration', () => {
    const images = [...lists()[0].querySelectorAll('img')];
    expect(images.map(img => img.getAttribute('alt'))).toEqual(['Acme', 'Beta', '']);
  });

  it('renders nothing but the empty copies for an empty item list', () => {
    fixture.componentInstance.items.set([]);
    fixture.detectChanges();

    expect(root().querySelectorAll('.wr-marquee__item').length).toBe(0);
  });
});

@Component({
  imports: [WrMarquee],
  template: `
    <ng-template #tpl><span>Angular</span></ng-template>
    <wr-marquee [items]="items()" />
  `,
})
class NodeHost {
  readonly tpl = viewChild<TemplateRef<unknown>>('tpl');
  readonly items = signal<readonly WrMarqueeItem[]>([]);
}

/**
 * `title` is declared on BOTH entry kinds, and it used to reach the DOM on only
 * one of them: the image branch bound it and the node branch read it nowhere
 * but the link's accessible-name fallback, so `{ node: tpl, title: 'Angular' }`
 * showed no tooltip at all.
 */
describe('WrMarquee item tooltips', () => {
  it('writes a node item’s title onto the item it renders', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(NodeHost);
    fixture.detectChanges();

    fixture.componentInstance.items.set([{ node: fixture.componentInstance.tpl()!, title: 'Angular' }]);
    fixture.detectChanges();

    const node = (fixture.nativeElement as HTMLElement).querySelector('.wr-marquee__node')!;
    expect(node.getAttribute('title')).toBe('Angular');

    fixture.componentInstance.items.set([{ node: fixture.componentInstance.tpl()! }]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.wr-marquee__node')!.hasAttribute('title')).toBe(
      false
    );

    fixture.destroy();
  });

  it('writes an image item’s title onto the image', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.items.set([{ src: '/a.png', alt: 'Acme', title: 'Acme Inc.' }]);
    fixture.detectChanges();

    const img = (fixture.nativeElement as HTMLElement).querySelector('img')!;
    expect(img.getAttribute('title')).toBe('Acme Inc.');

    fixture.destroy();
  });
});

describe('WrMarquee under a localized catalog', () => {
  it('takes both its names from the catalog', async () => {
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

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('wr-marquee')!.getAttribute('aria-label')).not.toBe('Marquee');
    const unnamed = [...root.querySelectorAll('.wr-marquee__link')].filter(a => a.getAttribute('aria-label'))[1];
    expect(unnamed.getAttribute('aria-label')).not.toBe('link');

    fixture.destroy();
  });
});

/**
 * `[direction]` is deliberately not driven here, and this note is the record of
 * why rather than an omission.
 *
 * The input flips the SIGN of `targetVelocity`, which an animation loop then
 * integrates into a transform frame by frame. jsdom runs no frames and lays
 * nothing out, so the only thing a spec could reach is that a private computed
 * returned a negative number — which answers identically for a working
 * component and a broken one, and would still pass if the value never reached
 * the transform at all. It wants a browser; `check:state-a11y` drives the
 * component in one, and the visual half is a design review.
 */

/**
 * The loop itself is a frame callback over measured widths, so what is pinned is
 * WHEN it moves the track: never under `prefers-reduced-motion` — where the
 * stylesheet pins the track at 0 and every frame wrote a transform nobody saw —
 * with that preference read live, and not while the strip is off screen. One
 * sequence is measured at 300px so the loop has something to wrap at; the
 * frames are held and run by hand, Angular's own scheduler frames among them.
 */
describe('WrMarquee frame loop', () => {
  let frames: Map<number, FrameRequestCallback>;
  let nextId: number;
  let clock: number;
  const reduced = signal(false);
  let observed: ((entries: { isIntersecting: boolean }[]) => void) | null;
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const track = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector('.wr-marquee__track')!;
  const mount = async (): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: WrPlatform, useValue: { isBrowser: true, prefersReducedMotion: reduced } }],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
  };
  /** Run every held frame a few times, 100ms apart; `true` when the track moved. */
  const moves = (): boolean => {
    const before = track().style.transform;
    for (let i = 0; i < 3; i++) {
      const pending = [...frames.values()];
      frames.clear();
      clock += 100;
      for (const frame of pending) frame(clock);
    }
    return track().style.transform !== before;
  };

  beforeEach(() => {
    frames = new Map();
    nextId = 0;
    clock = 0;
    observed = null;
    reduced.set(false);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(frame => {
      frames.set(++nextId, frame);
      return nextId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => void frames.delete(id));
    const empty = { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 } as DOMRect;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return this.classList.contains('wr-marquee__list') ? { ...empty, width: 300 } : empty;
    });
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('moves the track while motion is allowed', async () => {
    await mount();
    expect(moves()).toBe(true);
    expect(moves()).toBe(true);
  });

  it('never moves it under reduced motion', async () => {
    reduced.set(true);
    await mount();
    expect(moves()).toBe(false);
    expect(track().style.transform).toBe('');
  });

  it('stops when reduced motion is switched on while the page is open', async () => {
    await mount();
    expect(moves()).toBe(true);

    reduced.set(true);
    await fixture.whenStable();

    expect(track().style.transform).toBe('');
    expect(moves()).toBe(false);

    reduced.set(false);
    await fixture.whenStable();
    expect(moves()).toBe(true);
  });

  it('parks off screen and resumes in view', async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          observed = callback;
        }
        observe(): void {
          // The test drives the callback by hand.
        }
        disconnect(): void {
          observed = null;
        }
      }
    );
    await mount();
    expect(moves()).toBe(true);

    observed!([{ isIntersecting: false }]);
    await fixture.whenStable();
    expect(moves()).toBe(false);

    observed!([{ isIntersecting: true }]);
    await fixture.whenStable();
    expect(moves()).toBe(true);
  });
});

/**
 * Under reduced motion the loop stops, and a frozen `overflow: hidden` strip used
 * to leave every item past the edge out of reach for good. It becomes a scroller
 * instead: one copy (the duplicates hide the seam of a loop that is not running),
 * the `--static` modifier the stylesheet scrolls on, and a tab stop on the region
 * when no item has one — a scroll container the keyboard cannot reach cannot be
 * scrolled from it. The scrolling itself is CSS and is measured in a browser; what
 * is pinned here is the markup it rests on, followed live.
 */
describe('WrMarquee under reduced motion', () => {
  const reduced = signal(true);
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-marquee')!;
  const lists = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-marquee__list')];

  const mount = async (items: readonly WrMarqueeItem[] = ITEMS): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: WrPlatform, useValue: { isBrowser: true, prefersReducedMotion: reduced } }],
    });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.items.set(items);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => reduced.set(true));
  afterEach(() => fixture.destroy());

  it('renders one copy, in the accessible tree and out of none', async () => {
    await mount();

    expect(lists().length).toBe(1);
    expect(lists()[0].getAttribute('aria-hidden')).toBe('false');
    expect(lists()[0].hasAttribute('inert')).toBe(false);
    expect(host().classList.contains('wr-marquee--static')).toBe(true);
  });

  it('gives the region a tab stop when no item takes one', async () => {
    await mount([
      { src: '/a.png', alt: 'Acme' },
      { src: '/b.png', alt: 'Beta' },
    ]);

    // Named already — it is the region — so the stop announces the strip.
    expect(host().getAttribute('tabindex')).toBe('0');
    expect(host().getAttribute('aria-label')).toBe('Marquee');
  });

  it('leaves the stops to the items when they have them', async () => {
    await mount();

    expect(lists()[0].querySelectorAll('a[href]').length).toBeGreaterThan(0);
    expect(host().hasAttribute('tabindex')).toBe(false);
  });

  it('follows the preference switched while the page is open', async () => {
    await mount([{ src: '/a.png', alt: 'Acme' }]);

    reduced.set(false);
    await fixture.whenStable();
    expect(lists().length).toBeGreaterThanOrEqual(2);
    expect(host().classList.contains('wr-marquee--static')).toBe(false);
    expect(host().hasAttribute('tabindex')).toBe(false);

    reduced.set(true);
    await fixture.whenStable();
    expect(lists().length).toBe(1);
    expect(host().getAttribute('tabindex')).toBe('0');
  });

  // An `overflow: hidden` host keeps a scroll offset, so a strip scrolled while
  // static would start its loop shifted, its edge fades placed mid-strip.
  it('scrolls back to the start when the loop resumes', async () => {
    await mount([{ src: '/a.png', alt: 'Acme' }]);
    host().scrollLeft = 200;

    reduced.set(false);
    await fixture.whenStable();

    expect(host().classList.contains('wr-marquee--static')).toBe(false);
    expect(host().scrollLeft).toBe(0);
  });
});

interface Sass {
  compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
}

/** The compiled stylesheet, comments stripped — jsdom has no cascade, so CSS is read as text. */
const compiledCss = (): string => {
  const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;
  return sass
    .compileString("@use 'bits/marquee/styles';", {
      loadPaths: [join(process.cwd(), 'projects/lib')],
      style: 'expanded',
    })
    .css.replace(/\/\*[\s\S]*?\*\//g, '');
};

/** The declarations of the first rule whose selector is exactly `selector`. */
const ruleIn = (css: string, selector: string): string =>
  new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.()>:]/g, m => `\\${m}`)}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';

/**
 * The static strip's half that lives in the stylesheet: the host scrolls, and the
 * edge fades — absolutely placed inside what is now the scroll container — are
 * dropped rather than left to scroll away or to veil the first and last items.
 * Measured in Chromium with reduced motion emulated; held here against the CSS.
 */
describe('WrMarquee static stylesheet', () => {
  const css = compiledCss();

  it('scrolls the static strip and drops the fades that would cover its ends', () => {
    expect(ruleIn(css, '.wr-marquee--static')).toMatch(/overflow-x:\s*auto/);
    expect(css).toMatch(/\.wr-marquee--static::before,\s*\.wr-marquee--static::after\s*\{\s*display:\s*none/);
  });
});

/**
 * Which edge the over-wide track sticks to is decided by the HOST's direction, so
 * the physical loop holds the host to LTR and gives each item the page's
 * direction back. jsdom has no cascade or layout, so this is held against the
 * compiled CSS; the coverage itself was measured in Chromium under `dir="rtl"`.
 */
describe('WrMarquee under RTL', () => {
  const css = compiledCss();
  const rule = (selector: string): string => ruleIn(css, selector);

  it('keeps the strip physical and the items in the page direction', () => {
    expect(rule('.wr-marquee')).toMatch(/direction:\s*ltr/);
    expect(rule('.wr-marquee__item:dir(rtl)')).toMatch(/direction:\s*rtl/);
  });
});
