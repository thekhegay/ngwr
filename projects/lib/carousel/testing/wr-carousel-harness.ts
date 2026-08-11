/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrCarouselHarnessFilters } from './interfaces';

/**
 * The settled percentage out of `translateX(-100%)`, and out of the mid-drag
 * `translateX(calc(-100% + 12px))` — the pixel half is the finger, not the slide.
 */
const TRACK_OFFSET = /translateX\(\s*(?:calc\(\s*)?(-?[\d.]+)%/;

/**
 * Test harness for `<wr-carousel>` — drive the strip the way someone on the page
 * drives it.
 *
 * Everything it reads is public API: the `.wr-carousel__*` elements, the dots'
 * `aria-current`, and the `aria-roledescription` the viewport and each slide
 * publish. Two things are worth knowing before writing an assertion against it:
 *
 * - **The slides do not say which one is showing.** A `<wr-carousel-slide>` carries
 *   `role="group"` and `aria-roledescription="slide"` and nothing else — no
 *   `aria-current`, no `aria-hidden` on the ones off-screen. The current slide is
 *   published in exactly two places, the dot carrying `aria-current="true"` and the
 *   track's own offset, and {@link getActiveIndex} reads them in that order. There
 *   is likewise no live region: the component announces a move to nobody, so a
 *   harness cannot report one.
 * - **It never drags.** The swipe the component supports is a touch gesture
 *   measured against the viewport's own width, and jsdom has no layout — that width
 *   is 0, so the "20% of the viewport" threshold is 0 too and EVERY drag clears it,
 *   a 1px twitch included. The result says nothing about a real finger, and the spec
 *   pins that artifact rather than pretending otherwise. Every move here goes
 *   through the arrow buttons and the dots instead, which is the accessible path
 *   anyway. `carousel.spec.ts` is where the gesture itself is pinned, by staging the
 *   touch events and declaring an `offsetWidth`.
 *
 * @example
 * ```ts
 * const loader = TestbedHarnessEnvironment.loader(fixture);
 * const gallery = await loader.getHarness(WrCarouselHarness.with({ ariaLabel: 'Gallery' }));
 *
 * expect(await gallery.getSlideCount()).toBe(3);
 * await gallery.next();
 * expect(await gallery.getActiveIndex()).toBe(1);
 *
 * await gallery.goTo(2);
 * expect(await gallery.getActiveSlideText()).toBe('Dunes');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCarouselHarness extends ComponentHarness {
  static hostSelector = 'wr-carousel';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrCarouselHarnessFilters = {}): HarnessPredicate<WrCarouselHarness> {
    return new HarnessPredicate(WrCarouselHarness, options)
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption('slideCount', options.slideCount, async (harness, count) => (await harness.getSlideCount()) === count)
      .addOption('slideText', options.slideText, async (harness, text) => {
        for (const slide of await harness.getSlideTexts()) {
          if (await HarnessPredicate.stringMatches(slide, text)) return true;
        }
        return false;
      });
  }

  // What the carousel announces

  /**
   * The role the strip announces — `group`, which is what lets
   * `aria-roledescription` mean anything.
   *
   * Read off the VIEWPORT rather than the host, and that is the whole point of the
   * pairing: `aria-roledescription` is dropped on an element with no semantic role,
   * and the host element (`<wr-carousel>`) has none.
   */
  async getRole(): Promise<string | null> {
    return (await this.viewport()).getAttribute('role');
  }

  /** How the strip describes itself to a screen reader — `carousel`. */
  async getRoleDescription(): Promise<string | null> {
    return (await this.viewport()).getAttribute('aria-roledescription');
  }

  /**
   * The carousel's accessible name.
   *
   * The RESOLVED one, which is the only one the page has: the `ariaLabel` input
   * defaults to `null` and the component runs it through the `ngwr/i18n` catalog
   * (`carousel.label`, falling back to `'Carousel'`), so a consumer who passed
   * nothing still gets a named group and this still answers. Reporting the raw
   * input would say `null` about a carousel that announces itself perfectly well.
   */
  async getAccessibleName(): Promise<string | null> {
    return (await this.viewport()).getAttribute('aria-label');
  }

  /** The accessible name of the previous-slide button. Throws when the arrows are not rendered. */
  async getPreviousLabel(): Promise<string | null> {
    return (await this.nav('prev', 'getPreviousLabel')).getAttribute('aria-label');
  }

  /** The accessible name of the next-slide button. Throws when the arrows are not rendered. */
  async getNextLabel(): Promise<string | null> {
    return (await this.nav('next', 'getNextLabel')).getAttribute('aria-label');
  }

  /**
   * The accessible name of the dot group — what names the row of dots as a set
   * rather than leaving a screen reader with N unexplained buttons.
   *
   * Throws when the dots are not rendered: there is no group to name then, and a
   * `null` would read like a group that lost its label.
   */
  async getPaginationLabel(): Promise<string | null> {
    const dots = await this.locatorForOptional('.wr-carousel__dots')();
    if (!dots) {
      throw new Error(
        'WrCarouselHarness.getPaginationLabel(): this carousel renders no dot group — the dots are dropped ' +
          'when [showDots] is false or when there are fewer than two slides.'
      );
    }
    return dots.getAttribute('aria-label');
  }

  /**
   * What each slide announces itself as — `slide`, on every one of them, in DOM
   * order.
   *
   * The one piece of ARIA the slides carry, and the reason it is worth asking: it
   * is set on the slide component's own host, so a slide reaching the page through
   * some other element would come back `null` here while the carousel kept working.
   */
  async getSlideRoleDescriptions(): Promise<(string | null)[]> {
    const slides = await this.slides();
    return Promise.all(slides.map(slide => slide.getAttribute('aria-roledescription')));
  }

  // What the carousel is showing

  /** How many slides the carousel holds. */
  async getSlideCount(): Promise<number> {
    return (await this.slides()).length;
  }

  /** The text of every slide, in DOM order. */
  async getSlideTexts(): Promise<string[]> {
    const slides = await this.slides();
    return Promise.all(slides.map(slide => slide.text()));
  }

  /**
   * Which slide is showing, as a zero-based index.
   *
   * Taken from the dot carrying `aria-current="true"` whenever the dots are
   * rendered — that attribute is the only thing on the page that tells a screen
   * reader where in the strip it has got to, so it is the answer that matters —
   * and derived from the track's rendered offset when they are not, `[showDots]`
   * being off and a single-slide carousel both dropping the strip entirely.
   *
   * That fallback takes the MAGNITUDE of the offset on purpose. The transform is
   * physical while the slides sit on the inline axis, so a mirrored carousel paints
   * `translateX(100%)` for the very slide an LTR one paints `translateX(-100%)`
   * for; signed, this reported slide -1 for a perfectly healthy RTL carousel.
   *
   * Throws on a carousel with no slides at all — nothing is showing there, and `0`
   * would read like the first slide.
   */
  async getActiveIndex(): Promise<number> {
    const count = await this.getSlideCount();
    if (count === 0) {
      throw new Error(
        'WrCarouselHarness.getActiveIndex(): this carousel has no <wr-carousel-slide> children, so no slide is ' +
          'current — 0 would read like the first one.'
      );
    }

    const dots = await this.dots();
    if (dots.length) {
      for (let index = 0; index < dots.length; index++) {
        if ((await dots[index].getAttribute('aria-current')) === 'true') return index;
      }
      throw new Error(
        'WrCarouselHarness.getActiveIndex(): the dots are rendered but none of them carries aria-current, so the ' +
          'page tells a screen reader that no slide is current. The component clamps `active` into range, so look ' +
          'for a lost aria-current binding rather than an out-of-range index — the `--active` class alone is paint.'
      );
    }

    return Math.round(Math.abs(await this.getTrackOffsetPercent()) / 100);
  }

  /** The text of the slide that is showing. Throws on a carousel with no slides. */
  async getActiveSlideText(): Promise<string> {
    const index = await this.getActiveIndex();
    return (await this.slides())[index].text();
  }

  /**
   * The track's rendered offset, as a percentage of one viewport: `-100` for the
   * second slide of an LTR carousel, `+100` for the second slide of a mirrored one.
   *
   * Read off the inline `style` attribute rather than through `getCssValue()`,
   * because the percentage only survives where the component wrote it. jsdom hands
   * a declared `transform` straight back through `getComputedStyle`, so
   * `getCssValue()` answers correctly HERE and would stop the moment the same
   * harness ran against a real browser, which resolves the property to a pixel
   * matrix — a green unit test would be hiding it. Mid-drag the component writes
   * `translateX(calc(-100% + 12px))` and this reports the settled `-100`: the pixel
   * half is the finger's own displacement, which is physical in both directions and
   * belongs to no slide.
   *
   * Worth asserting next to {@link getActiveIndex}: it is the same fact painted
   * instead of announced, and a carousel that lights the right dot while parking
   * the track in blank space is exactly the failure nobody sees in a spec.
   */
  async getTrackOffsetPercent(): Promise<number> {
    const style = (await (await this.track()).getAttribute('style')) ?? '';
    const match = TRACK_OFFSET.exec(style);
    if (!match) {
      throw new Error(
        `WrCarouselHarness.getTrackOffsetPercent(): the track carries no translateX() offset (style: "${style}"). ` +
          'That transform is how the carousel moves at all, so it should always be there.'
      );
    }
    return Number(match[1]);
  }

  // The controls the carousel renders

  /** Whether the prev / next arrows are on the page. Both are dropped together. */
  async hasArrows(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-carousel__nav--next')()) !== null;
  }

  /** Whether the dot strip is on the page. */
  async hasDots(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-carousel__dots')()) !== null;
  }

  /** How many dots are rendered — one per slide, or `0` while the strip is hidden. */
  async getDotCount(): Promise<number> {
    return (await this.dots()).length;
  }

  /**
   * The accessible name of every dot, in order — `'Go to slide 1'`, … resolved
   * through the `ngwr/i18n` catalog.
   *
   * A dot is a bare button with no text of its own, so this label is all a screen
   * reader has to tell one from another. `[]` when the strip is hidden, matching
   * {@link getDotCount}.
   */
  async getDotLabels(): Promise<(string | null)[]> {
    const dots = await this.dots();
    return Promise.all(dots.map(dot => dot.getAttribute('aria-label')));
  }

  // Moving the carousel

  /**
   * Click the next-slide arrow.
   *
   * "Next" is the next SLIDE, not the next thing on the right: the buttons keep
   * their semantics under `dir="rtl"` and only the travel under them turns around.
   * At the last slide this wraps to the first one, unless `[loop]` is off — in
   * which case it legitimately does nothing, so nothing is asserted about the move.
   */
  async next(): Promise<void> {
    return (await this.nav('next', 'next')).click();
  }

  /** Click the previous-slide arrow. Wraps to the last slide unless `[loop]` is off. */
  async previous(): Promise<void> {
    return (await this.nav('prev', 'previous')).click();
  }

  /**
   * Jump to a slide by clicking its dot — the only way the page offers to reach a
   * slide directly.
   *
   * Throws when the dots are hidden (the component's own `goTo()` is still there
   * for a spec holding the instance, but nothing on the page can be clicked) and
   * throws on an index no slide has, rather than clicking nothing and leaving the
   * carousel where it was.
   */
  async goTo(index: number): Promise<void> {
    const dots = await this.dots();
    if (!dots.length) {
      throw new Error(
        `WrCarouselHarness.goTo(${index}): this carousel renders no dots, and they are the only way to reach a ` +
          'slide directly from the page — they are dropped when [showDots] is false or when there are fewer than ' +
          'two slides. Use next() / previous(), or write the active index from the host.'
      );
    }
    if (!Number.isInteger(index) || index < 0 || index >= dots.length) {
      throw new Error(
        `WrCarouselHarness.goTo(${index}): out of range — this carousel has ${dots.length} slides, so the index ` +
          `must be a whole number between 0 and ${dots.length - 1}.`
      );
    }
    return dots[index].click();
  }

  // Holding autoplay

  /**
   * Move the pointer onto the carousel, which is what HOLDS autoplay.
   *
   * Aimed at the host and not the viewport, deliberately: the arrows and the dots
   * are the viewport's SIBLINGS, so a viewport-scoped hover would let a slide
   * change under a cursor that is aiming at an arrow.
   */
  async hover(): Promise<void> {
    return (await this.host()).hover();
  }

  /** Move the pointer away again, releasing the hold. */
  async mouseAway(): Promise<void> {
    return (await this.host()).mouseAway();
  }

  /**
   * Put keyboard focus on the first control the carousel renders — the previous
   * arrow, or the first dot when the arrows are hidden.
   *
   * This is the keyboard half of the autoplay hold: WCAG 2.2.2 wants a way to stop
   * moving content, and hovering is not one for someone who never touches a mouse,
   * so the component listens for `focusin` on its host as well. Focus lands on the
   * carousel's OWN controls; anything focusable a slide happens to project is not
   * this harness's business, though in a browser it would hold autoplay just the
   * same.
   *
   * Note what this is NOT: the dot of the slide showing. The dots are ordinary
   * buttons with no roving `tabindex`, so each of them is a tab stop of its own and
   * the first one a Tab press meets is the prev arrow whatever slide is current —
   * two different questions, answered here and by {@link getActiveIndex}.
   *
   * Throws when the carousel renders no controls at all, because then there is
   * nothing for a Tab press to land on and no keyboard mechanism to assert.
   */
  async focus(): Promise<void> {
    const [first] = await this.controls();
    if (!first) {
      throw new Error(
        'WrCarouselHarness.focus(): this carousel renders no controls of its own — the arrows and the dots are ' +
          'both gone (a single slide, or [showArrows] and [showDots] switched off), so a Tab press has nothing ' +
          'inside it to land on.'
      );
    }
    return first.focus();
  }

  /**
   * Take focus off whichever of the carousel's controls holds it, releasing the
   * hold {@link focus} started.
   *
   * Throws when none of them is focused: `focusout` is what the component listens
   * for, and blurring an element that never had focus fires nothing — a quiet
   * no-op here surfaces as an autoplay assertion failing three lines later.
   */
  async blur(): Promise<void> {
    for (const control of await this.controls()) {
      if (await control.isFocused()) return control.blur();
    }
    throw new Error(
      'WrCarouselHarness.blur(): none of the controls this carousel renders holds focus, so there is no focus to ' +
        'release. Call focus() first — the hold is released by blurring the element that took it.'
    );
  }

  /** Whether one of the carousel's own controls holds focus — which is what holds autoplay. */
  async isFocused(): Promise<boolean> {
    for (const control of await this.controls()) {
      if (await control.isFocused()) return true;
    }
    return false;
  }

  // Internals

  /** The element that carries the carousel's role and name. */
  private async viewport(): Promise<TestElement> {
    return this.locatorFor('.wr-carousel__viewport')();
  }

  /** The moving strip, whose inline transform is where the carousel IS. */
  private async track(): Promise<TestElement> {
    return this.locatorFor('.wr-carousel__track')();
  }

  private async slides(): Promise<TestElement[]> {
    return this.locatorForAll('wr-carousel-slide')();
  }

  private async dots(): Promise<TestElement[]> {
    return this.locatorForAll('.wr-carousel__dot')();
  }

  /**
   * Every control the carousel renders itself, in the order a Tab press meets
   * them: the two arrows, then the dots.
   */
  private async controls(): Promise<TestElement[]> {
    const navs = await this.locatorForAll('.wr-carousel__nav')();
    return [...navs, ...(await this.dots())];
  }

  /** One arrow, or a failure naming both reasons it might not be there. */
  private async nav(side: 'prev' | 'next', caller: string): Promise<TestElement> {
    const button = await this.locatorForOptional(`.wr-carousel__nav--${side}`)();
    if (!button) {
      throw new Error(
        `WrCarouselHarness.${caller}(): this carousel renders no ${side} arrow — the arrows are dropped when ` +
          '[showArrows] is false or when there are fewer than two slides to page through.'
      );
    }
    return button;
  }
}
