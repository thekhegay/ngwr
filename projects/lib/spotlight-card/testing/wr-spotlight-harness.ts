/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrSpotlightHarnessFilters } from './interfaces';
import { wrSpotlightInlineVars } from './wr-spotlight-harness-vars';

/**
 * Test harness for `[wrSpotlight]` — the directive that makes a cursor-following
 * gradient possible on an element the consumer owns.
 *
 * **This harness reads PERCENTAGES. {@link WrSpotlightCardHarness}, shipped from the same
 * entry point, reads PIXELS.** Both write `--wr-spotlight-x` / `--wr-spotlight-y`; the
 * directive writes them as a share of its own box off `pointermove`, the card as a pixel
 * offset off `mousemove`. That is why {@link getSpotlightPosition} hands back raw strings
 * and not numbers — collapsing `'37.5%'` to `37.5` would hide the one thing that decides
 * whether the gradient lands where the cursor is, and would make the two halves of this
 * entry point look interchangeable when they are not.
 *
 * **The directive ships no styles and adds no node.** There is no class to assert, no
 * wrapper, no ARIA: whatever the element announced before the directive applies is
 * exactly what it announces after, and the gradient is entirely the consumer's own CSS.
 * So there is no `isSpotlightVisible()` — there is nothing here to be visible — and no
 * `getResetX()` / `getResetY()`, which would echo the inputs back rather than report the
 * coordinate the directive actually WROTE. The echo would pass while the written value
 * was wrong, which is not hypothetical (see {@link getSpotlightPosition}). And no
 * `respectsReducedMotion()`: neither export in this entry point implements the
 * preference — it is the library's one documented exemption, since a gradient tracks the
 * cursor and no content moves — so the method would answer the same for a directive that
 * honoured it and one that ignored it.
 *
 * @example
 * ```ts
 * const spotlight = await loader.getHarness(WrSpotlightHarness.with({ hostClass: 'card' }));
 *
 * expect(await spotlight.getSpotlightPosition()).toEqual({ x: '50%', y: '50%' });
 * await spotlight.movePointerTo(150, 25);   // stub the host's rect first
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSpotlightHarness extends ComponentHarness {
  static hostSelector = '[wrSpotlight]';

  /**
   * Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`.
   *
   * Both options describe the HOST rather than the directive, because the directive
   * leaves no mark of its own to match on.
   */
  static with(options: WrSpotlightHarnessFilters = {}): HarnessPredicate<WrSpotlightHarness> {
    return new HarnessPredicate(WrSpotlightHarness, options)
      .addOption('text', options.text, async (harness, text) =>
        HarnessPredicate.stringMatches((await harness.host()).text(), text)
      )
      .addOption('hostClass', options.hostClass, async (harness, hostClass) =>
        (await harness.host()).hasClass(hostClass)
      );
  }

  /**
   * The coordinates the directive has written, as the raw strings it wrote them.
   *
   * Strings on purpose — see this class's docs. The values are percentages of the host's
   * own box while a pointer is over it, and whatever `[resetX]` / `[resetY]` say
   * otherwise, so a `px` appearing here means something else is writing these variables.
   *
   * **Present from construction, before any pointer arrives.** The directive seeds the
   * reset coordinates in its constructor, so the first read is `50%` / `50%` on a fresh
   * host — do not mistake that for a pointer having been tracked. Worth knowing that the
   * constructor runs before signal inputs are bound, so a bound (or even a static)
   * `resetX` is NOT what appears here initially: it is honoured from the first
   * {@link leave} onward, and the highlight jumps at that point. Reading the written
   * coordinate rather than the input is what makes that visible at all.
   *
   * Throws once the directive has been destroyed, rather than answering with the last
   * value it happened to leave behind — {@link hasTrackedPointer} is the question to ask
   * when the host may be gone.
   */
  async getSpotlightPosition(): Promise<{ x: string; y: string }> {
    const vars = await this.vars();
    const x = vars.get('--wr-spotlight-x');
    const y = vars.get('--wr-spotlight-y');
    if (x === undefined || y === undefined) {
      throw new Error(
        'WrSpotlightHarness.getSpotlightPosition(): the host carries no `--wr-spotlight-x` / `--wr-spotlight-y`. ' +
          'The directive writes both in its constructor and removes both on destroy, so this is a torn-down ' +
          'directive rather than one that has not started — ask hasTrackedPointer() when the host may be gone.'
      );
    }
    return { x, y };
  }

  /**
   * Point at the host, in client coordinates.
   *
   * **Refuses on a host with no box, which in a unit test is every host.** The directive
   * divides the cursor offset by the element's own width and height, so a 0×0 rect writes
   * literally `Infinity%` or — at the origin — `NaN%` into the style. jsdom accepts either
   * string without complaint, so an unguarded harness would hand back something that looks
   * like a coordinate and describes nothing. Give the host a box first:
   *
   * ```ts
   * const el = fixture.nativeElement.querySelector('[wrSpotlight]');
   * el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
   * ```
   *
   * A `pointermove`, not a `mousemove` — the directive listens for the former, and the
   * component in the same entry point for the latter. It is dispatched on the host itself,
   * so it needs no hit test and cannot miss.
   */
  async movePointerTo(clientX: number, clientY: number): Promise<void> {
    const host = await this.host();
    const { width, height } = await host.getDimensions();
    if (!width || !height) {
      throw new Error(
        `WrSpotlightHarness.movePointerTo(${clientX}, ${clientY}): this host measures ${width}×${height}, so a ` +
          'pointer position over it means nothing — the directive divides the offset by the box, and the result ' +
          'goes into the style as `Infinity%` or `NaN%`. Stub `getBoundingClientRect` on the host first.'
      );
    }
    await host.dispatchEvent('pointermove', { clientX, clientY, pointerId: 1, isPrimary: true });
  }

  /**
   * Take the pointer away.
   *
   * Dispatches `pointerleave` — the directive's reset path, and the only place `[resetX]`
   * / `[resetY]` are read after construction. Needs no box: the handler writes the reset
   * strings straight through without measuring anything, which is why this one does not
   * refuse the way {@link movePointerTo} does.
   *
   * Not the CDK's `mouseAway()`, though that dispatches `pointerleave` too. This says what
   * it does, and it does not also fire the `mouseleave` / `mouseout` that the CDK helper
   * sends alongside it — events this directive ignores, and that would make a spec look
   * like it had covered more than it did.
   */
  async leave(): Promise<void> {
    await (await this.host()).dispatchEvent('pointerleave');
  }

  /**
   * Whether the directive still owns the host's spotlight variables.
   *
   * **This is "the directive is alive", not "a pointer has moved over it".** It is `true`
   * from the moment the directive constructs, because the constructor seeds the reset
   * coordinates — there is no earlier state to catch. What it distinguishes is a live
   * directive from a torn-down one: destroy removes both declarations from the element,
   * and nothing else in the repo asserts that cleanup. A directive that stopped removing
   * them would leave a stale gradient position on an element the consumer went on using,
   * and the only trace would be these two declarations outliving it.
   */
  async hasTrackedPointer(): Promise<boolean> {
    const vars = await this.vars();
    return vars.has('--wr-spotlight-x') && vars.has('--wr-spotlight-y');
  }

  /** The host's inline declarations — the directive's whole written output. */
  private async vars(): Promise<Map<string, string>> {
    return wrSpotlightInlineVars((await (await this.host()).getAttribute('style')) ?? '');
  }
}
