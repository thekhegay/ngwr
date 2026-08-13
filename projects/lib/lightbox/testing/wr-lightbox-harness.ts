/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey, type TestElement } from '@angular/cdk/testing';

import type { WrLightboxHarnessFilters } from './interfaces';

/**
 * Test harness for `<wr-lightbox>` — the thumbnail, and the full-size viewer it
 * opens.
 *
 * The thumbnail is an element in your fixture and the viewer is a portal in the NGWR
 * overlay container, so this is loaded from the normal fixture loader and reaches
 * across for you — scoped by the id the trigger publishes as `aria-controls`, never
 * by `.wr-lightbox-viewer`, which would answer with whichever lightbox opened first.
 *
 * **A closed lightbox has no viewer at all**, unlike the collapse or the speed dial:
 * the overlay is created on open and disposed on close, so every viewer read here
 * throws while it is shut rather than answering about a stale element.
 *
 * **`disablePreview` removes the button, not just its behaviour.** The thumbnail is
 * then a bare `<img>` with nothing to click and nothing in the tab order, which is
 * why {@link isInteractive} exists and why {@link open} explains itself rather than
 * timing out on a missing element.
 *
 * @example
 * ```ts
 * const lightbox = await loader.getHarness(WrLightboxHarness.with({ alt: 'Mountain' }));
 *
 * await lightbox.open();
 * expect(await lightbox.getFullSrc()).toBe('/photo.jpg');
 *
 * await lightbox.sendEscape();
 * expect(await lightbox.isOpen()).toBe(false);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrLightboxHarness extends ComponentHarness {
  static hostSelector = 'wr-lightbox';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrLightboxHarnessFilters = {}): HarnessPredicate<WrLightboxHarness> {
    return new HarnessPredicate(WrLightboxHarness, options)
      .addOption('alt', options.alt, (harness, alt) => HarnessPredicate.stringMatches(harness.getAlt(), alt))
      .addOption('caption', options.caption, (harness, caption) =>
        HarnessPredicate.stringMatches(harness.readCaption(), caption)
      )
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open);
  }

  private readonly thumb = this.locatorFor('.wr-lightbox__thumb');
  private readonly trigger = this.locatorForOptional('.wr-lightbox__trigger');

  /**
   * Whether the viewer is open, from the host's own modifier.
   *
   * The class rather than the overlay, because it is the answer that holds for a
   * harness you are HOLDING: the viewer is disposed on close, and a query for it
   * cannot tell "shut" apart from "never opened".
   */
  async isOpen(): Promise<boolean> {
    return (await this.host()).hasClass('wr-lightbox--open');
  }

  /**
   * Whether the thumbnail has settled — loaded OR failed.
   *
   * A failure counts on purpose: the loading state animates a shimmer and hides the
   * image, so a broken `src` with no error path would shimmer for ever instead of
   * falling back to its alt text. The two cases are deliberately not separated here,
   * because the DOM does not separate them either.
   */
  async isLoading(): Promise<boolean> {
    return (await this.host()).hasClass('wr-lightbox--loading');
  }

  /** The thumbnail's alt text — the same string the viewer takes its name from. */
  async getAlt(): Promise<string> {
    return (await this.thumb()).getProperty<string>('alt');
  }

  /**
   * What the THUMBNAIL is showing: `preview` when one was given, `src` otherwise.
   *
   * Worth its own method because the two images are different files by design — a
   * grid of thumbnails should not pull full-size originals — and because the
   * thumbnail never swaps to `src` later. Compare with {@link getFullSrc}.
   */
  async getThumbSrc(): Promise<string> {
    return (await this.thumb()).getProperty<string>('src');
  }

  /** Whether the thumbnail can be clicked open at all (`disablePreview` off). */
  async isInteractive(): Promise<boolean> {
    return (await this.trigger()) !== null;
  }

  /** The trigger's accessible name — falls back to the alt text, then to the catalog. */
  async getOpenLabel(): Promise<string | null> {
    const trigger = await this.trigger();
    return trigger ? trigger.getAttribute('aria-label') : null;
  }

  /** Open the viewer. An already-open one is left alone; a non-interactive one throws. */
  async open(): Promise<void> {
    if (await this.isOpen()) return;

    const trigger = await this.trigger();
    if (!trigger) {
      throw new Error(
        'WrLightboxHarness.open(): this lightbox has `disablePreview` set, so there is no trigger — the ' +
          'thumbnail renders as a bare <img> with nothing to click and nothing in the tab order.'
      );
    }
    await trigger.click();
  }

  /** Close the viewer through its ✕ button. An already-closed one is left alone. */
  async close(): Promise<void> {
    if (!(await this.isOpen())) return;
    await (await this.viewerPart('.wr-lightbox-viewer__close', 'close')).click();
  }

  /**
   * Click the full image — which closes the viewer.
   *
   * It looks like decoration and is not: the image is styled `cursor: zoom-out`, and
   * that is a promise. It is deliberately NOT in the tab order, since the ✕ button,
   * Escape, the backdrop and a swipe all do the same thing and all reach a keyboard —
   * so this is a mouse affordance, and the only way to assert it still works.
   */
  async clickImage(): Promise<void> {
    await (await this.viewerPart('.wr-lightbox-viewer__full', 'clickImage')).click();
  }

  /**
   * Press Escape.
   *
   * Sent to the viewer, though it would arrive from anywhere: the overlay is fed by
   * the CDK's keyboard dispatcher, which keeps one document listener and routes to
   * the top-most overlay.
   */
  async sendEscape(): Promise<void> {
    await (await this.requireViewer('sendEscape')).sendKeys(TestKey.ESCAPE);
  }

  /** The full-size image's `src`. Throws while the viewer is closed. */
  async getFullSrc(): Promise<string> {
    return (await this.viewerPart('.wr-lightbox-viewer__full', 'getFullSrc')).getProperty<string>('src');
  }

  /** The caption under the full image, or `null` when there is none. Throws while closed. */
  async getCaption(): Promise<string | null> {
    await this.requireViewer('getCaption');
    return this.readCaption();
  }

  /** The name the viewer dialog announces — its alt text, or the catalog's fallback. */
  async getViewerLabel(): Promise<string | null> {
    return (await this.requireViewer('getViewerLabel')).getAttribute('aria-label');
  }

  /** The ✕ button's accessible name. Throws while the viewer is closed. */
  async getCloseLabel(): Promise<string | null> {
    return (await this.viewerPart('.wr-lightbox-viewer__close', 'getCloseLabel')).getAttribute('aria-label');
  }

  /** Whether the viewer announces itself as a modal dialog. */
  async isModal(): Promise<boolean> {
    const viewer = await this.requireViewer('isModal');
    return (await viewer.getAttribute('role')) === 'dialog' && (await viewer.getAttribute('aria-modal')) === 'true';
  }

  /**
   * Whether focus is inside the viewer, where the trap should be holding it.
   *
   * `role="dialog"` with `aria-modal` promises the page behind is out of reach, and a
   * missing trap makes that a lie — Tab walks straight through the backdrop. Note
   * that in a unit test the trap needs elements with a box to find anything tabbable,
   * so a spec asserting this has to hand the DOM some dimensions first.
   */
  async isFocusTrapped(): Promise<boolean> {
    return (await this.requireViewer('isFocusTrapped')).matchesSelector(':focus-within');
  }

  /**
   * Whether the trigger's `aria-controls` names THIS lightbox's viewer, and nothing
   * else on the page.
   *
   * The reference only exists while the viewer does — an id naming an element that is
   * not in the document is not a pairing, it is a dangling reference — so this is
   * `false` for a closed lightbox by construction. Counted across the document too,
   * because two viewers answering to one id hand every reference to the first.
   */
  async isViewerBound(): Promise<boolean> {
    const id = await this.viewerId();
    if (!id) return false;

    const matches = await this.documentRootLocatorFactory().locatorForAll(`.wr-lightbox-viewer#${id}`)();
    const everywhere = await this.documentRootLocatorFactory().locatorForAll(`[id="${id}"]`)();
    return matches.length === 1 && everywhere.length === 1;
  }

  /** The caption without the open check — for filters, which must not throw. */
  private async readCaption(): Promise<string | null> {
    const id = await this.viewerId();
    if (!id) return null;

    const caption = await this.documentRootLocatorFactory().locatorForOptional(`#${id} .wr-lightbox-viewer__caption`)();
    return caption ? caption.text() : null;
  }

  /** The id the trigger currently points at, or `null` while the viewer is closed. */
  private async viewerId(): Promise<string | null> {
    const trigger = await this.trigger();
    return trigger ? trigger.getAttribute('aria-controls') : null;
  }

  private async requireViewer(method: string): Promise<TestElement> {
    const id = await this.viewerId();
    const viewer = id
      ? await this.documentRootLocatorFactory().locatorForOptional(`.wr-lightbox-viewer#${id}`)()
      : null;

    if (!viewer) {
      throw new Error(
        `WrLightboxHarness.${method}(): the viewer is not open. It is an overlay created on open and disposed ` +
          'on close, so there is nothing to read while the lightbox is shut — call open() first.'
      );
    }
    return viewer;
  }

  private async viewerPart(selector: string, method: string): Promise<TestElement> {
    const viewer = await this.requireViewer(method);
    const id = await viewer.getAttribute('id');

    const part = await this.documentRootLocatorFactory().locatorForOptional(`#${id} ${selector}`)();
    if (!part) {
      throw new Error(`WrLightboxHarness.${method}(): the viewer has no \`${selector}\` element.`);
    }
    return part;
  }
}
