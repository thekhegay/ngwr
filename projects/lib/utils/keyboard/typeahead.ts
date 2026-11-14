/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrIsComposing, wrIsPrintableKey } from './predicates';

/** A key typed in a text field is that field's. */
function isTextField(target: EventTarget | null): boolean {
  const el = target as (Partial<HTMLElement> & { tagName?: string }) | null;
  if (!el?.tagName) return false;
  return (
    el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable === true
  );
}

/** Options of {@link wrTypeahead}. */
export interface WrTypeaheadOptions {
  /**
   * The pause, in milliseconds, after which the next key starts a new run.
   * @default 500
   */
  readonly resetMs?: number;
  /**
   * The language the labels are written in, as a BCP 47 tag or a function that
   * returns one, for the case folding (`I` and `ı` in Turkish). The browser's
   * own locale when omitted.
   */
  readonly locale?: string | (() => string | undefined);
}

/** One row of the list a {@link WrTypeahead} searches. */
export interface WrTypeaheadItem {
  /** The text the row is matched by. */
  readonly label: string;
  /** A disabled row is never a match. */
  readonly disabled?: boolean;
}

/** What {@link wrTypeahead} returns. */
export interface WrTypeahead {
  /**
   * Feed a `keydown` and get the row to move to: `type()` and `find()` in one
   * call.
   *
   * @returns the index of the match, `-1` when the key joined the run and no row
   * matches it, or `null` when the key is not a typeahead key and the caller's
   * own handling goes on.
   */
  handleKey(event: KeyboardEvent, items: readonly (string | WrTypeaheadItem)[], current: number): number | null;
  /**
   * Add a `keydown` to the run. Returns whether the key was taken: a printable
   * character with no Ctrl, Meta or Alt, outside an IME composition and outside
   * a text field. Space is taken only while a run is active, so it keeps its
   * own job as the first key.
   */
  type(event: KeyboardEvent): boolean;
  /**
   * The row the run points at, or `-1`. One letter, typed once or repeated,
   * looks from the row after `current` and wraps, so the same letter cycles. A
   * longer run looks from `current` itself, so the row it already matches stays.
   */
  find(items: readonly (string | WrTypeaheadItem)[], current: number): number;
  /** Whether a run is in progress: a key was taken less than `resetMs` ago. */
  readonly active: boolean;
  /** Drop the run. */
  reset(): void;
}

/**
 * Type-to-jump for a list: the letters typed in a row select the next row whose
 * label starts with them, as the WAI-ARIA listbox, menu and tree patterns ask.
 *
 * It holds the letters typed so far and nothing else: the caller passes the
 * labels and the current row with each key, and moves its own cursor to the
 * index that comes back. Matching ignores case, skips disabled rows and wraps
 * past the end.
 *
 * @example
 * ```ts
 * private readonly typeahead = wrTypeahead();
 *
 * protected onKeydown(event: KeyboardEvent): void {
 *   const index = this.typeahead.handleKey(event, this.labels(), this.cursor());
 *   if (index === null) return this.onOtherKey(event);
 *   event.preventDefault();
 *   if (index >= 0) this.cursor.set(index);
 * }
 * ```
 */
export function wrTypeahead(options: WrTypeaheadOptions = {}): WrTypeahead {
  const resetMs = options.resetMs ?? 500;
  let typed = '';
  let typedAt = 0;

  const locale = (): string | undefined => (typeof options.locale === 'function' ? options.locale() : options.locale);
  const fold = (text: string, tag: string | undefined): string => {
    try {
      return text.toLocaleLowerCase(tag);
    } catch {
      // Not a language tag the engine knows.
      return text.toLocaleLowerCase();
    }
  };
  const isActive = (): boolean => typed !== '' && Date.now() - typedAt <= resetMs;

  const type = (event: KeyboardEvent): boolean => {
    if (!wrIsPrintableKey(event) || wrIsComposing(event) || isTextField(event.target)) return false;
    const active = isActive();
    if (event.key === ' ' && !active) return false;
    typed = active ? typed + event.key : event.key;
    typedAt = Date.now();
    return true;
  };

  const find = (items: readonly (string | WrTypeaheadItem)[], current: number): number => {
    if (typed === '' || items.length === 0) return -1;
    const tag = locale();
    const run = fold(typed, tag);
    const chars = [...run];
    const repeated = chars.every(ch => ch === chars[0]);
    const search = repeated ? chars[0] : run;
    const from = current >= 0 && current < items.length ? current : -1;
    const start = repeated ? from + 1 : Math.max(from, 0);
    for (let step = 0; step < items.length; step++) {
      const index = (start + step) % items.length;
      const item = items[index];
      if (typeof item !== 'string' && item.disabled) continue;
      const label = typeof item === 'string' ? item : item.label;
      if (fold(label.trim(), tag).startsWith(search)) return index;
    }
    return -1;
  };

  return {
    handleKey: (event, items, current) => (type(event) ? find(items, current) : null),
    type,
    find,
    get active() {
      return isActive();
    },
    reset: () => {
      typed = '';
      typedAt = 0;
    },
  };
}
