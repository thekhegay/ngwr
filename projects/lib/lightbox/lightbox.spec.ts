import { Dir, type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrLightbox } from './lightbox';

@Component({
  imports: [WrLightbox],
  template: `
    <wr-lightbox
      src="/full.jpg"
      [alt]="alt()"
      [openLabel]="openLabel()"
      [caption]="caption()"
      [disablePreview]="disablePreview()"
    />
  `,
})
class Host {
  readonly alt = signal('A photo of a cat');
  readonly openLabel = signal<string | null>(null);
  readonly caption = signal('');
  readonly disablePreview = signal(false);
}

/**
 * The viewer is a CDK overlay, so it is queried off the document rather than the
 * fixture, and that container belongs to the TestBed's root injector, so it never
 * outlives this file.
 *
 * The loading state is the interesting half: `--loading` both animates a shimmer and
 * sets `opacity: 0` on the thumbnail, so whatever clears it is the difference between
 * an image that appears and a box that shimmers forever.
 */
describe('WrLightbox', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-lightbox')!;
  const trigger = (): HTMLButtonElement | null => root().querySelector<HTMLButtonElement>('.wr-lightbox__trigger');
  const thumb = (): HTMLImageElement => root().querySelector<HTMLImageElement>('.wr-lightbox__thumb')!;
  const viewer = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-lightbox-viewer');
  const full = (): HTMLImageElement => document.querySelector<HTMLImageElement>('.wr-lightbox-viewer__full')!;
  const closeBtn = (): HTMLButtonElement => document.querySelector<HTMLButtonElement>('.wr-lightbox-viewer__close')!;

  const click = (el: HTMLElement): void => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();
  };

  const open = (): void => click(trigger()!);

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('wraps the thumbnail in a button named after the image', () => {
    expect(trigger()!.getAttribute('aria-label')).toBe('A photo of a cat');
    expect(thumb().getAttribute('src')).toBe('/full.jpg');
    expect(viewer()).toBeNull();
  });

  it('keeps the trigger inside the element the focus ring is drawn on', () => {
    // The ring cannot live on the button: it fills the host exactly and the host
    // clips, so `.wr-lightbox:has(.wr-lightbox__trigger:focus-visible)` draws it
    // instead. That selector is only true while the two stay nested this way —
    // jsdom can pin the containment even though it resolves no stylesheet.
    expect(trigger()!.closest('.wr-lightbox')).toBe(host());
  });

  it('falls back to the catalog when there is no alt text', () => {
    // `image.open` has been in both catalogs all along; the template hard-coded the
    // same English literal beside it, so a localized app got one English name among
    // its Russian ones.
    fixture.componentInstance.alt.set('');
    fixture.detectChanges();
    expect(trigger()!.getAttribute('aria-label')).toBe('Open preview');
  });

  it('lets the consumer name the trigger over both the alt text and the catalog', () => {
    fixture.componentInstance.openLabel.set('Enlarge the cat');
    fixture.detectChanges();
    expect(trigger()!.getAttribute('aria-label')).toBe('Enlarge the cat');
  });

  it('shows a bare image, with no way in, when the preview is disabled', () => {
    fixture.componentInstance.disablePreview.set(true);
    fixture.detectChanges();

    expect(trigger()).toBeNull();
    expect(thumb()).not.toBeNull();
  });

  it('reserves space with a shimmer until the image resolves', () => {
    expect(host().classList.contains('wr-lightbox--loading')).toBe(true);

    thumb().dispatchEvent(new Event('load'));
    fixture.detectChanges();
    expect(host().classList.contains('wr-lightbox--loading')).toBe(false);
  });

  it('stops shimmering when the image cannot be loaded at all', () => {
    // `--loading` also sets `opacity: 0` on the thumbnail, so with no `(error)`
    // handler a broken `src` left an invisible box shimmering for ever instead of
    // showing the alt text. Both branches render their OWN `<img>`, so both are
    // checked — fixing one and not the other is a live possibility.
    thumb().dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(host().classList.contains('wr-lightbox--loading')).toBe(false);

    fixture.componentInstance.disablePreview.set(true);
    fixture.detectChanges();
    const bare = TestBed.createComponent(Host);
    bare.componentInstance.disablePreview.set(true);
    bare.detectChanges();
    const bareEl = bare.nativeElement as HTMLElement;
    bareEl.querySelector('.wr-lightbox__thumb')!.dispatchEvent(new Event('error'));
    bare.detectChanges();
    expect(bareEl.querySelector('wr-lightbox')!.classList.contains('wr-lightbox--loading')).toBe(false);
    bare.destroy();
  });

  it('opens a named modal viewer holding the full image', () => {
    open();

    expect(viewer()!.getAttribute('role')).toBe('dialog');
    expect(viewer()!.getAttribute('aria-modal')).toBe('true');
    expect(viewer()!.getAttribute('aria-label')).toBe('A photo of a cat');
    expect(full().getAttribute('src')).toBe('/full.jpg');
    expect(host().classList.contains('wr-lightbox--open')).toBe(true);
  });

  it('closes from the close button and hands focus back', () => {
    trigger()!.focus();
    open();
    click(closeBtn());

    expect(viewer()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('closes on Escape', () => {
    open();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(viewer()).toBeNull();
  });

  it('closes when the image itself is clicked', () => {
    // The full image is styled `cursor: zoom-out`, which is a promise that clicking it
    // closes the viewer — the most common way people dismiss a lightbox. Nothing
    // listened, so the cursor was the only part that worked.
    open();
    click(full());
    expect(viewer()).toBeNull();
  });

  it('shows a caption when it is given one', () => {
    fixture.componentInstance.caption.set('Taken in 2019');
    fixture.detectChanges();
    open();

    expect(document.querySelector('.wr-lightbox-viewer__caption')!.textContent.trim()).toBe('Taken in 2019');
  });

  it('takes the viewer with it when destroyed while open', () => {
    open();
    expect(viewer()).not.toBeNull();

    fixture.destroy();
    expect(viewer()).toBeNull();
  });
});

/**
 * Only a real catalog can tell a lookup from a hard-coded literal: with no provider
 * both render the same English string.
 */
describe('WrLightbox under a localized catalog', () => {
  it('takes both of its fallback names from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.alt.set('');
    fixture.detectChanges();
    // The static loader resolves asynchronously, so the first pass legitimately shows
    // the English fallback — asserting before it lands tests the harness, not the wiring.
    await fixture.whenStable();
    fixture.detectChanges();

    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.wr-lightbox__trigger')!;
    expect(trigger.getAttribute('aria-label')).toBe('Открыть превью');

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();

    const viewer = document.querySelector('.wr-lightbox-viewer')!;
    expect(viewer.getAttribute('aria-label')).toBe('Просмотр изображения');
    expect(document.querySelector('.wr-lightbox-viewer__close')!.getAttribute('aria-label')).toBe('Закрыть превью');

    fixture.destroy();
  });
});

