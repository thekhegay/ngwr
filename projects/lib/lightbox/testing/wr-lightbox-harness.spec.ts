import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrLightbox } from 'ngwr/lightbox';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrLightboxHarness } from './wr-lightbox-harness';

@Component({
  imports: [WrLightbox],
  template: `
    <wr-lightbox
      src="/full.jpg"
      [alt]="alt()"
      [preview]="preview()"
      [openLabel]="openLabel()"
      [caption]="caption()"
      [disablePreview]="disablePreview()"
    />
  `,
})
class Host {
  readonly alt = signal('A photo of a cat');
  readonly preview = signal<string | null>(null);
  readonly openLabel = signal<string | null>(null);
  readonly caption = signal('');
  readonly disablePreview = signal(false);
}

/** Two lightboxes, so a viewer query that is not scoped answers for the wrong one. */
@Component({
  imports: [WrLightbox],
  template: `
    <wr-lightbox src="/cat.jpg" alt="Cat" caption="A cat" />
    <wr-lightbox src="/dog.jpg" alt="Dog" caption="A dog" />
  `,
})
class TwoHost {}

/**
 * The thumbnail is in the fixture and the viewer is an overlay, so the harness has to
 * cross between them; `provideWrOverlay()` keeps this file's container out of the next
 * one's.
 */
describe('WrLightboxHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const lightbox = (): Promise<WrLightboxHarness> => loader.getHarness(WrLightboxHarness);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fixture.destroy();
  });

  it('reads the thumbnail without opening anything', async () => {
    const harness = await lightbox();

    expect(await harness.isOpen()).toBe(false);
    expect(await harness.getAlt()).toBe('A photo of a cat');
    expect(await harness.getOpenLabel()).toBe('A photo of a cat');
    expect(await harness.isInteractive()).toBe(true);
  });

  it('shows the preview file in the thumbnail and the full one in the viewer', async () => {
    fixture.componentInstance.preview.set('/thumb.jpg');
    await fixture.whenStable();

    const harness = await lightbox();
    expect(await harness.getThumbSrc()).toContain('/thumb.jpg');

    await harness.open();

    // The thumbnail never swaps to `src`; the viewer never shows the preview.
    expect(await harness.getThumbSrc()).toContain('/thumb.jpg');
    expect(await harness.getFullSrc()).toContain('/full.jpg');
  });

  it('refuses every viewer read while the lightbox is shut', async () => {
    const harness = await lightbox();

    await expect(harness.getFullSrc()).rejects.toThrow(/not open/);
    await expect(harness.getCaption()).rejects.toThrow(/not open/);
    await expect(harness.getViewerLabel()).rejects.toThrow(/not open/);
    await expect(harness.sendEscape()).rejects.toThrow(/not open/);
  });

  it('opens, presents itself as a modal dialog, and pairs with its trigger', async () => {
    const harness = await lightbox();
    await harness.open();

    expect(await harness.isOpen()).toBe(true);
    expect(await harness.isModal()).toBe(true);
    expect(await harness.getViewerLabel()).toBe('A photo of a cat');
    expect(await harness.isViewerBound()).toBe(true);
  });

  it('publishes no pairing while it is closed, because there is nothing to point at', async () => {
    const harness = await lightbox();
    expect(await harness.isViewerBound()).toBe(false);
  });

  it('closes from the ✕ button, from the image, and from Escape', async () => {
    const harness = await lightbox();

    await harness.open();
    await harness.close();
    expect(await harness.isOpen()).toBe(false);

    await harness.open();
    // The full image is styled `cursor: zoom-out` and is not a tab stop — a mouse
    // affordance, and this is the only way to assert it still closes.
    await harness.clickImage();
    expect(await harness.isOpen()).toBe(false);

    await harness.open();
    await harness.sendEscape();
    expect(await harness.isOpen()).toBe(false);
  });

  it('reads the caption only when there is one', async () => {
    const harness = await lightbox();
    await harness.open();
    expect(await harness.getCaption()).toBeNull();

    await harness.close();
    fixture.componentInstance.caption.set('Sleeping in the sun');
    await fixture.whenStable();
    await harness.open();

    expect(await harness.getCaption()).toBe('Sleeping in the sun');
  });

  it('names the ✕ button, falling back to plain English with no catalog', async () => {
    const harness = await lightbox();
    await harness.open();

    expect(await harness.getCloseLabel()).toBe('Close preview');
  });

  it('has no trigger at all with disablePreview, and says so', async () => {
    fixture.componentInstance.disablePreview.set(true);
    await fixture.whenStable();

    const harness = await lightbox();

    expect([await harness.isInteractive(), await harness.getOpenLabel()]).toEqual([false, null]);
    await expect(harness.open()).rejects.toThrow(/disablePreview/);

    // The image is still there — it is the button around it that is gone.
    expect(await harness.getThumbSrc()).toContain('/full.jpg');
  });

  it('reports the loading state, and treats a failed load as settled', async () => {
    const harness = await lightbox();
    expect(await harness.isLoading()).toBe(true);

    // A broken src has to clear the state too: `--loading` hides the image, so an
    // image that never resolves would shimmer for ever instead of showing its alt.
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLImageElement>('.wr-lightbox__thumb')!.dispatchEvent(new Event('error'));
    await fixture.whenStable();

    expect(await harness.isLoading()).toBe(false);
  });

  it('traps focus inside the viewer, which is what aria-modal promises', async () => {
    // jsdom lays nothing out, so the CDK's interactivity checker reads every element
    // as invisible and the trap finds nothing to focus. A box is what makes this
    // assertion about the trap rather than about the DOM stub.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(0, 0, 320, 240),
    ] as unknown as DOMRectList);

    const harness = await lightbox();
    await harness.open();
    await fixture.whenStable();

    expect(await harness.isFocusTrapped()).toBe(true);
  });

  it('matches on the alt text and the open state', async () => {
    expect(await loader.getHarnessOrNull(WrLightboxHarness.with({ alt: 'A photo of a cat' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrLightboxHarness.with({ alt: /cat$/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrLightboxHarness.with({ open: true }))).toBeNull();

    await (await lightbox()).open();
    expect(await loader.getHarnessOrNull(WrLightboxHarness.with({ open: true }))).not.toBeNull();
  });
});

describe('WrLightboxHarness — two lightboxes on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('gives each one its own viewer, even with both open', async () => {
    const cat = await loader.getHarness(WrLightboxHarness.with({ alt: 'Cat' }));
    const dog = await loader.getHarness(WrLightboxHarness.with({ alt: 'Dog' }));

    await cat.open();
    await dog.open();

    expect(await cat.getFullSrc()).toContain('/cat.jpg');
    expect(await dog.getFullSrc()).toContain('/dog.jpg');
    expect([await cat.getCaption(), await dog.getCaption()]).toEqual(['A cat', 'A dog']);
    expect([await cat.isViewerBound(), await dog.isViewerBound()]).toEqual([true, true]);
  });

  it('matches on a caption that only exists inside the viewer', async () => {
    await (await loader.getHarness(WrLightboxHarness.with({ alt: 'Dog' }))).open();

    expect(await loader.getHarnessOrNull(WrLightboxHarness.with({ caption: 'A dog' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrLightboxHarness.with({ caption: 'A cat' }))).toBeNull();
  });
});
