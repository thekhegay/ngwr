/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrCropHandle } from 'ngwr/image-cropper';

import type { WrImageCropperHarnessFilters } from './interfaces';

/** Where the crop window sits over the DISPLAYED image, in CSS pixels. */
export interface WrCropWindowBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Test harness for `<wr-image-cropper>`.
 *
 * **This is the smallest honest surface of any harness here, and the reason is worth
 * reading before you reach for a method that is not on it.** Almost everything the
 * cropper does is measured: it reads the `<img>`'s rendered box and its
 * `naturalWidth`, converts between display and source pixels, and moves the crop
 * window with pointer deltas. jsdom measures nothing — every rect is 0×0 and
 * `naturalWidth` is 0 — so an image never "loads", the crop UI never renders, and a
 * synthetic drag divides by zero. There is deliberately no `moveCrop()` or
 * `resizeCrop()`: either would write `NaN` and report success.
 *
 * What a spec CAN do is give the image a box and a natural size itself, then call
 * {@link dispatchImageLoad} — the two numbers `onImageLoad` reads are the whole
 * stub, and from there {@link getCropBox} and {@link getHandles} are real answers,
 * because the component writes the crop window's geometry as inline pixels.
 *
 * ```ts
 * // In your spec, before dispatching the load:
 * const img = fixture.nativeElement.querySelector('.wr-image-cropper__image');
 * img.getBoundingClientRect = () => ({ width: 400, height: 400, x: 0, y: 0 }) as DOMRect;
 * Object.defineProperty(img, 'naturalWidth', { value: 800 });
 * Object.defineProperty(img, 'naturalHeight', { value: 800 });
 * ```
 *
 * **There is also nothing to click.** The cropper renders no buttons: a consumer
 * takes the result by calling `crop()` on the component through a `viewChild`, and
 * reads `cropRect()` the same way. Those are component API rather than DOM, so they
 * are outside what a harness can reach at all — which is worth knowing rather than
 * discovering.
 *
 * @example
 * ```ts
 * const cropper = await loader.getHarness(WrImageCropperHarness);
 *
 * expect(await cropper.isEmpty()).toBe(false);
 * expect(await cropper.isReady()).toBe(false);   // nothing measured yet
 *
 * await cropper.dispatchImageLoad();
 * expect(await cropper.getCropBox()).toEqual({ x: 80, y: 80, width: 240, height: 240 });
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrImageCropperHarness extends ComponentHarness {
  static hostSelector = 'wr-image-cropper';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrImageCropperHarnessFilters = {}): HarnessPredicate<WrImageCropperHarness> {
    return new HarnessPredicate(WrImageCropperHarness, options).addOption(
      'empty',
      options.empty,
      async (harness, empty) => (await harness.isEmpty()) === empty
    );
  }

  private readonly image = this.locatorForOptional('.wr-image-cropper__image');
  private readonly cropWindow = this.locatorForOptional('.wr-image-cropper__window');

  /** Whether the cropper has no source at all, and is showing its placeholder. */
  async isEmpty(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-image-cropper__empty')()) !== null;
  }

  /** The placeholder's text, or `null` when there is an image. Comes from the catalog. */
  async getEmptyText(): Promise<string | null> {
    const empty = await this.locatorForOptional('.wr-image-cropper__empty')();
    return empty ? empty.text() : null;
  }

  /**
   * Whether the crop UI is up.
   *
   * Not the same question as {@link isEmpty}: a cropper with a perfectly good `src`
   * shows nothing but the image until it has been MEASURED, because the window's size
   * is a fraction of the rendered box. In a browser that happens on load; in a unit
   * test it happens when the spec stubs the box and calls
   * {@link dispatchImageLoad}.
   */
  async isReady(): Promise<boolean> {
    return (await this.cropWindow()) !== null;
  }

  /**
   * What the `<img>` is pointing at.
   *
   * A `File` or `Blob` source becomes an object URL, so this is `blob:…` for those
   * and the plain string for a string `src`. Comparing the two is not useful; asking
   * whether it CHANGED is.
   */
  async getImageSrc(): Promise<string | null> {
    const image = await this.image();
    return image ? image.getProperty<string>('src') : null;
  }

  /**
   * Fire the image's `load` event.
   *
   * The event, not a real load: jsdom fetches nothing, and the handler reads
   * `getBoundingClientRect()` and `naturalWidth` off the element. Stub those first —
   * see this class's docs — or the crop window will still not render and
   * {@link isReady} will stay `false`, which is exactly what a real cropper does with
   * a zero-sized image.
   */
  async dispatchImageLoad(): Promise<void> {
    const image = await this.image();
    if (!image) {
      throw new Error(
        'WrImageCropperHarness.dispatchImageLoad(): there is no image — the cropper has no `src`, so it is ' +
          'showing its empty state.'
      );
    }
    await image.dispatchEvent('load');
  }

  /**
   * Where the crop window sits over the displayed image, in CSS pixels.
   *
   * From the inline styles the component writes — a measured box would be 0×0 — and
   * in DISPLAY pixels, which is not what a consumer receives: `cropRect()` converts
   * to the image's natural pixels, and that conversion is the component's own contract
   * rather than something the DOM shows.
   */
  async getCropBox(): Promise<WrCropWindowBox> {
    const window_ = await this.requireReady('getCropBox');
    return {
      x: Number.parseFloat(await window_.getCssValue('left')),
      y: Number.parseFloat(await window_.getCssValue('top')),
      width: Number.parseFloat(await window_.getCssValue('width')),
      height: Number.parseFloat(await window_.getCssValue('height')),
    };
  }

  /** The eight resize handles, by their compass suffix. Throws before the crop UI is up. */
  async getHandles(): Promise<WrCropHandle[]> {
    await this.requireReady('getHandles');
    const handles = await this.locatorForAll('.wr-image-cropper__handle')();

    return Promise.all(
      handles.map(async handle => {
        const classes = (await handle.getAttribute('class')) ?? '';
        const found = classes.split(/\s+/).find(name => name.startsWith('wr-image-cropper__handle--'));
        return (found?.slice('wr-image-cropper__handle--'.length) ?? '') as WrCropHandle;
      })
    );
  }

  /** Whether the dimming backdrop with the cut-out is drawn. */
  async hasBackdrop(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-image-cropper__backdrop')()) !== null;
  }

  private async requireReady(method: string): Promise<TestElement> {
    const window_ = await this.cropWindow();
    if (window_) return window_;

    throw new Error(
      `WrImageCropperHarness.${method}(): the crop window is not rendered. The cropper sizes it from the ` +
        "image's MEASURED box, and a unit test has none — give the <img> a `getBoundingClientRect` and a " +
        '`naturalWidth`, then call dispatchImageLoad().'
    );
  }
}
