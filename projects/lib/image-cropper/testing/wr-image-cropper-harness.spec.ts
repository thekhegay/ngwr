import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { WrImageCropper } from 'ngwr/image-cropper';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrImageCropperHarness } from './wr-image-cropper-harness';

@Component({
  imports: [WrImageCropper],
  template: '<wr-image-cropper [src]="src()" [aspectRatio]="aspectRatio()" />',
})
class Host {
  readonly src = signal<string | File | Blob | null>('/photo.jpg');
  readonly aspectRatio = signal<number | null>(null);
}

/**
 * The cropper is measured from end to end and jsdom measures nothing, so the spec
 * gives the image the two numbers `onImageLoad` reads and the harness fires the
 * event. Everything after that is real: the crop window's geometry is written inline,
 * which is the only part of this component a test without layout can see.
 */
describe('WrImageCropperHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const cropper = (): Promise<WrImageCropperHarness> => loader.getHarness(WrImageCropperHarness);

  /** Give the `<img>` a rendered box and a natural size — the whole stub. */
  const measure = ({ display = 400, natural = 800 } = {}): void => {
    const root = fixture.nativeElement as HTMLElement;
    const image = root.querySelector<HTMLImageElement>('.wr-image-cropper__image')!;
    image.getBoundingClientRect = (): DOMRect =>
      ({ width: display, height: display, x: 0, y: 0, top: 0, left: 0, right: display, bottom: display }) as DOMRect;
    Object.defineProperty(image, 'naturalWidth', { value: natural, configurable: true });
    Object.defineProperty(image, 'naturalHeight', { value: natural, configurable: true });
  };

  const mount = (providers: unknown[] = []): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  beforeEach(() => mount());

  afterEach(() => fixture.destroy());

  it('holds an image but is not ready until it has been measured', async () => {
    const harness = await cropper();

    expect([await harness.isEmpty(), await harness.isReady()]).toEqual([false, false]);
    expect(await harness.getImageSrc()).toContain('/photo.jpg');
  });

  it('refuses every crop question until the crop window exists', async () => {
    const harness = await cropper();

    await expect(harness.getCropBox()).rejects.toThrow(/not rendered/);
    await expect(harness.getHandles()).rejects.toThrow(/not rendered/);
    await expect(harness.pressArrow('right')).rejects.toThrow(/not rendered/);
    await expect(harness.getAnnouncement()).rejects.toThrow(/not rendered/);
  });

  it('opens a centred crop window once the image reports a size', async () => {
    const harness = await cropper();
    measure();

    await harness.dispatchImageLoad();

    expect(await harness.isReady()).toBe(true);
    // 60% of a 400px box, centred.
    expect(await harness.getCropBox()).toEqual({ x: 80, y: 80, width: 240, height: 240 });
    expect(await harness.hasBackdrop()).toBe(true);
  });

  it('renders eight handles, one per edge and corner', async () => {
    const harness = await cropper();
    measure();
    await harness.dispatchImageLoad();

    expect((await harness.getHandles()).sort()).toEqual(['e', 'n', 'ne', 'nw', 's', 'se', 'sw', 'w']);
  });

  it('honours an aspect ratio in the window it opens', async () => {
    fixture.componentInstance.aspectRatio.set(2);
    await fixture.whenStable();

    const harness = await cropper();
    measure();
    await harness.dispatchImageLoad();

    const box = await harness.getCropBox();
    expect(box.width / box.height).toBe(2);
  });

  it('stays unmeasured when the image reports no size, exactly as a browser would', async () => {
    const harness = await cropper();

    // No stub: `naturalWidth` is 0 and the rect is 0x0, which is what a broken image
    // looks like in a browser too — and the crop UI must not open over nothing.
    await harness.dispatchImageLoad();

    expect(await harness.isReady()).toBe(false);
  });

  it('shows a translated placeholder with no source at all', async () => {
    fixture.componentInstance.src.set(null);
    await fixture.whenStable();

    const harness = await cropper();
    expect([await harness.isEmpty(), await harness.getEmptyText()]).toEqual([true, 'No image']);
    expect(await harness.getImageSrc()).toBeNull();

    await expect(harness.dispatchImageLoad()).rejects.toThrow(/no image/);
  });

  it('takes that placeholder from the catalog', async () => {
    mount([provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }), provideWrI18nStaticLoader({ ru: wrRu })]);
    fixture.componentInstance.src.set(null);
    await fixture.whenStable();

    expect(await (await cropper()).getEmptyText()).toBe('Нет изображения');
  });

  it('names the crop window, and moves it with the arrow keys', async () => {
    const harness = await cropper();
    measure();
    await harness.dispatchImageLoad();

    expect(await harness.getCropWindowLabel()).toBe('Crop region');

    await harness.pressArrow('right');
    await harness.pressArrow('down', { shift: true });

    expect(await harness.getCropBox()).toEqual({ x: 81, y: 90, width: 240, height: 240 });
  });

  it('resizes rather than moves when Alt is held', async () => {
    const harness = await cropper();
    measure();
    await harness.dispatchImageLoad();

    await harness.pressArrow('right', { alt: true, shift: true });

    expect(await harness.getCropBox()).toEqual({ x: 80, y: 80, width: 250, height: 240 });
  });

  it('announces the moved crop in SOURCE pixels, which getCropBox never reports', async () => {
    // Two questions, not one: the box below is display geometry, the announcement is
    // what a screen-reader user is told, and the image here is drawn at half size.
    const harness = await cropper();
    measure({ display: 400, natural: 800 });
    await harness.dispatchImageLoad();

    expect(await harness.getAnnouncement()).toBe('');

    await harness.pressArrow('right');

    expect(await harness.getCropBox()).toMatchObject({ x: 81 });
    expect(await harness.getAnnouncement()).toBe('162, 160, 480 × 480');
  });

  it('matches on the empty state', async () => {
    expect(await loader.getHarnessOrNull(WrImageCropperHarness.with({ empty: false }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrImageCropperHarness.with({ empty: true }))).toBeNull();
  });
});
