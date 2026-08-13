/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrBorderGlowHarnessFilters } from './interfaces';

/** The seven halo steps, in the order the component writes them: 100%, 60%, 50%, 40%, 30%, 20%, 10%. */
const GLOW_VAR_SUFFIXES = ['', '-60', '-50', '-40', '-30', '-20', '-10'] as const;

/** The seven mesh-gradient slots, spelled out rather than numbered — as the component names them. */
const GRADIENT_VAR_SLOTS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'] as const;

/** `hsl(40deg 80% 80% / 65%)` — the alpha, which is the only part `glowIntensity` moves. */
const GLOW_ALPHA = /\/\s*(-?[\d.]+)%\s*\)\s*$/;

/** `radial-gradient(at 80% 55%, #c084fc 0px, transparent 50%)` — the colour, not the position. */
const RADIAL_GRADIENT_COLOR = /^radial-gradient\(\s*at\s+[^,]+,\s*(.+?)\s+0px\s*,/;

/** `linear-gradient(#c084fc 0 100%)` — the flat base slice. */
const LINEAR_GRADIENT_COLOR = /^linear-gradient\(\s*(.+?)\s+0\s+100%\s*\)$/;

/**
 * Split an inline `style` attribute into its declarations.
 *
 * Read from the attribute rather than through `getCssValue()` on purpose. jsdom echoes
 * an inline custom property back through `getComputedStyle`, so the computed read passes
 * here and would answer something else entirely in a browser — where the stylesheet's
 * own per-theme default resolves and "the author left this to the theme" quietly becomes
 * a colour. The attribute holds what the component itself wrote, and nothing else.
 */
function parseInlineDeclarations(style: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const declaration of style.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon === -1) continue;
    const name = declaration.slice(0, colon).trim();
    if (name !== '') declarations.set(name, declaration.slice(colon + 1).trim());
  }
  return declarations;
}

