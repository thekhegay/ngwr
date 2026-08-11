/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Direction, Directionality } from '@angular/cdk/bidi';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { WrCarousel, WrCarouselSlide } from 'ngwr/carousel';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrCarouselHarness } from './wr-carousel-harness';

@Component({
  imports: [WrCarousel, WrCarouselSlide],
  template: `
    <wr-carousel
      [(active)]="active"
      [autoplay]="autoplay()"
      [loop]="loop()"
      [showArrows]="showArrows()"
      [showDots]="showDots()"
      [intervalMs]="500"
    >
      @for (slide of slides(); track slide) {
        <wr-carousel-slide>{{ slide }}</wr-carousel-slide>
      }
    </wr-carousel>
  `,
})
class Host {
  readonly slides = signal(['Alps', 'Fjords', 'Dunes']);
  readonly active = signal(0);
  readonly autoplay = signal(false);
  readonly loop = signal(true);
  readonly showArrows = signal(true);
  readonly showDots = signal(true);
}

/** Two carousels on one page — the shape that catches one answering for the other. */
@Component({
  imports: [WrCarousel, WrCarouselSlide],
  template: `
    <wr-carousel ariaLabel="Gallery">
      <wr-carousel-slide>Alps</wr-carousel-slide>
      <wr-carousel-slide>Fjords</wr-carousel-slide>
    </wr-carousel>

    <wr-carousel ariaLabel="Testimonials">
      <wr-carousel-slide>Ada</wr-carousel-slide>
      <wr-carousel-slide>Grace</wr-carousel-slide>
      <wr-carousel-slide>Alan</wr-carousel-slide>
    </wr-carousel>
  `,
})
class TwoHost {}

/**
 * Used exactly as a consumer would: through the loader, with no internals touched.
 *
 * Where the carousel IS gets asserted twice over — once from the dot carrying
 * `aria-current`, which is what a screen reader is told, and once from the track's
 * rendered offset, which is what an eye sees. They are the only two places the
 * component publishes it (the slides themselves say nothing about being current),
 * and a carousel that lights the right dot while parking the track in blank space
 * is the failure a one-sided spec sails past.
 */
