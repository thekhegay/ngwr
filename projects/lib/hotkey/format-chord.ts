/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { WR_KEYS, WR_KEY_LABELS, type WrKey } from 'ngwr/utils';

import { wrParseHotkeySpec } from './parse-spec';
import type { WrHotkeyPlatform, WrHotkeySpec } from './types';

/** Apple's modifier glyphs, in the order its menus write them. */
const MAC_MODIFIERS = { ctrl: '⌃', alt: '⌥', shift: '⇧', meta: '⌘' } as const;

/** The named keys macOS writes as a glyph. The rest keep their label. */
const MAC_KEYS: Readonly<Partial<Record<WrKey, string>>> = {
  [WR_KEYS.ENTER]: '↩',
  [WR_KEYS.ESCAPE]: '⎋',
  [WR_KEYS.TAB]: '⇥',
  [WR_KEYS.BACKSPACE]: '⌫',
  [WR_KEYS.DELETE]: '⌦',
  [WR_KEYS.HOME]: '↖',
  [WR_KEYS.END]: '↘',
  [WR_KEYS.PAGE_UP]: '⇞',
  [WR_KEYS.PAGE_DOWN]: '⇟',
};

/** `WR_KEYS` by the lowercased form the spec parser produces. */
const KEY_BY_LOWER: ReadonlyMap<string, WrKey> = new Map(
  (Object.values(WR_KEYS) as WrKey[]).map(key => [key.toLowerCase(), key])
);

/** The key token as the spec typed it, since the parser lowercases: `'mod+F5'` keeps `F5`. */
function asTyped(chord: string, lower: string): string {
  const token = chord.split('+').find(t => t.trim().toLowerCase() === lower);
  return token?.trim() ?? lower;
}

/**
 * The platform a chord is written for, from a user agent: `'mac'` when it
 * names a Mac (iPhone and iPad say "like Mac OS X", and their hardware
 * keyboards carry ⌘ too), `'other'` elsewhere. Reads `navigator.userAgent`
 * when called without one, and answers `'other'` where there is no
 * navigator, which is the server.
 */
export function wrHotkeyPlatform(userAgent: string | null = globalThis.navigator?.userAgent ?? null): WrHotkeyPlatform {
  return (userAgent ?? '').toLowerCase().includes('mac') ? 'mac' : 'other';
}

/**
 * A chord written the way the platform writes it: `'mod+k'` is `⌘K` on macOS
 * and `Ctrl+K` elsewhere, `'mod+shift+k'` is `⇧⌘K` and `Ctrl+Shift+K`.
 * Modifiers follow Apple's order (`⌃⌥⇧⌘`) on a Mac and Win, Ctrl, Alt, Shift
 * elsewhere. A named key is labelled from `WR_KEY_LABELS` in `ngwr/utils`, with
 * Apple's glyph on a Mac (`↩`, `⎋`, `⌫`); an arrow is its glyph everywhere; a
 * letter is uppercased; a key neither table knows is passed through as typed.
 *
 * `platform` defaults to {@link wrHotkeyPlatform}, which reads
 * `navigator.userAgent`. The server has none and gets the `Ctrl` form, so a
 * page that prints the default during hydration on a Mac renders `Ctrl+K` and
 * must not switch to `⌘K` until hydration is done: `wr-kbd` reads the platform
 * in `afterNextRender` for that reason. Pass `platform` from such a signal, or
 * let `wr-kbd` print the chord.
 *
 * `labels` replaces a word from `WR_KEY_LABELS` by its `WR_KEYS` value, for a
 * translation; `wr-kbd` passes the i18n catalog's. A glyph is never replaced.
 */
export function wrFormatChord(
  chord: WrHotkeySpec,
  platform: WrHotkeyPlatform = wrHotkeyPlatform(),
  labels: Readonly<Partial<Record<WrKey, string>>> = {}
): string {
  const parsed = wrParseHotkeySpec(chord, platform === 'mac');
  const label = (key: WrKey): string => labels[key] ?? WR_KEY_LABELS[key];

  const known = KEY_BY_LOWER.get(parsed.key);
  let key: string;
  if (known) key = (platform === 'mac' ? MAC_KEYS[known] : undefined) ?? label(known);
  else if (parsed.key.length === 1) key = parsed.key.toUpperCase();
  else key = asTyped(chord, parsed.key);

  if (platform === 'mac') {
    const mods = (['ctrl', 'alt', 'shift', 'meta'] as const).filter(mod => parsed[mod]).map(mod => MAC_MODIFIERS[mod]);
    return `${mods.join('')}${key}`;
  }

  const parts: string[] = [];
  if (parsed.meta) parts.push(label(WR_KEYS.META));
  if (parsed.ctrl) parts.push(label(WR_KEYS.CONTROL));
  if (parsed.alt) parts.push(label(WR_KEYS.ALT));
  if (parsed.shift) parts.push(label(WR_KEYS.SHIFT));
  parts.push(key);
  return parts.join('+');
}
