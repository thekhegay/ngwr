/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrTiltHarnessFilters, WrTiltRotation } from './interfaces';

/** The overlay `[glare]` appends — `aria-hidden`, and the only node the directive adds. */
const GLARE = '.wr-tilt-glare';

/** Pull one `name(value)` out of a transform string. */
function fromTransform(transform: string, fn: string): number | null {
  const match = new RegExp(`${fn}\\(([-\\d.]+)`).exec(transform);
  return match ? Number.parseFloat(match[1]) : null;
}

/**
 * Test harness for `[wrTilt]` and for `<wr-tilt-card>`, which applies it as a host
 * directive — one class, because they are one behaviour on two hosts.
 *
 * **The tilt itself needs a box, and a unit test has none.** The directive turns a
 * pointer position into two rotations by dividing by `getBoundingClientRect()`, which
 * is 0×0 in jsdom, so a move dispatched at a component that has not been given
 * dimensions writes `rotateX(NaNdeg)`. {@link movePointerTo} is still here because the
 * fix is one line in the SPEC — stub the host's rect, the way
 * `projects/lib/image-cropper/testing` documents — and because the two things worth
 * asserting on this component are only reachable through it: that a move writes a
 * transform at all, and that {@link leave} takes it away again.
 *
 * **{@link isFlat} is the reduced-motion assertion.** `onMove` returns before touching
 * the host when the user asked for less motion, so "no inline transform after a move"
 * is the whole contract, and it is one of the few reduced-motion behaviours in the
 * animation set that a test can actually see — most of the others live in a `@media`
 * block. Provide the `WrPlatform` stub and assert this.
 *
 * There is no `getGlareOpacity()` or `isGlareVisible()`: the overlay's gradient, its
 * blend mode and its fade all live in the stylesheet. And no `getMaxTilt()` /
 * `getPerspectiveInput()` — those would echo an input back rather than report what the
 * directive wrote; {@link getPerspective} and {@link getScale} read the transform the
 * host is actually carrying, which is the value that can be wrong.
 *
 * @example
 * ```ts
 * const card = await loader.getHarness(WrTiltHarness);
 * expect(await card.isFlat()).toBe(true);
 *
 * await card.movePointerTo(150, 50);   // the spec stubbed the rect first
 * expect((await card.getTilt())?.rotateY).toBeGreaterThan(0);
 *
 * await card.leave();
 * expect(await card.isFlat()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTiltHarness extends ComponentHarness {
  /** The directive on a consumer's element, and the card that hosts it. */
  static hostSelector = '[wrTilt], wr-tilt-card';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrTiltHarnessFilters = {}): HarnessPredicate<WrTiltHarness> {
    return new HarnessPredicate(WrTiltHarness, options)
      .addOption('glare', options.glare, async (harness, glare) => (await harness.hasGlare()) === glare)
      .addOption('flat', options.flat, async (harness, flat) => (await harness.isFlat()) === flat);
  }

  /**
   * Whether the host is at rest — no inline transform at all.
   *
   * True before the first move, after {@link leave}, and for the whole life of a card
   * whose user asked for less motion. It is the difference between "flat" and
   * "rotated by zero": the directive CLEARS the property rather than writing an
   * identity transform, so an empty string is the state and `rotateX(0deg)` would be
   * a component that tilted and came back the long way.
   */
  async isFlat(): Promise<boolean> {
    return (await this.getTransform()) === '';
  }

  /** The inline `transform` exactly as written, or `''` at rest. */
  async getTransform(): Promise<string> {
    return this.inlineStyle('transform');
  }

  /**
   * The two rotations the host is holding, in degrees, or `null` while it is flat.
   *
   * Parsed from the transform rather than recomputed: the harness has no more access
   * to the pointer maths than a consumer does, and the string is what the compositor
   * will read.
   */
  async getTilt(): Promise<WrTiltRotation | null> {
    const transform = await this.getTransform();
    if (transform === '') return null;

    const rotateX = fromTransform(transform, 'rotateX');
    const rotateY = fromTransform(transform, 'rotateY');
    return rotateX === null || rotateY === null ? null : { rotateX, rotateY };
  }

  /** The perspective the transform was written with, in pixels, or `null` while flat. */
  async getPerspective(): Promise<number | null> {
    return fromTransform(await this.getTransform(), 'perspective');
  }

  /** The scale the transform was written with, or `null` while flat. */
  async getScale(): Promise<number | null> {
    return fromTransform(await this.getTransform(), 'scale');
  }

  /**
   * Whether the host was set up to hold children in 3-D.
   *
   * Written once in the constructor, so it is true from first render and stays true —
   * which makes it the cheapest evidence that the directive is applied at all, on a
   * host where every other read is `''` until something moves.
   */
  async isPreserve3d(): Promise<boolean> {
    return (await this.inlineStyle('transform-style')) === 'preserve-3d';
  }

  /** Whether the glare overlay is installed (`[glare]`). */
  async hasGlare(): Promise<boolean> {
    return (await this.locatorForOptional(GLARE)()) !== null;
  }

  /**
   * Whether the glare is kept out of the accessibility tree.
   *
   * It is a decorative highlight with no text, so a screen reader must not stop on
   * it. Asserted rather than assumed because the overlay is created imperatively —
   * there is no template line for a reader to check.
   */
  async isGlareDecorative(): Promise<boolean> {
    const glare = await this.locatorForOptional(GLARE)();
    return glare !== null && (await glare.getAttribute('aria-hidden')) === 'true';
  }

  /**
   * Where the glare is pointing, as the two percentages the directive writes, or
   * `null` when there is no glare or nothing has moved yet.
   *
   * Cleared when the overlay is removed: a card that has given `[glare]` back should
   * not look like it is still tracking a pointer.
   */
  async getGlarePosition(): Promise<{ x: string; y: string } | null> {
    const x = await this.inlineStyle('--wr-tilt-glare-x');
    const y = await this.inlineStyle('--wr-tilt-glare-y');
    return x === '' || y === '' ? null : { x, y };
  }

  /**
   * Move a pointer over the host.
   *
   * **Stub the host's rect in your spec first.** The directive divides the pointer
   * offset by the host's width and height, and jsdom measures every element at 0×0,
   * so without a box the transform comes out as `NaN` — which is not a failure the
   * component would ever produce in a browser. One line does it:
   *
   * ```ts
   * host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
   * ```
   */
  async movePointerTo(clientX: number, clientY: number): Promise<void> {
    await (await this.host()).dispatchEvent('pointermove', { clientX, clientY });
  }

  /** Take the pointer off the host — which clears the transform and settles it flat. */
  async leave(): Promise<void> {
    await (await this.host()).dispatchEvent('pointerleave');
  }

  /** The projected content's text, trimmed. */
  async getContentText(): Promise<string> {
    return (await this.host()).text();
  }

  /**
   * One inline declaration, read off the `style` ATTRIBUTE.
   *
   * Not `getCssValue`, which is `getComputedStyle`: that resolves the stylesheet as
   * well, so `transform` would come back as the resolved matrix in a browser and
   * `--wr-tilt-glare-x` would answer with the sheet's own default. The attribute holds
   * what the directive wrote and nothing else, which is the only thing worth pinning.
   */
  private async inlineStyle(property: string): Promise<string> {
    const style = (await (await this.host()).getAttribute('style')) ?? '';

    for (const declaration of style.split(';')) {
      const colon = declaration.indexOf(':');
      if (colon === -1) continue;
      if (declaration.slice(0, colon).trim() !== property) continue;
      return declaration.slice(colon + 1).trim();
    }
    return '';
  }
}
