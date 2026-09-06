import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrAvatar } from './avatar';
import type { WrAvatarShape, WrAvatarSize } from './interfaces';

@Component({
  imports: [WrAvatar],
  template: `
    <wr-avatar [url]="url()" [alt]="alt()" [shape]="shape()" [size]="size()">
      <span class="initials">AL</span>
    </wr-avatar>
  `,
})
class Host {
  readonly url = signal<string | null>('/me.png');
  readonly alt = signal<string | null>(null);
  readonly shape = signal<WrAvatarShape>('rounded');
  readonly size = signal<WrAvatarSize>('6rem');
}

/**
 * jsdom never fetches the image, so `load` and `error` are dispatched by hand —
 * which is the honest way to test both, since the interesting state is the one
 * where the network said no.
 */
describe('WrAvatar', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-avatar')!;
  const img = (): HTMLImageElement | null => root().querySelector<HTMLImageElement>('.wr-avatar__img');
  const spinner = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-avatar__spin');
  const fire = (type: 'load' | 'error'): void => {
    img()!.dispatchEvent(new Event(type));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the image at the resolved size, with a spinner over it', () => {
    expect(img()!.getAttribute('src')).toBe('/me.png');
    expect(host().style.width).toBe('6rem');
    expect(host().style.height).toBe('6rem');
    expect(img()!.getAttribute('width')).toBe('96');
    expect(spinner()).not.toBeNull();
  });

  it('drops the spinner once the image is there', () => {
    fire('load');

    expect(spinner()).toBeNull();
    expect(host().className).toContain('wr-avatar--loaded');
  });

  it('falls back to the projected content when the image fails', () => {
    // The spinner used to spin forever on a broken URL, on top of the very
    // initials that exist for this case.
    fire('error');

    expect(spinner()).toBeNull();
    expect(img()).toBeNull();
    expect(root().querySelector('.initials')!.textContent).toBe('AL');
  });

  it('tries again when a new url arrives after a failure', () => {
    fire('error');
    expect(img()).toBeNull();

    fixture.componentInstance.url.set('/other.png');
    fixture.detectChanges();

    expect(img()!.getAttribute('src')).toBe('/other.png');
    expect(spinner()).not.toBeNull();
  });

  it('shows the spinner again for a second image', () => {
    fire('load');
    fixture.componentInstance.url.set('/other.png');
    fixture.detectChanges();

    expect(spinner()).not.toBeNull();
    expect(host().className).not.toContain('wr-avatar--loaded');
  });

  it('renders only the projected content with no url', () => {
    fixture.componentInstance.url.set(null);
    fixture.detectChanges();

    expect(img()).toBeNull();
    expect(spinner()).toBeNull();
    expect(root().querySelector('.initials')).not.toBeNull();
  });

  it('names the image, taking the consumer over the catalog fallback', () => {
    expect(img()!.getAttribute('alt')).toBe('Avatar');

    fixture.componentInstance.alt.set('Ada Lovelace');
    fixture.detectChanges();
    expect(img()!.getAttribute('alt')).toBe('Ada Lovelace');
  });

  it('carries the shape as a modifier, with none for the default', () => {
    expect(host().className).toBe('wr-avatar');

    for (const shape of ['circle', 'squircle'] as const) {
      fixture.componentInstance.shape.set(shape);
      fixture.detectChanges();
      expect(host().className).toContain(`wr-avatar--${shape}`);
    }
  });

  it('accepts a bare number as pixels', () => {
    fixture.componentInstance.size.set(48);
    fixture.detectChanges();

    expect(host().style.width).toBe('48px');
    expect(img()!.getAttribute('width')).toBe('48');
  });

  it('refuses a size that would collapse the box', () => {
    for (const size of [0, -20] as const) {
      fixture.componentInstance.size.set(size);
      fixture.detectChanges();
      expect(host().style.width).toBe('6rem');
    }
  });
});

describe('WrAvatar under a localized catalog', () => {
  it('names the image from the catalog', async () => {
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

    const img = (fixture.nativeElement as HTMLElement).querySelector('.wr-avatar__img')!;
    expect(img.getAttribute('alt')).toBe('Аватар');

    fixture.destroy();
  });
});

/**
 * Every documented `[shape]`. `square` was the one with no spec naming it, which
 * is exactly the value a refactor drops without a compiler noticing.
 */
describe('WrAvatar emits a modifier for every documented shape', () => {
  @Component({ imports: [WrAvatar], template: `<wr-avatar [shape]="shape()" name="Ada" />` })
  class ShapeHost {
    readonly shape = signal<WrAvatarShape>('circle');
  }

  const SHAPES: readonly WrAvatarShape[] = ['rounded', 'square', 'circle', 'squircle'];
  let fixture: ReturnType<typeof TestBed.createComponent<ShapeHost>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrI18n(), provideWrI18nStaticLoader({})] });
    fixture = TestBed.createComponent(ShapeHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  // `rounded` is the default and emits no modifier of its own — the base class
  // is already that shape. The other three each add one.
  it.each(SHAPES)('shape %s', shape => {
    fixture.componentInstance.shape.set(shape);
    fixture.detectChanges();
    const el = (fixture.nativeElement as HTMLElement).querySelector('wr-avatar')!;
    if (shape === 'rounded') expect(el.className).not.toMatch(/wr-avatar--(square|circle|squircle)/);
    else expect(el.classList).toContain(`wr-avatar--${shape}`);
  });
});