/**
 * Test harness for `<wr-border-glow>` — a card whose border lights up under the cursor.
 *
 * **Nearly all of this component is a bag of custom properties written onto the host,
 * and that is what the harness reads.** The paint itself — the conic mask, the stacked
 * `box-shadow` halo, the soft-light bloom — lives in the stylesheet, so a unit test can
 * never see it. What it CAN see is the arithmetic that feeds it, and that is where the
 * breakages are: the seven-step alpha ramp {@link getGlowAlphaRamp} derives from
 * `glowIntensity`, the `[0,1,2,0,1,2,1]` palette mapping in {@link getGradientColors}
 * with its clamp for short palettes, and the pointer maths behind
 * {@link getPointerAngle} / {@link getEdgeProximity}.
 *
 * **Every custom-property getter reads the inline declaration** — see
 * {@link parseInlineDeclarations} for why a computed read would be a different, and
 * wrong, question.
 *
 * **A colour getter answering `null` means the component has never written that
 * variable**, which is the contract when the input is unset: the stylesheet's per-theme
 * default takes over. Note that it does not un-write them either — setting `[glowColor]`
 * and then putting it back to `null` leaves the last value on the host — so `null` is
 * "never set", not "not set now".
 *
 * There is deliberately no `getGlowOpacity()`, `isGlowVisible()` or `isHovered()`: the
 * visible strength is a `calc()` in the stylesheet gated behind `:not(:hover)`, and
 * jsdom loads no stylesheet and matches no `:hover`, so any number would be invented.
 * There is no measured halo extent either — `.wr-border-glow__edge` is 0×0 in a test,
 * and {@link getGlowRadius} reads what the component asked for instead. And there is no
 * `getSweepProgress()` / `waitForSweep()`: the mount sweep is a four-second chain of
 * `requestAnimationFrame` tweens, so awaiting it either hangs the spec or samples one
 * frame and reports a value that was never settled. {@link isSweeping} answers the one
 * durable fact — that the sweep started.
 *
 * @example
 * ```ts
 * const card = await loader.getHarness(WrBorderGlowHarness.with({ text: /Hover me/ }));
 *
 * expect(await card.getBorderRadius()).toBe(28);
 * expect(await card.getPointerAngle()).toBeNull();   // nothing has pointed at it yet
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrBorderGlowHarness extends ComponentHarness {
  static hostSelector = 'wr-border-glow';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrBorderGlowHarnessFilters = {}): HarnessPredicate<WrBorderGlowHarness> {
    return new HarnessPredicate(WrBorderGlowHarness, options)
      .addOption('text', options.text, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getContentText(), text)
      )
      .addOption('sweeping', options.sweeping, async (harness, sweeping) => (await harness.isSweeping()) === sweeping);
  }

  private readonly edge = this.locatorFor('.wr-border-glow__edge');

  /** The corner radius the stylesheet is told to round to, in pixels. */
  async getBorderRadius(): Promise<number> {
    return this.readNumberVar('--wr-border-glow-radius', 'getBorderRadius');
  }

  /** How far past the card edge the halo is told to reach, in pixels. */
  async getGlowRadius(): Promise<number> {
    return this.readNumberVar('--wr-border-glow-padding', 'getGlowRadius');
  }

  /**
   * The width of the lit cone, as a share of the perimeter.
   *
   * Unitless by contract — the stylesheet multiplies it — so a `px` creeping in here is
   * a real regression that leaves the mask with a length where it wants a number.
   */
  async getConeSpread(): Promise<number> {
    return this.readNumberVar('--wr-border-glow-cone-spread', 'getConeSpread');
  }

  /** How sharply the halo fades as the cursor leaves an edge; lower is a wider falloff. */
  async getEdgeSensitivity(): Promise<number> {
    return this.readNumberVar('--wr-border-glow-edge-sensitivity', 'getEdgeSensitivity');
  }

  /** Strength of the interior soft-light bloom, again unitless. */
  async getFillOpacity(): Promise<number> {
    return this.readNumberVar('--wr-border-glow-fill-opacity', 'getFillOpacity');
  }

  /**
   * The card fill the author asked for, or `null` when they left it to the theme.
   *
   * The distinction is the whole point: an unset `[backgroundColor]` means the surface
   * token decides, light or dark, and a card that starts declaring its own fill has
   * stopped following the theme.
   */
  async getBackgroundColor(): Promise<string | null> {
    return this.readVar('--wr-border-glow-bg');
  }

  /**
   * The halo colour at full strength, or `null` when the theme decides.
   *
   * Comes back as the `hsl(H deg S% L% / A%)` the component assembled from the bare
   * `'H S L'` input, so this also pins that assembly. Be aware the parse is forgiving to
   * a fault: anything that is not three bare numbers — a hex colour, `rgb(…)`, even
   * `hsl(40deg 80% 80%)` with its units — silently becomes the default amber, so a
   * plausible-looking value here does not mean the input was understood.
   */
  async getGlowColor(): Promise<string | null> {
    return this.readVar('--wr-border-glow-color');
  }

  /**
   * The seven halo alphas in percent, brightest first, or `null` when no glow colour
   * was ever set.
   *
   * This is the whole of `[glowIntensity]`: the steps are `[100, 60, 50, 40, 30, 20,
   * 10]` multiplied by the intensity and clamped at 100, so `0.5` gives
   * `[50, 30, 25, 20, 15, 10, 5]` and anything above 1 saturates from the top down. The
   * clamp is one-sided — a negative intensity produces negative percentages, which a
   * browser drops as invalid declarations and the halo vanishes — so the numbers are
   * returned as written rather than corrected, which is how a spec can see it.
   */
  async getGlowAlphaRamp(): Promise<number[] | null> {
    const declarations = await this.declarations();
    if (!declarations.has('--wr-border-glow-color')) return null;

    return GLOW_VAR_SUFFIXES.map(suffix => {
      const name = `--wr-border-glow-color${suffix}`;
      const raw = declarations.get(name);
      const alpha = raw === undefined ? null : GLOW_ALPHA.exec(raw);
      if (!alpha) {
        throw new Error(
          `WrBorderGlowHarness.getGlowAlphaRamp(): \`${name}\` reads "${raw ?? '(absent)'}". The seven halo steps ` +
            'are written together from one glow colour, so a step that is missing or carries no ` / N%` alpha ' +
            'means the ramp stopped being built — the halo would fade in bands the stylesheet cannot use.'
        );
      }
      return Number.parseFloat(alpha[1]);
    });
  }

  /**
   * The seven mesh-gradient colours, in slot order, or `null` when no palette was set.
   *
   * The slots do not map one-to-one onto the palette: they take colours
   * `[0, 1, 2, 0, 1, 2, 1]`, each index clamped to the last entry the palette actually
   * has. So a two-colour palette repeats the second colour rather than reading past the
   * end — which is the case worth a spec, since `undefined` in a `radial-gradient()`
   * kills the whole declaration silently.
   */
  async getGradientColors(): Promise<string[] | null> {
    const declarations = await this.declarations();
    if (!declarations.has('--wr-border-glow-gradient-one')) return null;

    return GRADIENT_VAR_SLOTS.map(slot => {
      const name = `--wr-border-glow-gradient-${slot}`;
      const raw = declarations.get(name);
      const colour = raw === undefined ? null : RADIAL_GRADIENT_COLOR.exec(raw);
      if (!colour) {
        throw new Error(
          `WrBorderGlowHarness.getGradientColors(): \`${name}\` reads "${raw ?? '(absent)'}", which is not the ` +
            '`radial-gradient(at X% Y%, <colour> 0px, …)` the component builds. All seven slots are written from ' +
            'one palette, so one of them being different means the mapping broke, not the palette.'
        );
      }
      return colour[1];
    });
  }

  /**
   * The flat colour behind the mesh, or `null` when no palette was set.
   *
   * Always the palette's FIRST entry. Worth its own method because the base slice is the
   * one that shows where the gradients are transparent, and it drifting to the last
   * colour changes the card's whole cast without touching a gradient.
   */
  async getBaseGradientColor(): Promise<string | null> {
    const raw = await this.readVar('--wr-border-glow-gradient-base');
    if (raw === null) return null;

    const colour = LINEAR_GRADIENT_COLOR.exec(raw);
    if (!colour) {
      throw new Error(
        `WrBorderGlowHarness.getBaseGradientColor(): \`--wr-border-glow-gradient-base\` reads "${raw}", which is ` +
          'not the `linear-gradient(<colour> 0 100%)` the component builds from the palette.'
      );
    }
    return colour[1];
  }

  /**
   * Where the cursor last sat, in degrees: `0` is straight up and the angle grows
   * clockwise. `null` until something has pointed at the card.
   *
   * `null` is a state of its own rather than a stand-in for zero — the stylesheet's own
   * default applies until the first pointer arrives, and dead centre legitimately
   * reports `0`, so a harness that folded the two together could not tell an untouched
   * card from one being pointed at from the middle.
   */
  async getPointerAngle(): Promise<number | null> {
    const raw = await this.readVar('--wr-border-glow-angle');
    return raw === null ? null : Number.parseFloat(raw);
  }

  /**
   * How close the cursor is to the perimeter: `0` at dead centre, `100` at the edge.
   * `null` until something has pointed at the card.
   *
   * On a diagonal the NEARER axis wins rather than the two averaging, so a cursor level
   * with the bottom edge reads 100 wherever it is along it.
   */
  async getEdgeProximity(): Promise<number | null> {
    const raw = await this.readVar('--wr-border-glow-edge-proximity');
    return raw === null ? null : Number.parseFloat(raw);
  }

  /**
   * Point at the card, in client coordinates.
   *
   * **Refuses on a card with no box, which in a unit test is every card.** The component
   * measures the pointer against its own centre, and with a 0×0 rect that maths
   * degenerates: the centre is the top-left corner, and `1 / Math.min(0, 0)` pins the
   * proximity at 100 for every position on the page. Both would come back as confident
   * numbers describing nothing. Give the host a box first, exactly as the component's own
   * spec does:
   *
   * ```ts
   * const card = fixture.nativeElement.querySelector('wr-border-glow');
   * card.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
   * ```
   *
   * A `pointermove` is dispatched on the host itself, so it needs no hit test and cannot
   * miss — the coordinates only ever reach the component's own arithmetic.
   */
  async movePointerTo(clientX: number, clientY: number): Promise<void> {
    const host = await this.host();
    const { width, height } = await host.getDimensions();
    if (!width || !height) {
      throw new Error(
        `WrBorderGlowHarness.movePointerTo(${clientX}, ${clientY}): this card measures ${width}×${height}, so a ` +
          'pointer position over it means nothing — the component reads the cursor against the card centre, and ' +
          'with no box the centre is the top-left corner and the proximity saturates for every coordinate. Stub ' +
          '`getBoundingClientRect` on the host first.'
      );
    }
    await host.dispatchEvent('pointermove', { clientX, clientY, pointerId: 1, isPrimary: true });
  }

  /**
   * Whether the one-shot mount sweep is running.
   *
   * The class is added synchronously when the sweep starts and removed when it ends
   * about four seconds later, or when the component is torn down — so a spec asserts
   * that it STARTED, and leaves the angle alone while it does. This is also the
   * reduced-motion assertion: `[animated]="true"` for someone who asked for less motion
   * must leave this `false`, and no angle written at all.
   */
  async isSweeping(): Promise<boolean> {
    return (await this.host()).hasClass('wr-border-glow--sweeping');
  }

  /** Whether the halo layer is in the markup — the element the whole outer glow paints on. */
  async hasHaloLayer(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-border-glow__edge')()) !== null;
  }

  /**
   * Whether the decoration stays out of the accessibility tree.
   *
   * The halo layer is the component's only decorative NODE — every other layer is a
   * pseudo-element and so was never in the tree to begin with. It carries no text and no
   * name, so losing its `aria-hidden` puts an anonymous element between the reader and
   * the card's content.
   */
  async isDecorationHiddenFromAssistiveTech(): Promise<boolean> {
    return (await (await this.edge()).getAttribute('aria-hidden')) === 'true';
  }

  /**
   * The projected content's text, trimmed.
   *
   * Read from `.wr-border-glow__inner` rather than the host, which is the assertion:
   * content that lands as a bare host child instead of inside the wrapper renders
   * underneath the interior bloom, and reading the host would report the same string
   * either way.
   */
  async getContentText(): Promise<string> {
    return (await this.locatorFor('.wr-border-glow__inner')()).text();
  }

  /** The host's inline declarations — the component's whole written output. */
  private async declarations(): Promise<Map<string, string>> {
    return parseInlineDeclarations((await (await this.host()).getAttribute('style')) ?? '');
  }

  /** One inline custom property, or `null` when the component has not written it. */
  private async readVar(name: string): Promise<string | null> {
    return (await this.declarations()).get(name) ?? null;
  }

  /** One inline custom property that is always written, as a number. */
  private async readNumberVar(name: string, method: string): Promise<number> {
    const raw = await this.readVar(name);
    const value = raw === null ? Number.NaN : Number.parseFloat(raw);
    if (Number.isNaN(value)) {
      throw new Error(
        `WrBorderGlowHarness.${method}(): \`${name}\` reads "${raw ?? '(absent)'}" on the host. The component ` +
          'writes this one on every input change whatever the inputs say, so a missing or unreadable value means ' +
          'the variable bag stopped reaching the element at all.'
      );
    }
    return value;
  }
}
