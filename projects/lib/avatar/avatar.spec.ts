import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('publishes the resolved box as --wr-avatar-size, for px and for rem', () => {
    // What the stylesheet sizes projected initials against. Read off the style
    // attribute the host wrote, never a computed value, which would answer with
    // nothing in jsdom and prove nothing either way.
    const published = (): string => host().style.getPropertyValue('--wr-avatar-size');
    expect(published()).toBe('6rem');

    const cases: readonly (readonly [WrAvatarSize, string])[] = [
      [16, '16px'],
      ['24', '24px'],
      ['20px', '20px'],
      ['1.5rem', '1.5rem'],
    ];
    for (const [size, css] of cases) {
      fixture.componentInstance.size.set(size);
      fixture.detectChanges();
      expect(published()).toBe(css);
      // The same value as the box itself, so the share is always of the real size.
      expect(host().style.width).toBe(css);
    }

    // A refused size falls back with the box, never to a value with no pixels.
    fixture.componentInstance.size.set(0);
    fixture.detectChanges();
    expect(published()).toBe('6rem');
  });
});

/**
 * Projected initials are the FALLBACK, not a sibling of the photo. They used to
 * render in flow beside the `<img>` in every state, so a loaded avatar showed
 * the initials squeezed next to the picture and a reader heard the name twice.
 *
 * jsdom loads no stylesheet, so what is PAINTED is read through the hooks the
 * stylesheet keys on — the `--loaded` modifier together with the wrapper's
 * `aria-hidden` (hidden when named, clipped when not), and whether
 * `.wr-avatar__content` is `:empty` (the spinner is dropped when it is not);
 * `the avatar stylesheet` below pins the rules themselves. What is ANNOUNCED is
 * read straight off the DOM: text and `alt` outside any `aria-hidden` subtree.
 */
