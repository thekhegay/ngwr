import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrAvatar } from './avatar';
import type { WrAvatarShape, WrAvatarSize } from './types';

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

  it('stays silent with alt="", the way an <img> marks itself decorative', async () => {
    // `useI18nText` reads '' as unset, so the image used to be announced as "Avatar"
    // beside a name already printed next to it.
    fixture.componentInstance.alt.set('');
    await setUrl('/me.png');

    expect(img()!.getAttribute('alt')).toBe('');
    expect(content().getAttribute('aria-hidden')).toBe('true');
    expect(announced().filter(Boolean)).toEqual([]);
  });

  describe('after a failure', () => {
    const alt = (): HTMLElement | null => host().querySelector<HTMLElement>('.wr-avatar__alt');
    /** The stylesheet's rule that hides the failed image's name when initials are projected. */
    const HIDDEN_BY_INITIALS = '.wr-avatar__content:not(:empty) ~ .wr-avatar__alt';

    it('still names an avatar that has nothing projected', async () => {
      // The broken <img> is removed so the fallback can show, and its alt went with
      // it, leaving an empty box with no name at all.
      fixture.componentInstance.initials.set(false);
      await setUrl('/broken.png');
      await fire('error');

      expect(alt()!.getAttribute('role')).toBe('img');
      expect(alt()!.getAttribute('aria-label')).toBe('Хегай Роман');
      expect(alt()!.matches(HIDDEN_BY_INITIALS)).toBe(false);
    });

    it('leaves the naming to the initials when there are some', async () => {
      await setUrl('/broken.png');
      await fire('error');

      expect(alt()!.matches(HIDDEN_BY_INITIALS)).toBe(true);
      expect(announced()).toEqual(['ХР']);
    });

    it('hides that name with display: none, which takes it out of the tree too', () => {
      interface Sass {
        compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
      }
      const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;
      const css = sass.compileString("@use 'avatar/styles';", {
        loadPaths: [join(process.cwd(), 'projects/lib')],
        style: 'expanded',
      }).css;

      expect(css).toMatch(/\.wr-avatar__content:not\(:empty\) ~ \.wr-avatar__alt \{\s*display: none;/);
    });

    it('says nothing for a decorative avatar', async () => {
      fixture.componentInstance.initials.set(false);
      fixture.componentInstance.alt.set('');
      await setUrl('/broken.png');
      await fire('error');

      expect(alt()).toBeNull();
    });
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
 * What this holds is the selector that decides where the scale applies.
 */
describe('the avatar initials scale', () => {
  // `:where()` around the whole selector, so it carries no specificity and any
  // unlayered `font-size` rule a consumer writes for the avatar still wins.
  const GUARD = ':where(.wr-avatar:has(> .wr-avatar__content:not(:empty), > .wr-avatar__initials))';

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
        <wr-avatar class="named" [name]="name()" [size]="16" shape="circle" />
      `,
    })
    class GuardHost {
      readonly initials = signal('ХР');
      readonly show = signal(false);
      readonly name = signal<string | null>('Хегай Роман');
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

    it('matches an avatar drawing the initials of its name, and not one whose name yields none', async () => {
      expect(avatar('named').matches(GUARD)).toBe(true);

      fixture.componentInstance.name.set('...');
      await fixture.whenStable();
      expect(avatar('named').matches(GUARD)).toBe(false);
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

/**
 * `name` is one input for the three things a consumer used to write by hand:
 * the alt, the initials and a colour. The initials sit AFTER the projected
 * fallback and before the spinner; jsdom applies no stylesheet, so where they
 * stand in the paint is read through the selectors the stylesheet keys on, and
 * the rules themselves are compiled and pinned at the end.
 */
describe('WrAvatar name', () => {
  @Component({
    imports: [WrAvatar],
    template: `
      <wr-avatar [url]="url()" [alt]="alt()" [name]="name()" [tint]="tint()" [size]="32" shape="circle">
        @if (projected()) {
          ХР
        }
      </wr-avatar>
    `,
  })
  class NameHost {
    readonly url = signal<string | null>(null);
    readonly alt = signal<string | null>(null);
    readonly name = signal<string | null>('Ada Lovelace');
    readonly tint = signal(false);
    readonly projected = signal(false);
  }

  let fixture: ReturnType<typeof TestBed.createComponent<NameHost>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-avatar')!;
  const initials = (): HTMLElement | null => host().querySelector<HTMLElement>('.wr-avatar__initials');
  const img = (): HTMLImageElement | null => host().querySelector<HTMLImageElement>('.wr-avatar__img');
  const spinner = (): HTMLElement | null => host().querySelector<HTMLElement>('.wr-avatar__spin');
  const alt = (): HTMLElement | null => host().querySelector<HTMLElement>('.wr-avatar__alt');
  const tintClass = (): string | undefined => [...host().classList].find(c => c.startsWith('wr-avatar--tint-'));

  /** The stylesheet's rules that drop a later sibling once the initials stand. */
  const HIDDEN_BY_PROJECTED = '.wr-avatar__content:not(:empty) ~ .wr-avatar__initials';
  const HIDDEN_BY_INITIALS = '.wr-avatar__initials ~ *';

  /** Every text, `alt` and `aria-label` an assistive technology reaches, in document order. */
  const announced = (): string[] => {
    const out: string[] = [];
    const walk = (node: Node): void => {
      if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') return;
      if (node instanceof HTMLImageElement) out.push(node.alt);
      else if (node instanceof Element && node.getAttribute('role') === 'img')
        out.push(node.getAttribute('aria-label')!);
      else if (node.nodeType === Node.TEXT_NODE && node.textContent!.trim()) out.push(node.textContent!.trim());
      if (!(node instanceof Element && node.getAttribute('role') === 'img')) node.childNodes.forEach(walk);
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
    fixture = TestBed.createComponent(NameHost);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('draws the initials, named by the person rather than by the letters', () => {
    expect(initials()!.textContent).toBe('AL');
    expect(initials()!.getAttribute('role')).toBe('img');
    expect(initials()!.getAttribute('aria-label')).toBe('Ada Lovelace');
    expect(initials()!.hasAttribute('aria-hidden')).toBe(false);
    expect(spinner()).toBeNull();
    expect(announced()).toEqual(['Ada Lovelace']);
  });

  it('names the image, and alt wins when both are given', async () => {
    await setUrl('/me.png');
    expect(img()!.getAttribute('alt')).toBe('Ada Lovelace');

    fixture.componentInstance.alt.set('Countess of Lovelace');
    await fixture.whenStable();
    expect(img()!.getAttribute('alt')).toBe('Countess of Lovelace');
    expect(initials()!.getAttribute('aria-label')).toBe('Countess of Lovelace');
  });

  it('lets alt="" mark the avatar decorative over the name', async () => {
    fixture.componentInstance.alt.set('');
    await fixture.whenStable();
    expect(initials()!.getAttribute('aria-hidden')).toBe('true');
    expect(announced()).toEqual([]);

    await setUrl('/me.png');
    expect(img()!.getAttribute('alt')).toBe('');
    expect(announced().filter(Boolean)).toEqual([]);
  });

  it('lets the image own the name while it is in play, and shows the initials again after a failure', async () => {
    await setUrl('/me.png');
    expect(initials()!.getAttribute('aria-hidden')).toBe('true');
    // Drawn, and dropped by the stylesheet the way it is behind projected content.
    expect(spinner()!.matches(HIDDEN_BY_INITIALS)).toBe(true);
    expect(announced()).toEqual(['Ada Lovelace']);

    await fire('load');
    expect(host().classList).toContain('wr-avatar--loaded');
    expect(initials()!.getAttribute('aria-hidden')).toBe('true');
    expect(announced()).toEqual(['Ada Lovelace']);

    await setUrl('/broken.png');
    await fire('error');
    expect(img()).toBeNull();
    expect(initials()!.hasAttribute('aria-hidden')).toBe(false);
    // The failed image's own name is drawn too, and the stylesheet drops it.
    expect(alt()!.matches(HIDDEN_BY_INITIALS)).toBe(true);
    expect(announced()).toEqual(['Ada Lovelace', 'Ada Lovelace']);
  });

  it('stands after the projected content and before the spinner', async () => {
    // Projected: the initials are in the DOM and the stylesheet drops them.
    fixture.componentInstance.projected.set(true);
    await fixture.whenStable();
    expect(initials()!.matches(HIDDEN_BY_PROJECTED)).toBe(true);

    // Nothing projected, an image loading: the initials stand, the spinner is dropped.
    fixture.componentInstance.projected.set(false);
    await setUrl('/me.png');
    expect(initials()!.matches(HIDDEN_BY_PROJECTED)).toBe(false);
    expect(spinner()!.matches(HIDDEN_BY_INITIALS)).toBe(true);
  });

  it('draws nothing for a name with no initial, and leaves the spinner to the image', async () => {
    fixture.componentInstance.name.set('...');
    await setUrl('/me.png');
    expect(initials()).toBeNull();
    expect(spinner()).not.toBeNull();
    expect(img()!.getAttribute('alt')).toBe('...');

    fixture.componentInstance.name.set('   ');
    await fixture.whenStable();
    expect(initials()).toBeNull();
    // A blank name is no name: the catalog fallback, and the initials stay announced.
    expect(img()!.getAttribute('alt')).toBe('Avatar');
  });

  it('changes nothing for an avatar that sets neither alt nor name', async () => {
    fixture.componentInstance.name.set(null);
    await setUrl('/me.png');
    expect(initials()).toBeNull();
    expect(spinner()).not.toBeNull();
    expect(img()!.getAttribute('alt')).toBe('Avatar');
    expect(tintClass()).toBeUndefined();
  });

  describe('tint', () => {
    it('is off by default', () => {
      expect(tintClass()).toBeUndefined();
    });

    it('lands the same name on the same tint, and a new name on its own', async () => {
      fixture.componentInstance.tint.set(true);
      await fixture.whenStable();
      const first = tintClass();
      expect(first).toMatch(/^wr-avatar--tint-(primary|success|warning|danger|info)$/);

      fixture.componentInstance.name.set('Grace Hopper');
      await fixture.whenStable();
      const second = tintClass();
      expect(second).toMatch(/^wr-avatar--tint-/);

      fixture.componentInstance.name.set('Ada Lovelace');
      await fixture.whenStable();
      expect(tintClass()).toBe(first);
      fixture.componentInstance.name.set('  Ada Lovelace ');
      await fixture.whenStable();
      expect(tintClass()).toBe(first);
      fixture.componentInstance.name.set('Grace Hopper');
      await fixture.whenStable();
      expect(tintClass()).toBe(second);
    });

    // The hash and the palette order are the contract: a change to either
    // re-colours every avatar on every site. Pinned by value.
    it('keeps the mapping it shipped with', async () => {
      fixture.componentInstance.tint.set(true);
      const cases: readonly (readonly [string, string])[] = [
        ['Ada Lovelace', 'success'],
        ['Grace Hopper', 'danger'],
        ['Хегай Роман', 'primary'],
        ['王小明', 'success'],
        ['Linus Torvalds', 'warning'],
        ['Anita Borg', 'info'],
      ];
      for (const [name, tint] of cases) {
        fixture.componentInstance.name.set(name);
        await fixture.whenStable();
        expect(tintClass(), name).toBe(`wr-avatar--tint-${tint}`);
      }
    });

    it('colours nothing without initials to colour', async () => {
      fixture.componentInstance.tint.set(true);
      fixture.componentInstance.name.set('...');
      await fixture.whenStable();
      expect(tintClass()).toBeUndefined();

      fixture.componentInstance.name.set(null);
      await fixture.whenStable();
      expect(tintClass()).toBeUndefined();
    });
  });

  it('paints the tint through the hooks, and drops the initials behind projected content', () => {
    interface Sass {
      compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
    }
    const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;
    const css = sass.compileString("@use 'avatar/styles';", {
      loadPaths: [join(process.cwd(), 'projects/lib')],
      style: 'expanded',
    }).css;

    for (const tint of ['primary', 'success', 'warning', 'danger', 'info']) {
      expect(css).toMatch(
        new RegExp(
          `\\.wr-avatar--tint-${tint} \\{\\s*--wr-avatar-bg: var\\(--wr-color-${tint}-soft\\);\\s*--wr-avatar-initials-color: var\\(--wr-color-${tint}-ink\\);`
        )
      );
    }
    expect(css).toMatch(/\.wr-avatar__content:not\(:empty\) ~ \.wr-avatar__initials \{\s*display: none;/);
    expect(css).toMatch(/\.wr-avatar__initials ~ \.wr-avatar__alt \{\s*display: none;/);
    expect(css).toMatch(/\.wr-avatar__initials ~ \.wr-avatar__spin \{\s*display: none;/);
    expect(css).toMatch(/\.wr-avatar--loaded \.wr-avatar__initials\[aria-hidden=true\] \{\s*visibility: hidden;/);
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
