/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement, TestKey } from '@angular/cdk/testing';

import type { WrResizableEdge } from 'ngwr/resizable';

import type { WrResizableHarnessFilters } from './types';

const EDGES: readonly WrResizableEdge[] = ['start', 'end', 'top', 'bottom'];

/** Presses `resizeBy()` spends before it gives up. */
const MOST_PRESSES = 2048;

/**
 * Test harness for an element carrying `[wrResizable]`.
 *
 * The directive adds its handle after the first render in a browser, so the
 * harness finds none on the server or before the fixture has rendered.
 *
 * Two sizes, and they are two questions. {@link getSize} is the pixel size the
 * directive wrote on the element, `null` until something set one.
 * {@link getAnnouncedSize} is what the handle tells a screen reader, which
 * falls back to the element's measured size, and a unit test measures `0`.
 *
 * Sizes are written with the keyboard. There is no `dragBy()`: a drag also
 * works from pointer coordinates alone, but it needs pointer capture, which
 * jsdom does not implement, so the method would throw in the one environment
 * most specs run in. A percentage limit resolves against the parent's measured
 * size, so in a unit test `maxSize="60%"` limits nothing: bind pixels there.
 *
 * @example
 * ```ts
 * const panel = await loader.getHarness(WrResizableHarness);
 *
 * await panel.resizeBy(40);
 * expect(await panel.getSize()).toBe(360);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrResizableHarness extends ComponentHarness {
  static hostSelector = '.wr-resizable';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrResizableHarnessFilters = {}): HarnessPredicate<WrResizableHarness> {
    return new HarnessPredicate(WrResizableHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('edge', options.edge, async (harness, edge) => (await harness.getEdge()) === edge)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption(
        'collapsed',
        options.collapsed,
        async (harness, collapsed) => (await harness.isCollapsed()) === collapsed
      );
  }

  /**
   * The edge that drags, from the host's `wr-resizable--<edge>` modifier.
   * Throws when the host carries none: the directive always writes one.
   */
  async getEdge(): Promise<WrResizableEdge> {
    const host = await this.host();
    for (const edge of EDGES) {
      if (await host.hasClass(`wr-resizable--${edge}`)) return edge;
    }
    throw new Error('WrResizableHarness.getEdge(): the host carries no wr-resizable--<edge> modifier.');
  }

  /**
   * The size the directive wrote on the element, in pixels: its inline
   * `width` for the `start` and `end` edges, its `height` for `top` and
   * `bottom`. `null` while the element still has the size its CSS gives it,
   * and `0` while collapsed.
   */
  async getSize(): Promise<number | null> {
    const property = (await this.isInline()) ? 'width' : 'height';
    const style = (await (await this.host()).getAttribute('style')) ?? '';
    const written = new RegExp(`(?:^|;)\\s*${property}:\\s*(-?[\\d.]+)px`).exec(style)?.[1];
    return written === undefined ? null : Number.parseFloat(written);
  }

  /**
   * The size the handle announces (`aria-valuenow`), in whole pixels, or
   * `null` when it announces none. Without a size set this is the element's
   * measured size, which a test with no layout reports as `0`.
   */
  async getAnnouncedSize(): Promise<number | null> {
    return this.numeric('aria-valuenow');
  }

  /** The smallest size, in pixels, from `aria-valuemin`. */
  async getMinSize(): Promise<number | null> {
    return this.numeric('aria-valuemin');
  }

  /** The largest size, in pixels, from `aria-valuemax`: `null` when there is no maximum. */
  async getMaxSize(): Promise<number | null> {
    return this.numeric('aria-valuemax');
  }

  /** The handle's accessible name. */
  async getLabel(): Promise<string | null> {
    return (await this.handle()).getAttribute('aria-label');
  }

  /** Whether `disabled` is set, from the host's `wr-resizable--disabled` modifier. */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('wr-resizable--disabled');
  }

  /** Whether the element is collapsed to zero, from the host's `wr-resizable--collapsed` modifier. */
  async isCollapsed(): Promise<boolean> {
    return (await this.host()).hasClass('wr-resizable--collapsed');
  }

  /**
   * Whether the handle takes the keyboard: it is neither disabled nor
   * collapsed. Read from what the handle says, `aria-disabled` and its
   * `tabindex` together, since a handle that is announced inert and still a
   * tab stop is the bug.
   */
  async isHandleActive(): Promise<boolean> {
    const handle = await this.handle();
    return (await handle.getAttribute('aria-disabled')) !== 'true' && (await handle.getAttribute('tabindex')) === '0';
  }

  /** Move keyboard focus to the handle. */
  async focus(): Promise<void> {
    return (await this.handle()).focus();
  }

  /** Whether the handle holds focus. */
  async isFocused(): Promise<boolean> {
    return (await this.handle()).isFocused();
  }

  /**
   * Grow (`px > 0`) or shrink (`px < 0`) the element by pressing the arrow
   * keys on its handle, one `step` a press.
   *
   * Which arrow grows depends on the edge and on the reading direction, which a
   * harness cannot read, so the walk watches where each press lands and turns
   * around when the first one went the wrong way. That costs two extra
   * `sizeChange` emissions under `dir="rtl"`.
   *
   * Throws rather than half-arriving, with where the size stopped: when `px`
   * is not a multiple of `step`, when a limit is in the way, and when the
   * handle is disabled or collapsed.
   */
  async resizeBy(px: number): Promise<void> {
    if (px === 0) return;
    const handle = await this.handle();
    const start = (await this.getAnnouncedSize()) ?? 0;
    const target = start + px;

    const edge = await this.getEdge();
    const along =
      edge === 'start' || edge === 'end'
        ? [TestKey.RIGHT_ARROW, TestKey.LEFT_ARROW]
        : [TestKey.DOWN_ARROW, TestKey.UP_ARROW];
    // The `start` and `top` edges grow the element toward lower coordinates.
    let [grow, shrink] = edge === 'end' || edge === 'bottom' ? along : [along[1], along[0]];

    let now = start;
    let turned = false;
    for (let press = 0; now !== target && press < MOST_PRESSES; press++) {
      const gap = target - now;
      const [key, back] = gap > 0 ? [grow, shrink] : [shrink, grow];
      await handle.sendKeys(key);
      const next = (await this.getAnnouncedSize()) ?? 0;

      if (Math.sign(next - now) === Math.sign(gap)) {
        now = next;
        // Stepped over the target: `px` is not a multiple of `step`.
        if (Math.sign(target - now) === -Math.sign(gap)) break;
        continue;
      }
      // Nothing moved, or it moved away: the page reads right to left, a limit
      // is in the way, or the handle is inert. Put a wrong step back, turn once.
      if (next !== now) await handle.sendKeys(back);
      now = (await this.getAnnouncedSize()) ?? 0;
      if (turned) break;
      turned = true;
      [grow, shrink] = [shrink, grow];
    }

    if (now !== target) {
      throw new Error(
        `WrResizableHarness.resizeBy(${px}): the size stopped at ${now}, from ${start}. An arrow moves one ` +
          '`step`, a limit clamps, and a disabled or collapsed handle ignores its keys.'
      );
    }
  }

  /** Press Home: the element goes to its smallest size. */
  async resizeToMin(): Promise<void> {
    return (await this.handle()).sendKeys(TestKey.HOME);
  }

  /**
   * Press End: the element goes to its largest size. Throws when it has no
   * maximum, where the key has nowhere to go and the component ignores it.
   */
  async resizeToMax(): Promise<void> {
    if ((await this.getMaxSize()) === null) {
      throw new Error(
        'WrResizableHarness.resizeToMax(): the handle announces no maximum. A percentage `maxSize` resolves ' +
          'against the parent, which a test with no layout measures as zero: bind pixels.'
      );
    }
    return (await this.handle()).sendKeys(TestKey.END);
  }

  /** Press Enter: the size goes back to `defaultSize`, or to what the element started with. */
  async reset(): Promise<void> {
    return (await this.handle()).sendKeys(TestKey.ENTER);
  }

  /**
   * The directive appends its handle as the host's last child, so a resizable
   * nested inside this one has its handle earlier in the document: the last
   * match is this element's own.
   */
  private async handle(): Promise<TestElement> {
    const handles = await this.locatorForAll('.wr-resizable__handle[role="separator"]')();
    const own = handles.at(-1);
    if (!own) {
      throw new Error(
        'WrResizableHarness: no handle. The directive adds it after the first render, in a browser only.'
      );
    }
    return own;
  }

  private async isInline(): Promise<boolean> {
    const edge = await this.getEdge();
    return edge === 'start' || edge === 'end';
  }

  private async numeric(attribute: string): Promise<number | null> {
    const raw = await (await this.handle()).getAttribute(attribute);
    return raw === null ? null : Number(raw);
  }
}
