/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrAlertType } from 'ngwr/alert';

import type { WrAlertHarnessFilters } from './types';

const TYPES: readonly WrAlertType[] = ['info', 'success', 'warning', 'danger', 'neutral', 'offline'];

/**
 * Test harness for `<wr-alert>`, the inline status banner.
 *
 * A dismissed alert keeps its host element and renders nothing inside it, so
 * every reader below answers `null` or `''` for one and {@link isDismissed} is
 * how a spec tells "closed" from "empty". There is no `getIcon()`: the default
 * glyph is an inline `<svg>` whose only difference between variants is its path
 * data, and {@link getType} already answers the question a spec has.
 *
 * @example
 * ```ts
 * const alert = await loader.getHarness(WrAlertHarness.with({ type: 'danger' }));
 *
 * expect(await alert.getTitle()).toBe('Sync failed');
 * await alert.close();
 * expect(await alert.isDismissed()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrAlertHarness extends ComponentHarness {
  static hostSelector = 'wr-alert';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrAlertHarnessFilters = {}): HarnessPredicate<WrAlertHarness> {
    return new HarnessPredicate(WrAlertHarness, options)
      .addOption('title', options.title, (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title))
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('type', options.type, async (harness, type) => (await harness.getType()) === type)
      .addOption('closable', options.closable, async (harness, closable) => (await harness.isClosable()) === closable);
  }

  private readonly closeButton = this.locatorForOptional('button.wr-alert__close');

  /**
   * The headline, or `null` when the alert has none.
   *
   * A `message` with no `title` IS the headline: the component draws it in
   * `.wr-alert__title`, so it is answered here and {@link getMessage} is `null`.
   */
  async getTitle(): Promise<string | null> {
    return (await (await this.locatorForOptional('.wr-alert__title')())?.text()) ?? null;
  }

  /** The secondary line under the headline, or `null`. Only drawn when a `title` sits above it. */
  async getMessage(): Promise<string | null> {
    return (await (await this.locatorForOptional('.wr-alert__message')())?.text()) ?? null;
  }

  /** The projected default content, trimmed: `''` when nothing was projected or the alert is dismissed. */
  async getContentText(): Promise<string> {
    return (await (await this.locatorForOptional('.wr-alert__content')())?.text()) ?? '';
  }

  /**
   * Everything the alert says: headline, message, projected content and the
   * labels of projected actions, in that order, one space between them. `''`
   * once dismissed.
   *
   * Joined here rather than read off the body in one go: the pieces are
   * separate blocks with no text between them, so their raw text runs together
   * as `Sync failedThe server…`.
   */
  async getText(): Promise<string> {
    const parts = await Promise.all(
      ['.wr-alert__title', '.wr-alert__message', '.wr-alert__content', '.wr-alert__actions'].map(async selector =>
        (await this.locatorForOptional(selector)())?.text()
      )
    );
    return parts.filter(Boolean).join(' ');
  }

  /**
   * The variant, from the host's `wr-alert--<type>` modifier.
   *
   * Throws when the host carries none of them rather than answering `'info'`:
   * the component always writes one, so its absence is the bug.
   */
  async getType(): Promise<WrAlertType> {
    const host = await this.host();
    for (const type of TYPES) {
      if (await host.hasClass(`wr-alert--${type}`)) return type;
    }
    throw new Error('WrAlertHarness.getType(): the host carries no wr-alert--<type> modifier.');
  }

  /**
   * How the alert is announced: `'alert'` for `danger`, `'status'` for the
   * rest, `null` once dismissed.
   */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /** The `aria-live` level: `'assertive'` for `danger` and `warning`, `'polite'` otherwise, `null` once dismissed. */
  async getLiveLevel(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-live');
  }

  /** Whether the leading status icon is drawn. */
  async hasIcon(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-alert__icon')()) !== null;
  }

  /** Whether the alert renders a close button. `false` once dismissed: the button goes with the rest. */
  async isClosable(): Promise<boolean> {
    return (await this.closeButton()) !== null;
  }

  /** The close button's accessible name, or `null` when there is no button. */
  async getCloseLabel(): Promise<string | null> {
    return (await (await this.closeButton())?.getAttribute('aria-label')) ?? null;
  }

  /** Whether the user closed the alert, from the host's `wr-alert--dismissed` modifier. */
  async isDismissed(): Promise<boolean> {
    return (await this.host()).hasClass('wr-alert--dismissed');
  }

  /**
   * Click the close button. Throws when there is none: the alert is not
   * `closable`, or it is already dismissed.
   */
  async close(): Promise<void> {
    const button = await this.closeButton();
    if (!button) {
      throw new Error(
        'WrAlertHarness.close(): this alert has no close button. It is not `closable`, or it was already dismissed.'
      );
    }
    await button.click();
  }
}