describe('WrAvatar projected fallback', () => {
  @Component({
    imports: [WrAvatar],
    template: `
      <wr-avatar [url]="url()" [alt]="alt()" [size]="32" shape="circle">
        @if (initials()) {
          ХР
        }
      </wr-avatar>
    `,
  })
  class FallbackHost {
    readonly url = signal<string | null>(null);
    readonly alt = signal<string | null>('Хегай Роман');
    readonly initials = signal(true);
  }

  let fixture: ReturnType<typeof TestBed.createComponent<FallbackHost>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-avatar')!;
  const content = (): HTMLElement => host().querySelector<HTMLElement>('.wr-avatar__content')!;
  const img = (): HTMLImageElement | null => host().querySelector<HTMLImageElement>('.wr-avatar__img');
  const spinner = (): HTMLElement | null => host().querySelector<HTMLElement>('.wr-avatar__spin');
  const loaded = (): boolean => host().classList.contains('wr-avatar--loaded');

  /** Every text and `alt` an assistive technology reaches, in document order. */
  const announced = (): string[] => {
    const out: string[] = [];
    const walk = (node: Node): void => {
      if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') return;
      if (node instanceof HTMLImageElement) out.push(node.alt);
      else if (node.nodeType === Node.TEXT_NODE && node.textContent!.trim()) out.push(node.textContent!.trim());
      node.childNodes.forEach(walk);
    };
    walk(host());
    return out;
  };

  const setUrl = async (url: string | null): Promise<void> => {
    fixture.componentInstance.url.set(url);
    await fixture.whenStable();
  };
  const fire = async (type: 'load' | 'error'): Promise<void> => {
    img()!.dispatchEvent(new Event(type));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(FallbackHost);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('with no url, shows the initials and announces them once', () => {
    expect(img()).toBeNull();
    expect(spinner()).toBeNull();
    expect(loaded()).toBe(false);
    expect(content().textContent.trim()).toBe('ХР');
    expect(content().hasAttribute('aria-hidden')).toBe(false);
    expect(announced()).toEqual(['ХР']);
  });

  it('while loading, paints the initials but lets the image own the name', async () => {
    await setUrl('/me.png');

    expect(img()!.getAttribute('src')).toBe('/me.png');
    // Not `--loaded`, so the stylesheet still paints the fallback under the
    // transparent image…
    expect(loaded()).toBe(false);
    // …and it is not empty, so the spinner that would be drawn across the
    // letters is dropped by `.wr-avatar__content:not(:empty) ~ .wr-avatar__spin`.
    expect(content().matches(':empty')).toBe(false);
    expect(spinner()).not.toBeNull();
    expect(content().getAttribute('aria-hidden')).toBe('true');
    expect(announced()).toEqual(['Хегай Роман']);
  });

  it('once loaded, hides the initials and announces only the alt', async () => {
    await setUrl('/me.png');
    await fire('load');

    expect(loaded()).toBe(true);
    expect(spinner()).toBeNull();
    expect(content().getAttribute('aria-hidden')).toBe('true');
    expect(announced()).toEqual(['Хегай Роман']);
  });

  it('after a failure, drops the image and announces the initials once', async () => {
    await setUrl('/broken.png');
    await fire('error');

    expect(img()).toBeNull();
    expect(spinner()).toBeNull();
    expect(loaded()).toBe(false);
    expect(content().hasAttribute('aria-hidden')).toBe(false);
    expect(announced()).toEqual(['ХР']);
  });

  it('shows the initials again while a second image loads', async () => {
    await setUrl('/me.png');
    await fire('load');
    await setUrl('/other.png');

    expect(img()!.getAttribute('src')).toBe('/other.png');
    expect(loaded()).toBe(false);
    expect(content().getAttribute('aria-hidden')).toBe('true');
    expect(announced()).toEqual(['Хегай Роман']);

    await fire('load');
    expect(loaded()).toBe(true);
  });

  it('goes from a failed image to a good one', async () => {
    await setUrl('/broken.png');
    await fire('error');
    expect(announced()).toEqual(['ХР']);

    await setUrl('/me.png');
    expect(img()!.getAttribute('src')).toBe('/me.png');
    expect(loaded()).toBe(false);
    expect(announced()).toEqual(['Хегай Роман']);

    await fire('load');
    expect(loaded()).toBe(true);
    expect(announced()).toEqual(['Хегай Роман']);
  });

  it('returns to the fallback when the url is cleared after a load', async () => {
    await setUrl('/me.png');
    await fire('load');
    await setUrl(null);

    expect(img()).toBeNull();
    expect(loaded()).toBe(false);
    expect(content().hasAttribute('aria-hidden')).toBe(false);
    expect(announced()).toEqual(['ХР']);
  });

  it('keeps the spinner when nothing is projected, even through an empty @if', async () => {
    // A control-flow block that renders nothing still projects its anchor
    // comment, and `:empty` ignores comments — so the spinner survives.
    fixture.componentInstance.initials.set(false);
    await setUrl('/me.png');

    expect(content().matches(':empty')).toBe(true);
    expect(spinner()).not.toBeNull();
    expect(announced()).toEqual(['Хегай Роман']);
  });

  it('without an alt, keeps the initials announced while an image is in play', async () => {
    // The image is only "Avatar" then, and the initials are the one thing that
    // says who this is — hiding them used to leave a reader with the generic name
    // alone from the moment a url was set.
    fixture.componentInstance.alt.set(null);
    await setUrl('/me.png');

    expect(img()!.alt).toBe('Avatar');
    expect(content().hasAttribute('aria-hidden')).toBe(false);
    expect(announced()).toEqual(['ХР', 'Avatar']);

    await fire('load');
    // Loaded, the stylesheet clips `:not([aria-hidden='true'])` rather than
    // hiding it, so the initials leave the paint and stay in the tree.
    expect(loaded()).toBe(true);
    expect(content().hasAttribute('aria-hidden')).toBe(false);
    expect(announced()).toEqual(['ХР', 'Avatar']);
  });

  it('treats a blank alt as no name at all', async () => {
    fixture.componentInstance.alt.set('   ');
    await setUrl('/me.png');

    expect(content().hasAttribute('aria-hidden')).toBe(false);
  });

  /**
   * A prerendered `<img>` can settle before hydration attaches `(load)` and
   * `(error)`. jsdom never loads an image, so the settled element is stubbed on
   * the prototype and the avatar is rendered with its url from the first pass,
   * the way a hydrated one is — and no event is dispatched by the spec.
   */
  describe('with an image that settled before its listeners existed', () => {
    const renderWithUrl = async (url: string): Promise<void> => {
      fixture.destroy();
      fixture = TestBed.createComponent(FallbackHost);
      fixture.componentInstance.url.set(url);
      await fixture.whenStable();
    };

    afterEach(() => vi.restoreAllMocks());

    it('adopts an image that already loaded', async () => {
      vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
      vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(256);

      await renderWithUrl('/me.png');

      expect(loaded()).toBe(true);
      expect(spinner()).toBeNull();
      expect(announced()).toEqual(['Хегай Роман']);
    });

    it('asks a settled image with no size to report again, and falls back when it is broken', async () => {
      vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
      vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);
      const replays: string[] = [];
      vi.spyOn(Element.prototype, 'setAttribute').mockImplementation(function (
        this: Element,
        name: string,
        value: string
      ) {
        this.setAttributeNS(null, name, value);
        if (!(this instanceof HTMLImageElement) || name !== 'src') return;
        // What a browser does with the same `src` again: it reports the broken
        // image a second time, to listeners that now exist.
        replays.push(value);
        queueMicrotask(() => this.dispatchEvent(new Event('error')));
      });

      await renderWithUrl('/broken.png');
      await fixture.whenStable();

      expect(replays).toEqual(['/broken.png']);
      expect(img()).toBeNull();
      expect(loaded()).toBe(false);
      expect(announced()).toEqual(['ХР']);
    });

    it('leaves an image still in flight to its own events', async () => {
      vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
      const replay = vi.spyOn(Element.prototype, 'setAttribute');

      await renderWithUrl('/me.png');

      expect(loaded()).toBe(false);
      expect(replay).not.toHaveBeenCalledWith('src', expect.anything());
      await fire('load');
      expect(loaded()).toBe(true);
    });
  });
});

