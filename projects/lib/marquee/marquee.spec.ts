import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrMarqueeItem } from './interfaces';
import { WrMarquee } from './marquee';

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