describe('WrCarouselHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  /**
   * Mount the host, optionally mirrored. `Directionality` resolves the document's
   * direction when it is constructed, so a fake is the only way to reach the other
   * one without writing `document.dir` and leaking it into whatever runs next.
   */
  const mount = (dir: Direction = 'ltr'): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Directionality,
          useValue: { value: dir, valueSignal: signal(dir), change: new Subject<Direction>() },
        },
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  const carousel = (): Promise<WrCarouselHarness> => loader.getHarness(WrCarouselHarness);
  const active = (): number => fixture.componentInstance.active();

  /**
   * jsdom implements neither `TouchEvent` nor layout, so a touch is a plain event
   * carrying the one field the component reads — the staging `carousel.spec.ts` uses.
   * The harness never drags, but the track it reads goes through `calc()` while a
   * finger is down, and stripping that back to the settled percentage is a promise
   * only a live drag can hold it to.
   */
  const touch = (type: string, clientX?: number): Event => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { touches: clientX === undefined ? [] : [{ clientX }] });
    return event;
  };

  beforeEach(() => mount());
  afterEach(() => fixture.destroy());

  it('reads the ARIA a carousel owes, off the elements that can carry it', async () => {
    const gallery = await carousel();

    // `aria-roledescription` is dropped on an element with no semantic role, and the
    // host has none — so both of these live on the viewport or neither means anything.
    expect(await gallery.getRole()).toBe('group');
    expect(await gallery.getRoleDescription()).toBe('carousel');
    // Resolved, not raw: `ariaLabel` was never passed, and the component still names
    // the group through the i18n catalog's fallback.
    expect(await gallery.getAccessibleName()).toBe('Carousel');
    expect(await gallery.getSlideRoleDescriptions()).toEqual(['slide', 'slide', 'slide']);

    expect(await gallery.getPreviousLabel()).toBe('Previous slide');
    expect(await gallery.getNextLabel()).toBe('Next slide');
    expect(await gallery.getPaginationLabel()).toBe('Carousel pagination');
    // A dot is a bare button — this label is all a screen reader has to tell the
    // three of them apart.
    expect(await gallery.getDotLabels()).toEqual(['Go to slide 1', 'Go to slide 2', 'Go to slide 3']);
  });

  it('counts its slides and starts on the first one', async () => {
    const gallery = await carousel();

    expect(await gallery.getSlideCount()).toBe(3);
    expect(await gallery.getSlideTexts()).toEqual(['Alps', 'Fjords', 'Dunes']);
    expect(await gallery.getActiveIndex()).toBe(0);
    expect(await gallery.getActiveSlideText()).toBe('Alps');
    expect(await gallery.getTrackOffsetPercent()).toBe(0);

    expect(await gallery.hasArrows()).toBe(true);
    expect(await gallery.hasDots()).toBe(true);
    expect(await gallery.getDotCount()).toBe(3);
  });

  it('pages with the arrows, and the move reaches the host model', async () => {
    const gallery = await carousel();

    await gallery.next();

    expect(await gallery.getActiveIndex()).toBe(1);
    expect(await gallery.getActiveSlideText()).toBe('Fjords');
    expect(await gallery.getTrackOffsetPercent()).toBe(-100);
    expect(active()).toBe(1);

    await gallery.previous();

    expect(await gallery.getActiveIndex()).toBe(0);
    expect(await gallery.getTrackOffsetPercent()).toBe(0);
    expect(active()).toBe(0);
  });

  it('jumps to a slide from its dot, and the dot agrees with the paint', async () => {
    const gallery = await carousel();

    await gallery.goTo(2);

    expect(await gallery.getActiveIndex()).toBe(2);
    expect(await gallery.getActiveSlideText()).toBe('Dunes');
    expect(await gallery.getTrackOffsetPercent()).toBe(-200);
    expect(active()).toBe(2);
  });

  it('reports the settled slide while a finger is still on the track', async () => {
    const gallery = await carousel();
    await gallery.next();

    const root = fixture.nativeElement as HTMLElement;
    const viewport = root.querySelector<HTMLElement>('.wr-carousel__viewport')!;
    viewport.dispatchEvent(touch('touchstart', 100));
    viewport.dispatchEvent(touch('touchmove', 112));
    await fixture.whenStable();

    // The track is now `translateX(calc(-100% + 12px))`: the pixel half is the
    // finger's own displacement, physical in both directions, and belongs to no
    // slide — so the offset is the settled -100 and the slide is still the second.
    expect(root.querySelector<HTMLElement>('.wr-carousel__track')!.getAttribute('style')).toContain(
      'calc(-100% + 12px)'
    );
    expect(await gallery.getTrackOffsetPercent()).toBe(-100);
    expect(await gallery.getActiveIndex()).toBe(1);

    viewport.dispatchEvent(touch('touchend'));
    await fixture.whenStable();

    // And this is why the harness refuses to drag: with no layout the 20% threshold
    // is 0, so a 12px twitch clears it and pages the carousel backwards. Nothing
    // about a real finger is being measured.
    expect(await gallery.getActiveIndex()).toBe(0);
    expect(await gallery.getTrackOffsetPercent()).toBe(0);
  });

  it('refuses to guess when the dots stop announcing which slide is current', async () => {
    const gallery = await carousel();
    await gallery.goTo(1);

    // `aria-current` is the contract; the `--active` class next to it is paint. Strip
    // the attribute the page announces and the harness has to refuse — a harness
    // reading the class would happily answer 1 for a strip that tells a screen reader
    // nothing at all.
    for (const dot of (fixture.nativeElement as HTMLElement).querySelectorAll('.wr-carousel__dot')) {
      dot.removeAttribute('aria-current');
    }

    await expect(gallery.getActiveIndex()).rejects.toThrow(/aria-current/);
    await expect(gallery.getActiveSlideText()).rejects.toThrow(/aria-current/);
    // The paint is untouched, so the refusal came from the ARIA and not from a dot
    // that lost both.
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.wr-carousel__dot--active')).toHaveLength(1);
  });

  it('wraps at both ends while looping, and stops at them without it', async () => {
    const gallery = await carousel();

    await gallery.previous(); // backwards off the first slide

    expect(await gallery.getActiveIndex()).toBe(2);
    expect(await gallery.getTrackOffsetPercent()).toBe(-200);

    await gallery.next();
    expect(await gallery.getActiveIndex()).toBe(0);

    fixture.componentInstance.loop.set(false);
    await fixture.whenStable();

    await gallery.previous();
    expect(await gallery.getActiveIndex()).toBe(0);

    await gallery.goTo(2);
    await gallery.next();
    expect(await gallery.getActiveIndex()).toBe(2);
    expect(active()).toBe(2);
  });

  it('follows a slide the app picks, and one it takes away', async () => {
    const gallery = await carousel();

    fixture.componentInstance.active.set(2);
    await fixture.whenStable();

    expect(await gallery.getActiveIndex()).toBe(2);
    expect(await gallery.getActiveSlideText()).toBe('Dunes');

    // The list shrinks under the active index — the component pulls it back, and the
    // whole chrome goes with the second slide, so the index now has to come off the
    // track's offset rather than off a dot.
    fixture.componentInstance.slides.set(['Alps']);
    await fixture.whenStable();

    expect(await gallery.getSlideCount()).toBe(1);
    expect(await gallery.hasArrows()).toBe(false);
    expect(await gallery.hasDots()).toBe(false);
    expect(await gallery.getDotCount()).toBe(0);
    expect(await gallery.getDotLabels()).toEqual([]);
    expect(await gallery.getActiveIndex()).toBe(0);
    expect(await gallery.getTrackOffsetPercent()).toBe(0);
  });

  it('names the cause when the page has nothing left to click', async () => {
    fixture.componentInstance.slides.set(['Alps']);
    await fixture.whenStable();

    const gallery = await carousel();

    // A silent no-op here surfaces as an unrelated assertion three lines later.
    await expect(gallery.next()).rejects.toThrow(/fewer than two slides/);
    await expect(gallery.previous()).rejects.toThrow(/fewer than two slides/);
    await expect(gallery.getNextLabel()).rejects.toThrow(/no next arrow/);
    await expect(gallery.goTo(0)).rejects.toThrow(/renders no dots/);
    await expect(gallery.getPaginationLabel()).rejects.toThrow(/no dot group/);
    await expect(gallery.focus()).rejects.toThrow(/nothing inside it to land on/);
    await expect(gallery.blur()).rejects.toThrow(/no focus to release/);
  });

  it('enters at the first control a Tab press reaches, whatever slide is showing', async () => {
    const gallery = await carousel();
    await gallery.goTo(2);

    expect(await gallery.isFocused()).toBe(false);

    await gallery.focus();

    expect(await gallery.isFocused()).toBe(true);
    // Where focus goes and which slide is current are two different questions on this
    // component. The dots are ordinary buttons with no roving `tabindex`, so all three
    // are separate tab stops and the first control on the page is the prev arrow, not
    // the dot of the slide showing — asserted on the rendered element, since "some
    // control is focused" would pass for any of them.
    expect(document.activeElement?.classList.contains('wr-carousel__nav--prev')).toBe(true);
    expect(await gallery.getActiveIndex()).toBe(2);

    await gallery.blur();

    expect(await gallery.isFocused()).toBe(false);
  });

  it('reaches for the first dot instead when the arrows are hidden', async () => {
    fixture.componentInstance.showArrows.set(false);
    await fixture.whenStable();

    const gallery = await carousel();

    expect(await gallery.hasArrows()).toBe(false);
    expect(await gallery.hasDots()).toBe(true);
    await expect(gallery.next()).rejects.toThrow(/\[showArrows\] is false/);

    await gallery.focus();

    expect(document.activeElement?.classList.contains('wr-carousel__dot')).toBe(true);
    expect(await gallery.isFocused()).toBe(true);

    await gallery.goTo(1);
    expect(await gallery.getActiveIndex()).toBe(1);
  });

  it('refuses an index no slide has', async () => {
    const gallery = await carousel();

    await expect(gallery.goTo(3)).rejects.toThrow(/out of range/);
    await expect(gallery.goTo(-1)).rejects.toThrow(/out of range/);
    await expect(gallery.goTo(1.5)).rejects.toThrow(/whole number/);
    expect(await gallery.getActiveIndex()).toBe(0);
  });

  it('reports nothing about a carousel with no slides', async () => {
    fixture.componentInstance.slides.set([]);
    await fixture.whenStable();

    const gallery = await carousel();

    expect(await gallery.getSlideCount()).toBe(0);
    expect(await gallery.getSlideTexts()).toEqual([]);
    expect(await gallery.getSlideRoleDescriptions()).toEqual([]);
    // `0` would read like the first slide of a carousel that has none.
    await expect(gallery.getActiveIndex()).rejects.toThrow(/no <wr-carousel-slide> children/);
    await expect(gallery.getActiveSlideText()).rejects.toThrow(/no <wr-carousel-slide> children/);
  });

  describe('with the dots switched off', () => {
    beforeEach(async () => {
      fixture.componentInstance.showDots.set(false);
      await fixture.whenStable();
    });

    it('reports the slide from the rendered offset when there is no dot to read', async () => {
      const gallery = await carousel();

      expect(await gallery.hasDots()).toBe(false);
      expect(await gallery.getDotCount()).toBe(0);
      await expect(gallery.getPaginationLabel()).rejects.toThrow(/no dot group/);
      await expect(gallery.goTo(1)).rejects.toThrow(/\[showDots\] is false/);

      await gallery.next();

      // Nothing on the page announces the slide any more, so this is the offset and
      // the offset alone.
      expect(await gallery.getActiveIndex()).toBe(1);
      expect(await gallery.getTrackOffsetPercent()).toBe(-100);
    });
  });

  /**
   * The track is moved with a PHYSICAL `translateX` while the slides are laid out on
   * the inline axis, so a mirrored carousel travels the other way for the very same
   * slide. Both directions are asserted for every case: an RTL assertion on its own
   * cannot tell "mirrors correctly" from "always goes left".
   *
   * What does NOT mirror is the buttons — `next` is the next slide in both
   * directions, and the harness keeps those semantics.
   */
  describe('reading direction', () => {
    it('reports the same slide in both directions, though the track goes the other way', async () => {
      for (const [dir, offset] of [
        ['ltr', -100],
        ['rtl', 100],
      ] as const) {
        mount(dir);
        const gallery = await carousel();

        await gallery.next();

        expect(await gallery.getActiveIndex(), dir).toBe(1);
        expect(await gallery.getActiveSlideText(), dir).toBe('Fjords');
        expect(await gallery.getTrackOffsetPercent(), dir).toBe(offset);

        // The arrows keep their meaning: prev is the earlier slide either way.
        await gallery.previous();
        expect(await gallery.getActiveIndex(), dir).toBe(0);
      }
    });

    it('derives a mirrored offset back to the same slide with no dot to help', async () => {
      // The one that would break silently in the wild. With the dots hidden the index
      // comes off the transform, and a mirrored carousel writes `translateX(100%)`
      // where an LTR one writes `translateX(-100%)` — read signed, this answers -1
      // for a perfectly healthy RTL carousel, and every LTR spec above stays green.
      mount('rtl');
      fixture.componentInstance.showDots.set(false);
      await fixture.whenStable();

      const gallery = await carousel();
      await gallery.next();

      expect(await gallery.getTrackOffsetPercent()).toBe(100);
      expect(await gallery.getActiveIndex()).toBe(1);

      // Wrapping backwards off the first slide parks the track at the far end of a
      // mirrored strip — the largest offset there is, and still slide 2.
      await gallery.previous();
      await gallery.previous();

      expect(await gallery.getTrackOffsetPercent()).toBe(200);
      expect(await gallery.getActiveIndex()).toBe(2);
    });
  });

  /**
   * Autoplay moves content on its own, so WCAG 2.2.2 wants a way to stop it — and
   * that way has to reach a keyboard, hovering being no mechanism for someone who
   * never touches a mouse.
   *
   * `setInterval` is the ONLY timer faked here. Angular's zoneless scheduler runs
   * change detection from a MACROTASK and every harness call awaits `whenStable()`,
   * so faking `setTimeout` as well deadlocks the first `await`: the clock moves only
   * when the spec says so, and the spec is blocked waiting on the clock.
   */
  describe('autoplay', () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
    afterEach(() => vi.useRealTimers());

    /** Switch autoplay on. The interval is created from an effect, so it needs a pass. */
    const start = async (): Promise<WrCarouselHarness> => {
      fixture.componentInstance.autoplay.set(true);
      await fixture.whenStable();
      return carousel();
    };

    it('advances on its own, and the pointer holds it', async () => {
      const gallery = await start();

      vi.advanceTimersByTime(500);
      expect(await gallery.getActiveIndex()).toBe(1);

      // Aimed at the host, which is where the component listens: the arrows and dots
      // are the viewport's SIBLINGS, so in a browser a pointer resting on an arrow is
      // not over the viewport at all and a viewport-scoped hold would let the slide
      // change under it.
      await gallery.hover();
      vi.advanceTimersByTime(2000);
      expect(await gallery.getActiveIndex()).toBe(1);

      await gallery.mouseAway();
      vi.advanceTimersByTime(500);
      expect(await gallery.getActiveIndex()).toBe(2);
    });

    it('holds while the keyboard is inside it', async () => {
      const gallery = await start();

      await gallery.focus();
      expect(await gallery.isFocused()).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(await gallery.getActiveIndex()).toBe(0);

      await gallery.blur();
      vi.advanceTimersByTime(500);

      expect(await gallery.getActiveIndex()).toBe(1);
    });
  });
});

