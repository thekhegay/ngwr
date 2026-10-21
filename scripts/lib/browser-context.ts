/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The Playwright context the browser-driven checks measure in: reduced motion
 * and a fixed viewport always, and a frozen clock and a pinned user agent when
 * asked for. Those two stay opt-in because a sweep's baseline records whatever
 * page it was recorded against, and turning either on repaints that page.
 */

import type { Browser, BrowserContext, BrowserContextOptions } from 'playwright';

/**
 * The instant a pinned clock stands at.
 *
 * Moving it expires the `check:state-a11y` baseline entries keyed on calendar
 * days, whose selectors name these days by date, and can move
 * `check:contrast`'s route counts, which were measured at it — re-record both.
 */
const PINNED_NOW = '2026-08-12T10:00:00Z';

/** The desktop viewport every browser check loads pages at. */
const DESKTOP_VIEWPORT = { width: 1280, height: 900 } as const;

/** The phone viewport a `mobile` context gets. */
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

/**
 * A macOS Chromium user agent carrying the browser's real version.
 *
 * `wr-window` picks a chrome per OS and `WrHotkey` resolves `mod` per OS, so
 * without one fixed platform token a sweep paints one page on a laptop and
 * another on the ubuntu runner.
 */
function pinnedUserAgent(browser: Browser): string {
  return (
    `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ` +
    `(KHTML, like Gecko) HeadlessChrome/${browser.version()} Safari/537.36`
  );
}

/** What `newPinnedContext` adds to reduced motion and the desktop viewport. */
interface PinnedContextOptions {
  readonly colorScheme?: NonNullable<BrowserContextOptions['colorScheme']>;
  readonly contrast?: NonNullable<BrowserContextOptions['contrast']>;
  /** `MOBILE_VIEWPORT` with touch when true; given either way, it also writes `hasTouch` and `isMobile`. */
  readonly mobile?: boolean;
  /** Freeze `Date` at `PINNED_NOW`. */
  readonly pinClock?: boolean;
  /** Send `pinnedUserAgent(browser)`. */
  readonly pinUserAgent?: boolean;
}

/**
 * A new context with `reducedMotion: 'reduce'` and the desktop viewport, plus
 * what `options` ask for. An option left out writes no key at all, so the
 * context gets exactly the settings a hand-written call would pass.
 */
async function newPinnedContext(browser: Browser, options: PinnedContextOptions = {}): Promise<BrowserContext> {
  const { colorScheme, contrast, mobile, pinClock = false, pinUserAgent = false } = options;
  const context = await browser.newContext({
    ...(colorScheme ? { colorScheme } : {}),
    ...(contrast ? { contrast } : {}),
    reducedMotion: 'reduce',
    viewport: mobile ? MOBILE_VIEWPORT : DESKTOP_VIEWPORT,
    ...(pinUserAgent ? { userAgent: pinnedUserAgent(browser) } : {}),
    ...(mobile === undefined ? {} : { hasTouch: mobile, isMobile: mobile }),
  });
  if (pinClock) await context.clock.setFixedTime(new Date(PINNED_NOW));
  return context;
}

export { newPinnedContext };
export type { PinnedContextOptions };
