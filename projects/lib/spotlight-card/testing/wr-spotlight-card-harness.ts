/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrSpotlightCardHarnessFilters } from './interfaces';
import { wrSpotlightInlineVars } from './wr-spotlight-harness-vars';

/** `120px` — the card writes its pointer coordinates as a pixel length, always. */
const PIXEL_LENGTH = /^(-?[\d.]+)px$/;

/** `80%` — the radius, whose `%` suffix is the half that makes the gradient legal. */
const PERCENTAGE = /^(-?[\d.]+)%$/;

/**
 * Test harness for `<wr-spotlight-card>` — a card with a soft radial highlight that
 * follows the cursor.
 *
 * **The component's entire output is three custom properties on its own host, and this
 * harness reads them off the inline declaration.** There is no DOM for the highlight at
 * all: it is a `::before` pseudo-element, painted by the stylesheet from those three
 * values. So the paint is out of reach here and always will be — what is in reach is the
 * arithmetic and the exact spelling that feeds it, which is where this component breaks.
 *
 * **This harness reads PIXELS. {@link WrSpotlightHarness}, the `[wrSpotlight]` directive
 * shipped from the same entry point, reads PERCENTAGES.** Both write
 * `--wr-spotlight-x` / `--wr-spotlight-y`, in different units, off different events —
 * the card listens for `mousemove`, the directive for `pointermove`. That is deliberate
 * and documented, and it is also the mistake waiting to happen: putting `wrSpotlight` on
 * a `<wr-spotlight-card>` gives you two handlers overwriting one variable in units that
 * do not agree. Reach for the harness that matches the thing under test.
 *
 * **{@link movePointerTo} needs the card to have a box, and in a unit test it has none.**
 * The component subtracts its own `getBoundingClientRect()` from the client coordinate,
 * and jsdom answers that with a 0×0 rect at the origin — so the subtraction is a no-op
 * and the coordinate comes back unchanged. No throw here, unlike the directive's version:
 * the answer is degenerate rather than wrong, and it is legitimately what a real card
 * with no box would report. But a spec that asserts `x === clientX` against an unstubbed
 * rect has proved nothing about the box-relative conversion, which is the only thing
 * {@link getSpotlightPosition} is for. Give the host a box first:
 *
 * ```ts
 * const card = fixture.nativeElement.querySelector('wr-spotlight-card');
 * card.getBoundingClientRect = () => ({ left: 40, top: 20, width: 200, height: 100 }) as DOMRect;
 * ```
 *
 * Several plausible methods are deliberately absent. There is no `isSpotlightVisible()`
 * or `getSpotlightOpacity()`: the highlight sits at `opacity: 0` and is lifted to `0.6`
 * only under `:hover` / `:focus-within`, both of which are stylesheet selectors on a
 * pseudo-element — jsdom loads no stylesheet, matches no `:hover`, and cannot read a
 * pseudo-element's style at any time, so any answer would be invented. No `getGradient()`
 * for the same reason. No `hover()` / `mouseAway()` wrappers, which would be worse than
 * missing: the CDK's versions dispatch `mouseenter` / `mouseover` / `mouseleave`, none of
 * which this component listens to and none of which changes a `:hover` match in a test —
 * a spec calling them would look like it exercised the reveal and would have exercised
 * nothing. No `getSpotlightRect()` or `getCardSize()`, which are layout. And no
 * `respectsReducedMotion()`: this is the one animation component in the library that
 * deliberately does not implement the preference — a gradient tracks the cursor and no
 * content moves — so the method would answer identically for a component that honoured it
 * and one that ignored it.
 *
 * @example
 * ```ts
 * const card = await loader.getHarness(WrSpotlightCardHarness.with({ text: 'Hover me' }));
 *
 * expect(await card.getRadiusPercent()).toBe(80);
 * expect(await card.getSpotlightColor()).toBeNull();       // the theme decides
 * expect(await card.getSpotlightPosition()).toBeNull();    // nothing has pointed at it
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSpotlightCardHarness extends ComponentHarness {
  static hostSelector = 'wr-spotlight-card';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSpotlightCardHarnessFilters = {}): HarnessPredicate<WrSpotlightCardHarness> {
    return new HarnessPredicate(WrSpotlightCardHarness, options).addOption('text', options.text, (harness, text) =>
      HarnessPredicate.stringMatches(harness.getContentText(), text)
    );
  }

  /**
   * Where the gradient fades out, as a percentage of its own radius.
   *
   * Returns the number, but the assertion it really makes is about the `%` that was
   * stripped to get it — this method refuses a bare `80`. The stylesheet interpolates the
   * variable straight into `transparent var(--wr-spotlight-radius, 80%)`, where a unitless
   * value is not a length, so the whole `radial-gradient()` declaration is dropped and the
   * highlight disappears with nothing in the console to say why. Reading this as a plain
   * number would sail past exactly that.
   *
   * Always present, whatever the input says: a `[radius]` that is not a number coerces
   * back to the default 80 rather than writing nonsense into the sheet.
   */
  async getRadiusPercent(): Promise<number> {
    const raw = (await this.vars()).get('--wr-spotlight-radius') ?? null;
    const match = raw === null ? null : PERCENTAGE.exec(raw);
    if (!match) {
      throw new Error(
        `WrSpotlightCardHarness.getRadiusPercent(): \`--wr-spotlight-radius\` reads "${raw ?? '(absent)'}" on the ` +
          'host, and the stylesheet needs a percentage there — it drops the whole gradient for a bare number. The ' +
          'card writes this one on every render whatever the input says, so a missing or unsuffixed value means ' +
          'the binding itself stopped reaching the element.'
      );
    }
    return Number.parseFloat(match[1]);
  }

  /**
   * The highlight colour the author asked for, or `null` when they left it to the theme.
   *
   * `null` IS the contract for an unset `[spotlightColor]`, not a gap in it. The
   * stylesheet's own default is `rgba(var(--wr-color-on-surface-rgb), .15)`, and that
   * token flips per theme — which is what makes one component read as a dark glow on a
   * light surface and a light beam on a dark one. A card that started writing a concrete
   * colour here would look right in whichever theme it was authored against and wrong in
   * the other, and this is the only method that can tell.
   */
  async getSpotlightColor(): Promise<string | null> {
    return (await this.vars()).get('--wr-spotlight-color') ?? null;
  }

  /**
   * Where the highlight last sat, in pixels from the card's own top-left corner. `null`
   * until something has pointed at the card.
   *
   * Pixels, not percentages — see this class's docs for why the distinction matters
   * inside this one entry point.
   *
   * `null` is a state of its own rather than a stand-in for `{ x: 0, y: 0 }`: before the
   * first move the stylesheet's `50% / 50%` default applies, and a pointer at the card's
   * own origin legitimately reports zero, so folding the two together would make an
   * untouched card indistinguishable from one being pointed at in its corner.
   *
   * Note there is no reset when the cursor leaves, and that is not an oversight the
   * harness papers over: the stylesheet fades the whole overlay to `opacity: 0` on leave,
   * so nothing is parked visibly — but the coordinate stays written for the life of the
   * element. `null` therefore means "no pointer has EVER arrived", not "none is here now".
   */
  async getSpotlightPosition(): Promise<{ x: number; y: number } | null> {
    const vars = await this.vars();
    const x = vars.get('--wr-spotlight-x');
    const y = vars.get('--wr-spotlight-y');
    if (x === undefined || y === undefined) return null;

    return { x: this.parsePixels(x, '--wr-spotlight-x'), y: this.parsePixels(y, '--wr-spotlight-y') };
  }

  /**
   * Point at the card, in client coordinates.
   *
   * A `mousemove`, not a `pointermove` — the component listens for the former, and the
   * directive in the same entry point for the latter, so a pointer event dispatched here
   * is silently ignored. It goes to the host itself, so it needs no hit test and cannot
   * miss in a test that has no layout; the coordinates only ever reach the component's
   * own subtraction.
   *
   * Stub the host's `getBoundingClientRect` before calling this, or the subtraction is
   * invisible — see this class's docs.
   */
  async movePointerTo(clientX: number, clientY: number): Promise<void> {
    await (await this.host()).dispatchEvent('mousemove', { clientX, clientY });
  }

  /**
   * The projected content's text, trimmed.
   *
   * Read from the host, which is the whole assertion: the template is a bare
   * `<ng-content />` with no wrapper element, so content lands as a direct child and an
   * interactive one keeps its own name and role. The component adds no ARIA and no node
   * of its own — there is nothing else here for a harness to ask about.
   */
  async getContentText(): Promise<string> {
    return (await this.host()).text();
  }

  /** The host's inline declarations — the component's whole written output. */
  private async vars(): Promise<Map<string, string>> {
    return wrSpotlightInlineVars((await (await this.host()).getAttribute('style')) ?? '');
  }

  /** One written coordinate, as a number, insisting on the `px` the card promises. */
  private parsePixels(raw: string, name: string): number {
    const match = PIXEL_LENGTH.exec(raw);
    if (!match) {
      throw new Error(
        `WrSpotlightCardHarness.getSpotlightPosition(): \`${name}\` reads "${raw}", which is not the pixel length ` +
          'the card writes. A percentage here is the tell that `[wrSpotlight]` is on the same element — the two ' +
          'exports of this entry point share these variables and disagree about the unit.'
      );
    }
    return Number.parseFloat(match[1]);
  }
}