describe('WrCarouselHarness — two carousels on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('narrows by name, by slide count and by the text of a slide', async () => {
    const byName = await loader.getHarness(WrCarouselHarness.with({ ariaLabel: 'Gallery' }));
    const byPattern = await loader.getHarness(WrCarouselHarness.with({ ariaLabel: /^Testi/ }));
    const byCount = await loader.getHarness(WrCarouselHarness.with({ slideCount: 3 }));
    const byText = await loader.getHarness(WrCarouselHarness.with({ slideText: 'Grace' }));
    const byTextPattern = await loader.getHarness(WrCarouselHarness.with({ slideText: /^Alp/ }));

    expect(await byName.getSlideTexts()).toEqual(['Alps', 'Fjords']);
    expect(await byPattern.getSlideCount()).toBe(3);
    expect(await byCount.getAccessibleName()).toBe('Testimonials');
    expect(await byText.getAccessibleName()).toBe('Testimonials');
    expect(await byTextPattern.getAccessibleName()).toBe('Gallery');
    // `slideText` matches a slide EXACTLY for a string: 'Ada' is a slide, 'Ad' is not.
    expect(await loader.getAllHarnesses(WrCarouselHarness.with({ slideText: 'Ad' }))).toEqual([]);
    expect(await loader.getAllHarnesses(WrCarouselHarness.with({ slideCount: 9 }))).toEqual([]);
  });

  it('answers only for itself — its own dots, its own slide', async () => {
    const gallery = await loader.getHarness(WrCarouselHarness.with({ ariaLabel: 'Gallery' }));
    const quotes = await loader.getHarness(WrCarouselHarness.with({ ariaLabel: 'Testimonials' }));

    await quotes.goTo(2);

    expect(await quotes.getActiveIndex()).toBe(2);
    expect(await quotes.getActiveSlideText()).toBe('Alan');
    // Every part is queried under the harness's own host — a page-wide `.wr-carousel__dot`
    // lookup would have moved this one too, or read the wrong dot back.
    expect(await gallery.getActiveIndex()).toBe(0);
    expect(await gallery.getDotCount()).toBe(2);

    await gallery.next();

    expect(await gallery.getActiveIndex()).toBe(1);
    expect(await quotes.getActiveIndex()).toBe(2);
  });
});

/**
 * Every label the carousel renders routes through `ngwr/i18n`, so the harness reads
 * the RESOLVED text — which is the only text on the page. Only a real catalog can
 * tell the difference: without one, a lookup falls back to the same English string
 * and the assertion passes whether the wiring exists or not.
 */
describe('WrCarouselHarness — under a localized catalog', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reports the names the page actually announces', async () => {
    const gallery = await loader.getHarness(WrCarouselHarness);

    expect(await gallery.getAccessibleName()).toBe('Карусель');
    expect(await gallery.getPreviousLabel()).toBe('Предыдущий слайд');
    expect(await gallery.getNextLabel()).toBe('Следующий слайд');
    expect(await gallery.getPaginationLabel()).toBe('Пагинация карусели');
    expect(await gallery.getDotLabels()).toEqual(['Перейти к слайду 1', 'Перейти к слайду 2', 'Перейти к слайду 3']);

    // Naming a carousel by its label still finds it — the filter matches the resolved
    // name, not the input.
    expect(await loader.getAllHarnesses(WrCarouselHarness.with({ ariaLabel: 'Карусель' }))).toHaveLength(1);
  });
});