/** Every rule in the avatar stylesheet, selector to declarations — read from source, see below. */
const rules = (): Map<string, Record<string, string>> => {
  const source = readFileSync(join(process.cwd(), 'projects/lib/avatar/styles/_index.scss'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/[^\n]*/g, '$1');
  const out = new Map<string, Record<string, string>>();
  const stack: string[] = [];
  let buffer = '';
  for (const ch of source) {
    if (ch === '{') {
      const head = buffer.trim();
      const parent = stack.at(-1);
      stack.push(parent === undefined ? head : head.includes('&') ? head.replaceAll('&', parent) : `${parent} ${head}`);
      buffer = '';
    } else if (ch === ';' || ch === '}') {
      const statement = buffer.trim();
      const selector = stack.at(-1);
      const colon = statement.indexOf(':');
      if (selector !== undefined && colon > 0 && !statement.startsWith('@')) {
        out.set(selector, {
          ...out.get(selector),
          [statement.slice(0, colon).trim()]: statement.slice(colon + 1).trim(),
        });
      }
      if (ch === '}') stack.pop();
      buffer = '';
    } else {
      buffer += ch;
    }
  }
  return out;
};

/**
 * The half of the fallback contract that lives in the stylesheet. jsdom applies
 * no stylesheet, so the specs above can only read the hooks these rules key on —
 * without this block every one of them passes on the stylesheet that squeezed
 * the initials beside the photo. A SOURCE read, like `theme/styles.spec.ts`:
 * nesting and `&` are resolved by hand, which is all Sass this one file uses.
 */
describe('the avatar stylesheet', () => {
  it('is read at all', () => {
    expect(rules().get('.wr-avatar')).toMatchObject({ display: 'inline-flex', position: 'relative' });
  });

  it('lays the image over the fallback rather than beside it', () => {
    expect(rules().get('.wr-avatar__content')).toMatchObject({ display: 'contents' });
    expect(rules().get('.wr-avatar__img')).toMatchObject({ position: 'absolute', inset: '0' });
  });

  it('takes a named fallback out of the paint once loaded', () => {
    expect(rules().get(".wr-avatar--loaded .wr-avatar__content[aria-hidden='true']")).toMatchObject({
      visibility: 'hidden',
    });
  });

  it('clips an unnamed fallback once loaded, keeping it in the accessibility tree', () => {
    const unnamed = rules().get(".wr-avatar--loaded .wr-avatar__content:not([aria-hidden='true'])");

    expect(unnamed).toMatchObject({ position: 'absolute', overflow: 'hidden', 'clip-path': 'inset(50%)' });
    // Either of these would silence the initials the rule exists to keep.
    expect(unnamed).not.toHaveProperty('visibility');
    expect(unnamed?.['display']).not.toBe('none');
  });

  it('draws no spinner over projected content', () => {
    expect(rules().get('.wr-avatar__content:not(:empty) ~ .wr-avatar__spin')).toMatchObject({ display: 'none' });
  });
});

/**
 * Projected initials took the text size around the avatar whatever its own size
 * was, so a 16px avatar in a 14px chip drew 14px letters clipped by its edge and
 * read as crossed out. They now take the SMALLER of that size and a share of the
 * box.
 *
 * What jsdom cannot prove: it applies no stylesheet and lays nothing out, so no
 * spec here computes a font size or measures whether two letters fit a circle.
 * That half was measured in Chromium against a build of the previous release —
 * a 16px chip, a 24px option row, a 16px tag and a 6rem profile avatar, light
 * and dark, with and without `ngwr/reset` — where every small case went from
 * clipped to inside the circle and the 6rem one stayed identical to the pixel.
 * What these pin is everything that result depends on: the declarations, the
 * published hook they read, and the selector that decides where they apply.
 */
describe('the avatar initials scale', () => {
  // `:where()` around the whole selector, so it carries no specificity and any
  // unlayered `font-size` rule a consumer writes for the avatar still wins.
  const GUARD = ':where(.wr-avatar:has(> .wr-avatar__content:not(:empty)))';

  it('publishes the share as an overridable hook on the block', () => {
    expect(rules().get('.wr-avatar')).toMatchObject({ '--wr-avatar-initials-scale': '0.375' });
  });

  it('never grows the initials past the inherited size, and reads the published box', () => {
    // `1em` in `font-size` is the PARENT's size: wherever that already fits, the
    // minimum is exactly it, which is what leaves a 6rem avatar untouched.
    expect(rules().get(GUARD)).toEqual({
      'font-size': 'min(1em, var(--wr-avatar-size) * var(--wr-avatar-initials-scale))',
    });
  });

  it('sets no font size on the bare block, where the spinner would inherit it', () => {
    // The spinner is drawn only when nothing is projected and sizes itself in
    // `em`; a size on `.wr-avatar` itself would shrink it in every small avatar.
    expect(rules().get('.wr-avatar')).not.toHaveProperty('font-size');
    expect(rules().get('.wr-avatar__content')).not.toHaveProperty('font-size');
  });

  it('makes the initials inert, and leaves their leading and wrapping inherited', () => {
    expect(rules().get('.wr-avatar__content')).toMatchObject({
      display: 'contents',
      'user-select': 'none',
      'pointer-events': 'none',
    });
    // Both inherit anyway. Set here, they changed a 6rem avatar: a longer
    // fallback stopped wrapping and was clipped, and a projected span moved.
    expect(rules().get('.wr-avatar__content')).not.toHaveProperty('line-height');
    expect(rules().get('.wr-avatar__content')).not.toHaveProperty('white-space');
  });

  describe('the selector the scale applies under', () => {
    @Component({
      imports: [WrAvatar],
      template: `
        <wr-avatar class="with" [size]="16" shape="circle">{{ initials() }}</wr-avatar>
        <wr-avatar class="guarded" [size]="16" shape="circle">
          @if (show()) {
            ХР
          }
        </wr-avatar>
        <wr-avatar class="bare" url="/me.png" [size]="16" shape="circle" />
      `,
    })
    class GuardHost {
      readonly initials = signal('ХР');
      readonly show = signal(false);
    }

    let fixture: ReturnType<typeof TestBed.createComponent<GuardHost>>;
    const avatar = (cls: string): HTMLElement =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`wr-avatar.${cls}`)!;

    beforeEach(async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      fixture = TestBed.createComponent(GuardHost);
      await fixture.whenStable();
    });

    afterEach(() => fixture.destroy());

    it('matches an avatar with projected initials', () => {
      expect(avatar('with').matches(GUARD)).toBe(true);
    });

    it('does not match one drawing its spinner, even through an empty @if', async () => {
      expect(avatar('bare').matches(GUARD)).toBe(false);
      expect(avatar('bare').querySelector('.wr-avatar__spin')).not.toBeNull();
      expect(avatar('guarded').matches(GUARD)).toBe(false);

      fixture.componentInstance.show.set(true);
      await fixture.whenStable();
      expect(avatar('guarded').matches(GUARD)).toBe(true);
    });
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
