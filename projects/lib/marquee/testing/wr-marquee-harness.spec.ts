import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, type TemplateRef, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { WrMarquee, type WrMarqueeItem } from 'ngwr/marquee';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrMarqueeHarness } from './wr-marquee-harness';
import { WrMarqueeItemHarness } from './wr-marquee-item-harness';

const IMAGES: readonly WrMarqueeItem[] = [
  { src: '/a.png', alt: 'Acme' },
  { src: '/b.png', alt: 'Beta', href: 'https://example.test/beta' },
  { src: '/c.png', href: 'https://example.test/c' },
];

@Component({
  imports: [WrMarquee],
  template: `
    <ng-template #badge><span class="badge">Acme Corp</span></ng-template>
    <wr-marquee
      [items]="items()"
      [ariaLabel]="ariaLabel()"
      [gap]="gap()"
      [itemHeight]="itemHeight()"
      [fadeOut]="fadeOut()"
      [fadeOutColor]="fadeOutColor()"
      [scaleOnHover]="scaleOnHover()"
    />
  `,
})
class Host {
  readonly badge = viewChild.required<TemplateRef<unknown>>('badge');
  readonly items = signal<readonly WrMarqueeItem[]>(IMAGES);
  readonly ariaLabel = signal<string | null>(null);
  readonly gap = signal(32);
  readonly itemHeight = signal(28);
  readonly fadeOut = signal(false);
  readonly fadeOutColor = signal('');
  readonly scaleOnHover = signal(false);
}

/**
 * The scroll is a `requestAnimationFrame` loop over measured widths and none of it
 * reaches a unit test — so what is pinned here is the markup the loop moves: the copies,
 * which of them a screen reader is allowed to see, the names on links that carry no text
 * of their own, and the two lengths the stylesheet reads.
 */