/**
 * The viewer is centred on both axes, so no geometry rides on the direction —
 * but its chrome does: the ✕ sits at `inset-inline-end` and the caption reads
 * as prose. The CDK captures the direction as a string when the overlay is
 * created and writes it once, so a flip while the viewer is open — this site's
 * own LTR/RTL switch is a menu item — leaves the button in the corner the
 * reader has just stopped looking at.
 */
describe('WrLightbox follows a direction change while the viewer is open', () => {
  @Component({
    imports: [WrLightbox],
    template: `<wr-lightbox src="/full.jpg" alt="A photo of a cat" caption="On the sill" />`,
  })
  class DirHost {}

  let fixture: ReturnType<typeof TestBed.createComponent<DirHost>>;
  let dir: Directionality;

  /** What the CDK writes `dir` on: the wrapper around the pane, not the pane. */
  const wrapper = (): HTMLElement => document.querySelector<HTMLElement>('.wr-lightbox-overlay')!.parentElement!;

  const setOpen = async (next: boolean): Promise<void> => {
    const button = next
      ? (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-lightbox__trigger')!
      : document.querySelector<HTMLElement>('.wr-lightbox-viewer__close')!;
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    await fixture.whenStable();
  };

  /** A signal write is state, not an event: it lands on the next pass. */
  const flip = async (next: Direction): Promise<void> => {
    dir.valueSignal.set(next);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(DirHost);
    dir = TestBed.inject(Directionality);
    fixture.detectChanges();
    await setOpen(true);
  });

  afterEach(() => fixture.destroy());

  it('rewrites the viewer’s dir, so its chrome mirrors with the page', async () => {
    expect(wrapper().getAttribute('dir')).toBe('ltr');

    await flip('rtl');

    expect(wrapper().getAttribute('dir')).toBe('rtl');
  });

  it('gives a reopened viewer a follower of its own', async () => {
    await setOpen(false);
    await setOpen(true);

    await flip('rtl');

    expect(wrapper().getAttribute('dir')).toBe('rtl');
  });
});

