/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, afterNextRender, computed, input, signal } from '@angular/core';

import { type WrHotkeyPlatform, type WrHotkeySpec, wrFormatChord, wrHotkeyPlatform } from 'ngwr/hotkey';
import { wrReadI18nText } from 'ngwr/i18n';
import { WR_KEYS, wrCheckStyles, type WrKey } from 'ngwr/utils';

import type { WrKbdSize } from './types';

/**
 * Tiny keycap chip — renders projected content (`⌘`, `K`, `Enter`, etc.) in
 * a beveled rectangle that reads as a physical key. Stack multiple `<wr-kbd>`
 * with a plain `+` between them for chords, or give one cap a `chord` and it
 * prints the whole thing the way the platform writes it: `⌘K` on macOS,
 * `Ctrl+K` elsewhere, with the key words from the i18n catalog.
 *
 * @example
 * ```html
 * <wr-kbd>⌘</wr-kbd> + <wr-kbd>K</wr-kbd>
 * <wr-kbd chord="mod+k" />
 * <wr-kbd size="lg">Esc</wr-kbd>
 * ```
 *
 * @see https://ngwr.dev/reference/components/keyboard
 */
@Component({
  selector: 'wr-kbd',
  template: '@if (chord()) {{{ printed() }}} @else {<ng-content />}',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-kbd', '[class]': 'classes()' },
})
export class WrKbd {
  /** Visual size variant. @default 'md' */
  readonly size = input<WrKbdSize>('md');

  /** A chord to print in place of the content: `'mod+k'`. @default null */
  readonly chord = input<WrHotkeySpec | null>(null);

  protected readonly classes = computed(() => `wr-kbd--${this.size()}`);

  // The server has no user agent and prints the Ctrl form; the first client
  // render has to match it for hydration, so the Mac form arrives after it.
  private readonly platform = signal<WrHotkeyPlatform>('other');

  private readonly ctrl = wrReadI18nText('kbd.ctrl', 'Ctrl');
  private readonly shift = wrReadI18nText('kbd.shift', 'Shift');
  private readonly alt = wrReadI18nText('kbd.alt', 'Alt');
  private readonly enter = wrReadI18nText('kbd.enter', 'Enter');
  private readonly esc = wrReadI18nText('kbd.esc', 'Esc');
  private readonly tab = wrReadI18nText('kbd.tab', 'Tab');
  private readonly space = wrReadI18nText('kbd.space', 'Space');
  private readonly backspace = wrReadI18nText('kbd.backspace', 'Backspace');
  private readonly del = wrReadI18nText('kbd.delete', 'Delete');
  private readonly home = wrReadI18nText('kbd.home', 'Home');
  private readonly end = wrReadI18nText('kbd.end', 'End');
  private readonly pageUp = wrReadI18nText('kbd.pageUp', 'Page Up');
  private readonly pageDown = wrReadI18nText('kbd.pageDown', 'Page Down');

  private readonly labels = computed<Partial<Record<WrKey, string>>>(() => ({
    [WR_KEYS.CONTROL]: this.ctrl(),
    [WR_KEYS.SHIFT]: this.shift(),
    [WR_KEYS.ALT]: this.alt(),
    [WR_KEYS.ENTER]: this.enter(),
    [WR_KEYS.ESCAPE]: this.esc(),
    [WR_KEYS.TAB]: this.tab(),
    [WR_KEYS.SPACE]: this.space(),
    [WR_KEYS.BACKSPACE]: this.backspace(),
    [WR_KEYS.DELETE]: this.del(),
    [WR_KEYS.HOME]: this.home(),
    [WR_KEYS.END]: this.end(),
    [WR_KEYS.PAGE_UP]: this.pageUp(),
    [WR_KEYS.PAGE_DOWN]: this.pageDown(),
  }));

  protected readonly printed = computed(() => {
    const chord = this.chord();
    return chord ? wrFormatChord(chord, this.platform(), this.labels()) : '';
  });

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('keyboard');
    afterNextRender(() => this.platform.set(wrHotkeyPlatform()));
  }
}