describe('WrMarqueeHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const marquee = (): Promise<WrMarqueeHarness> => loader.getHarness(WrMarqueeHarness);

  /** Swap in template-driven entries, which announce themselves differently from images. */
  const useTemplateItems = async (): Promise<void> => {
    const badge = fixture.componentInstance.badge();
    fixture.componentInstance.items.set([
      { node: badge, href: 'https://example.test/badge' },
      { node: badge, ariaLabel: 'Handmade' },
    ]);
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('is a named landmark', async () => {
    const harness = await marquee();

    expect(await harness.getRole()).toBe('region');
    expect(await harness.getAccessibleName()).toBe('Marquee');
  });

  it('takes a name from the consumer', async () => {
    fixture.componentInstance.ariaLabel.set('Our customers');
    await fixture.whenStable();

    expect(await (await marquee()).getAccessibleName()).toBe('Our customers');
  });

  it('repeats the sequence but announces it once', async () => {
    const harness = await marquee();

    // The copy count is decided by measurement, so it sits at the floor of 2 here.
    expect(await harness.getCopyCount()).toBeGreaterThanOrEqual(2);
    expect(await harness.getAnnouncedCopyCount()).toBe(1);
  });

  it('counts the entries of the first copy only', async () => {
    const harness = await marquee();

    // Two copies of three entries: an unscoped query would say six.
    expect(await harness.getCopyCount()).toBe(2);
    expect(await harness.getItemCount()).toBe(3);
    expect(await harness.getItems()).toHaveLength(3);
  });

  it('gives every image an alt, empty where the logo is decoration', async () => {
    // A `null` in this list would be a MISSING attribute, which announces the file name.
    expect(await (await marquee()).getImageAlts()).toEqual(['Acme', 'Beta', '']);
  });

  it('names every link, falling back for one with nothing to call itself', async () => {
    const links = await (await marquee()).getLinks();

    expect(links).toEqual([
      { href: 'https://example.test/beta', name: 'Beta' },
      { href: 'https://example.test/c', name: 'link' },
    ]);
  });

  it('publishes the lengths the stylesheet reads', async () => {
    const harness = await marquee();
    expect([await harness.getGap(), await harness.getItemHeight()]).toEqual([32, 28]);

    fixture.componentInstance.gap.set(8);
    fixture.componentInstance.itemHeight.set(64);
    await fixture.whenStable();

    expect([await harness.getGap(), await harness.getItemHeight()]).toEqual([8, 64]);
  });

  it('refuses a length that lost its unit', async () => {
    // What a dropped `.px` on the host binding would leave behind: a bare number, which
    // is an invalid declaration the stylesheet quietly replaces with its own default.
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('wr-marquee')!
      .style.setProperty('--wr-marquee-gap', '8');

    await expect((await marquee()).getGap()).rejects.toThrow(/rather than a px length/);
  });

  it('takes the fade and its colour only when asked', async () => {
    const harness = await marquee();
    expect([await harness.hasFade(), await harness.getFadeColor()]).toEqual([false, null]);

    fixture.componentInstance.fadeOut.set(true);
    fixture.componentInstance.fadeOutColor.set('var(--wr-color-success)');
    await fixture.whenStable();

    // The colour comes back as it was written, not as a resolved colour.
    expect([await harness.hasFade(), await harness.getFadeColor()]).toEqual([true, 'var(--wr-color-success)']);
  });

  it('takes the scale-on-hover modifier only when asked', async () => {
    const harness = await marquee();
    expect(await harness.hasScaleOnHover()).toBe(false);

    fixture.componentInstance.scaleOnHover.set(true);
    await fixture.whenStable();
    expect(await harness.hasScaleOnHover()).toBe(true);
  });

  it('matches on the region name', async () => {
    expect(await loader.getHarnessOrNull(WrMarqueeHarness.with({ ariaLabel: 'Marquee' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrMarqueeHarness.with({ ariaLabel: 'Partners' }))).toBeNull();
  });

  describe('an entry', () => {
    it('announces an unlinked image by its alt', async () => {
      const [acme] = await (await marquee()).getItems();

      expect([await acme.getAccessibleName(), await acme.isLink(), await acme.getHref()]).toEqual([
        'Acme',
        false,
        null,
      ]);
      expect(await acme.isDecorative()).toBe(false);
    });

    it('announces a linked image by the link, and opens it safely', async () => {
      const [, beta] = await (await marquee()).getItems();

      expect(await beta.isLink()).toBe(true);
      expect(await beta.getAccessibleName()).toBe('Beta');
      expect(await beta.getHref()).toBe('https://example.test/beta');
      expect(await beta.opensInNewTab()).toBe(true);
    });

    it('keeps a decorative image out of the tree behind its link', async () => {
      const [, , plain] = await (await marquee()).getItems();

      expect(await plain.getAccessibleName()).toBe('link');
      expect(await plain.isDecorative()).toBe(true);
    });

    it('refuses to talk about the tab behaviour of something that is not a link', async () => {
      const [acme] = await (await marquee()).getItems();

      await expect(acme.opensInNewTab()).rejects.toThrow(/is not a link/);
    });

    it('hides a projected node inside a named link, and leaves a named one alone', async () => {
      await useTemplateItems();
      const [linked, named] = await (await marquee()).getItems();

      // The link speaks for the first; the second announces its own projected text.
      expect([await linked.getAccessibleName(), await linked.isDecorative()]).toEqual(['link', true]);
      expect([await named.getAccessibleName(), await named.isDecorative()]).toEqual(['Acme Corp', false]);
    });

    it('refuses to guess for an entry that rendered neither a node nor an image', async () => {
      const [acme] = await (await marquee()).getItems();
      (fixture.nativeElement as HTMLElement).querySelector('.wr-marquee__item img')!.remove();

      await expect(acme.isDecorative()).rejects.toThrow(/neither a projected node nor an image/);
    });

    it('matches on a name and on being a link', async () => {
      // Two copies of three entries, so an unscoped query answers in multiples — which is
      // exactly why getItems() exists and scopes itself to the first copy.
      expect(await loader.getAllHarnesses(WrMarqueeItemHarness.with({ name: 'Acme' }))).toHaveLength(2);
      expect(await loader.getAllHarnesses(WrMarqueeItemHarness.with({ link: true }))).toHaveLength(4);
      expect(await loader.getAllHarnesses(WrMarqueeItemHarness.with({ link: false }))).toHaveLength(2);
      expect(await (await marquee()).getItems()).toHaveLength(3);
    });
  });
});

describe('WrMarqueeHarness under a localized catalog', () => {
  it('takes both of its names from the catalog', async () => {
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

    const harness = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrMarqueeHarness);

    expect(await harness.getAccessibleName()).not.toBe('Marquee');
    expect((await harness.getLinks())[1].name).not.toBe('link');

    fixture.destroy();
  });
});