/**
 * The viewer is appended to the overlay container on `<body>`, never inside the
 * `[dir]` region the thumbnail happens to sit in, and the CDK stamped it with
 * the APPLICATION's direction — `createOverlayRef` reads that off the
 * `Overlay`'s own injector, which no node-level `[dir]` is ever in the chain
 * of. A follower reading the island instead would rewrite the chrome one pass
 * after the viewer opened: a change to how it renders rather than the follow
 * this is.
 */
describe('WrLightbox follows the application, not a scoped [dir] island', () => {
  @Component({
    imports: [Dir, WrLightbox],
    template: `<div dir="rtl"><wr-lightbox src="/full.jpg" alt="A photo of a cat" /></div>`,
  })
  class IslandHost {}

  let fixture: ReturnType<typeof TestBed.createComponent<IslandHost>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(IslandHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('leaves a viewer opened inside an rtl island on the application’s direction', async () => {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-lightbox__trigger')!.click();
    await fixture.whenStable();
    // A second pass on purpose: the watch's first run lands after the viewer is
    // in the document, so a follower reading the island would flip it here.
    await fixture.whenStable();

    expect(document.querySelector<HTMLElement>('.wr-lightbox-overlay')!.parentElement!.getAttribute('dir')).toBe('ltr');
  });
});

/**
 * Lightboxes sharing a `group` page through each other from one viewer: the one
 * that was opened renders it and the others lend it their image.
 */
describe('WrLightbox in a gallery', () => {
  @Component({
    imports: [WrLightbox],
    template: `
      @if (early()) {
        <wr-lightbox src="/zero.jpg" alt="Zeroth" group="pets" />
      }
      <wr-lightbox src="/one.jpg" alt="First" caption="One" group="pets" [loop]="loop()" />
      @if (middle()) {
        <wr-lightbox src="/two.jpg" alt="Second" group="pets" [loop]="loop()" previousLabel="Back one" />
      }
      <wr-lightbox src="/three.jpg" alt="Third" caption="Three" group="pets" [loop]="loop()" />
      <wr-lightbox src="/solo.jpg" alt="Solo" />
    `,
  })
  class GalleryHost {
    readonly early = signal(false);
    readonly middle = signal(true);
    readonly loop = signal(false);
  }

  let fixture: ReturnType<typeof TestBed.createComponent<GalleryHost>>;
  let preloads: string[];

  const q = <T extends HTMLElement>(selector: string): T | null => document.querySelector<T>(selector);
  const full = (): string => q<HTMLImageElement>('.wr-lightbox-viewer__full')!.getAttribute('src')!;
  const counter = (): string => q('.wr-lightbox-viewer__counter')!.textContent.trim();
  const status = (): HTMLElement => q('.wr-lightbox-viewer__status')!;
  const previous = (): HTMLButtonElement => q<HTMLButtonElement>('.wr-lightbox-viewer__nav--previous')!;
  const next = (): HTMLButtonElement => q<HTMLButtonElement>('.wr-lightbox-viewer__nav--next')!;

  const click = (el: HTMLElement): void => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();
  };

  const press = (key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    document.body.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  const open = (alt: string): void =>
    click(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`.wr-lightbox__trigger[aria-label="${alt}"]`)!
    );

  const create = (): void => {
    fixture = TestBed.createComponent(GalleryHost);
    fixture.detectChanges();
  };

  beforeEach(() => {
    preloads = [];
    vi.stubGlobal(
      'Image',
      class {
        set src(value: string) {
          preloads.push(value);
        }
      }
    );
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('leaves a lightbox with no group exactly as it was', () => {
    create();
    open('Solo');

    expect(full()).toBe('/solo.jpg');
    expect(q('.wr-lightbox-viewer__nav')).toBeNull();
    expect(q('.wr-lightbox-viewer__counter')).toBeNull();
    expect(q('.wr-lightbox-viewer__status')).toBeNull();
    expect(press('ArrowRight').defaultPrevented).toBe(false);
    expect(full()).toBe('/solo.jpg');
    expect(preloads).toEqual([]);
  });

  it('opens the gallery at the image that was clicked', () => {
    create();
    open('Second');

    expect(full()).toBe('/two.jpg');
    expect(counter()).toBe('2 / 3');
    expect(q('.wr-lightbox-viewer__counter')!.getAttribute('aria-hidden')).toBe('true');
    expect(q('.wr-lightbox-viewer')!.getAttribute('aria-label')).toBe('Second');
  });

  it('moves by its two named buttons, swapping the image and caption in place', () => {
    create();
    open('Second');
    const viewer = q('.wr-lightbox-viewer');

    expect(previous().getAttribute('aria-label')).toBe('Back one');
    expect(next().getAttribute('aria-label')).toBe('Next');
    expect(q('.wr-lightbox-viewer__caption')).toBeNull();

    click(next());
    expect(full()).toBe('/three.jpg');
    expect(counter()).toBe('3 / 3');
    expect(q('.wr-lightbox-viewer__caption')!.textContent.trim()).toBe('Three');
    expect(q<HTMLImageElement>('.wr-lightbox-viewer__full')!.alt).toBe('Third');

    click(previous());
    click(previous());
    expect(full()).toBe('/one.jpg');
    expect(q('.wr-lightbox-viewer')).toBe(viewer);
    expect(document.querySelectorAll('.wr-lightbox-viewer')).toHaveLength(1);
  });

  it('moves with the arrow keys, and to either end with Home and End', () => {
    create();
    open('Second');

    expect(press('ArrowRight').defaultPrevented).toBe(true);
    expect(counter()).toBe('3 / 3');

    press('ArrowLeft');
    press('ArrowLeft');
    expect(counter()).toBe('1 / 3');

    press('End');
    expect(full()).toBe('/three.jpg');

    press('Home');
    expect(full()).toBe('/one.jpg');
  });

  it('leaves a modified arrow to the browser', () => {
    create();
    open('Second');

    expect(press('ArrowLeft', { altKey: true }).defaultPrevented).toBe(false);
    expect(counter()).toBe('2 / 3');
  });

  it('stops at both ends unless it is told to loop', () => {
    create();
    open('Third');

    expect(next().getAttribute('aria-disabled')).toBe('true');
    expect(next().classList.contains('wr-lightbox-viewer__nav--disabled')).toBe(true);
    expect(previous().hasAttribute('aria-disabled')).toBe(false);

    click(next());
    press('ArrowRight');
    expect(counter()).toBe('3 / 3');

    press('Home');
    expect(previous().getAttribute('aria-disabled')).toBe('true');
    press('ArrowLeft');
    expect(counter()).toBe('1 / 3');
  });

  it('wraps around both ends with loop', () => {
    create();
    fixture.componentInstance.loop.set(true);
    fixture.detectChanges();
    open('Third');

    expect(next().hasAttribute('aria-disabled')).toBe(false);
    click(next());
    expect(counter()).toBe('1 / 3');

    press('ArrowLeft');
    expect(counter()).toBe('3 / 3');
  });

  it('turns the arrow keys around under RTL, so the inline start is still previous', () => {
    create();
    TestBed.inject(Directionality).valueSignal.set('rtl');
    open('Second');

    press('ArrowLeft');
    expect(counter()).toBe('3 / 3');

    press('ArrowRight');
    press('ArrowRight');
    expect(counter()).toBe('1 / 3');
  });

  it('turns the page on a sideways swipe and still closes on a downward one', () => {
    create();
    open('Second');
    const viewer = q('.wr-lightbox-viewer')!;
    const touch = (type: string, clientX: number, clientY: number): void => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      const point = [{ clientX, clientY }];
      Object.assign(event, { touches: type === 'touchend' ? [] : point, changedTouches: point });
      viewer.dispatchEvent(event);
      fixture.detectChanges();
    };
    Object.defineProperty(viewer, 'offsetHeight', { value: 400 });

    touch('touchstart', 200, 100);
    touch('touchend', 120, 110);
    expect(counter()).toBe('3 / 3');

    touch('touchstart', 120, 100);
    touch('touchend', 200, 90);
    expect(counter()).toBe('2 / 3');

    touch('touchstart', 200, 100);
    touch('touchend', 205, 300);
    expect(q('.wr-lightbox-viewer')).toBeNull();
  });

  it('announces the new position and image politely', () => {
    create();
    open('First');

    expect(status().getAttribute('role')).toBe('status');
    expect(status().getAttribute('aria-live')).toBe('polite');
    const region = status();

    click(next());
    expect(status()).toBe(region);
    expect(region.textContent.trim()).toBe('Image 2 of 3, Second');
  });

  it('keeps focus on the button that just reached the end', () => {
    // A `disabled` button cannot hold focus: the browser drops it to <body>, which
    // is outside the trap. So the end of the group is `aria-disabled` only.
    create();
    open('Second');
    next().focus();

    click(next());
    expect(next().getAttribute('aria-disabled')).toBe('true');
    expect(next().disabled).toBe(false);
    expect(document.activeElement).toBe(next());
    expect(q('.wr-lightbox-viewer')!.contains(document.activeElement)).toBe(true);
  });

  it('hands focus back to the thumbnail that opened it, wherever it ended', () => {
    create();
    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[aria-label="First"]')!;
    trigger.focus();
    open('First');
    press('End');

    press('Escape');
    expect(q('.wr-lightbox-viewer')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('orders the group by the document, not by who registered first', () => {
    create();
    fixture.componentInstance.early.set(true);
    fixture.detectChanges();
    open('First');

    expect(counter()).toBe('2 / 4');
    press('Home');
    expect(full()).toBe('/zero.jpg');
  });

  it('drops a destroyed member and stays at its place in the order', () => {
    create();
    open('First');
    click(next());
    expect(full()).toBe('/two.jpg');

    fixture.componentInstance.middle.set(false);
    fixture.detectChanges();

    expect(full()).toBe('/three.jpg');
    expect(counter()).toBe('2 / 2');
  });

  it('preloads the neighbour on each side, once', () => {
    create();
    open('Second');
    expect([...preloads].sort()).toEqual(['/one.jpg', '/three.jpg']);

    click(next());
    click(previous());
    expect(preloads).toHaveLength(2);
  });

  it('preloads nothing on the server', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    create();
    open('Second');

    expect(counter()).toBe('2 / 3');
    expect(preloads).toEqual([]);
  });
});

describe('WrLightbox gallery under a localized catalog', () => {
  it('takes its button names and the announcement from the catalog', async () => {
    @Component({
      imports: [WrLightbox],
      template: `
        <wr-lightbox src="/one.jpg" alt="Кот" group="pets" />
        <wr-lightbox src="/two.jpg" alt="Пёс" group="pets" />
      `,
    })
    class RuHost {}

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(RuHost);
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-lightbox__trigger')!.click();
    fixture.detectChanges();

    expect(document.querySelector('.wr-lightbox-viewer__nav--previous')!.getAttribute('aria-label')).toBe('Назад');
    expect(document.querySelector('.wr-lightbox-viewer__nav--next')!.getAttribute('aria-label')).toBe('Далее');
    expect(document.querySelector('.wr-lightbox-viewer__status')!.textContent.trim()).toBe('Изображение 1 из 2, Кот');

    fixture.destroy();
  });
});
