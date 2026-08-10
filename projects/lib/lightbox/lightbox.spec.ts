import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
 * fixture, and `provideWrOverlay()` keeps that container out of the next spec file's.
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
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('wraps the thumbnail in a button named after the image', () => {
    expect(trigger()!.getAttribute('aria-label')).toBe('A photo of a cat');
    expect(thumb().getAttribute('src')).toBe('/full.jpg');
    expect(viewer()).toBeNull();
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
        provideWrOverlay(),
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
 * ⚠️ This one guards the RULE, not the behaviour.
 *
 * `cursor: zoom-in` sat on the host unconditionally, so a `disablePreview` thumbnail —
 * which is documented as "a plain thumbnail" and opens nothing — still invited the
 * click. jsdom loads no stylesheets, so the cursor cannot be observed here.
 */
describe('the lightbox stylesheet', () => {
  const code = readFileSync(join(process.cwd(), 'projects/lib/lightbox/styles/_index.scss'), 'utf8')
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');

  it('offers the zoom cursor only where there is something to open', () => {
    // The block's own declarations, up to its first nested rule.
    const hostRule = /\.wr-lightbox \{([\s\S]*?)\n\s+&/.exec(code)?.[1] ?? '';
    expect(hostRule).not.toMatch(/cursor:\s*zoom-in/);
    // The trigger keeps it — that IS the element that opens the viewer.
    expect(code).toMatch(/&__trigger \{[\s\S]*?cursor:\s*zoom-in/);
  });
});
