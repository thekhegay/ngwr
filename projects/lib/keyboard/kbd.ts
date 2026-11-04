/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, afterNextRender, computed, input, signal } from '@angular/core';

import { type WrHotkeyPlatform, type WrHotkeySpec, wrFormatChord, wrHotkeyPlatform } from 'ngwr/hotkey';
import { readI18nText } from 'ngwr/i18n';
import { KEYS, type WrKey } from 'ngwr/utils';

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
  host: { '[class]': 'classes()' },
})
export class WrKbd {
  /** Visual size variant. @default 'md' */
  readonly size = input<WrKbdSize>('md');

  /** A chord to print in place of the content: `'mod+k'`. @default null */
  readonly chord = input<WrHotkeySpec | null>(null);

  protected readonly classes = computed(() => `wr-kbd wr-kbd--${this.size()}`);

  // The server has no user agent and prints the Ctrl form; the first client
  // render has to match it for hydration, so the Mac form arrives after it.
  private readonly platform = signal<WrHotkeyPlatform>('other');

  private readonly ctrl = readI18nText('kbd.ctrl', 'Ctrl');
  private readonly shift = readI18nText('kbd.shift', 'Shift');
  private readonly alt = readI18nText('kbd.alt', 'Alt');
  private readonly enter = readI18nText('kbd.enter', 'Enter');
  private readonly esc = readI18nText('kbd.esc', 'Esc');
  private readonly tab = readI18nText('kbd.tab', 'Tab');
  private readonly space = readI18nText('kbd.space', 'Space');
  private readonly backspace = readI18nText('kbd.backspace', 'Backspace');
  private readonly del = readI18nText('kbd.delete', 'Delete');
  private readonly home = readI18nText('kbd.home', 'Home');
  private readonly end = readI18nText('kbd.end', 'End');
  private readonly pageUp = readI18nText('kbd.pageUp', 'Page Up');
  private readonly pageDown = readI18nText('kbd.pageDown', 'Page Down');

  private readonly labels = computed<Partial<Record<WrKey, string>>>(() => ({
    [KEYS.CONTROL]: this.ctrl(),
    [KEYS.SHIFT]: this.shift(),
    [KEYS.ALT]: this.alt(),
    [KEYS.ENTER]: this.enter(),
    [KEYS.ESCAPE]: this.esc(),
    [KEYS.TAB]: this.tab(),
    [KEYS.SPACE]: this.space(),
    [KEYS.BACKSPACE]: this.backspace(),
    [KEYS.DELETE]: this.del(),
    [KEYS.HOME]: this.home(),
    [KEYS.END]: this.end(),
    [KEYS.PAGE_UP]: this.pageUp(),
    [KEYS.PAGE_DOWN]: this.pageDown(),
  }));

  protected readonly printed = computed(() => {
    const chord = this.chord();
    return chord ? wrFormatChord(chord, this.platform(), this.labels()) : '';
  });

  constructor() {
    afterNextRender(() => this.platform.set(wrHotkeyPlatform()));
  }
}
