/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { DestroyRef, Directive, ElementRef, effect, inject, input, output } from '@angular/core';

import type { WrHotkeyHandle, WrHotkeySpec } from './interfaces';
import { WrHotkey } from './wr-hotkey';

/**
 * Declarative wrapper around {@link WrHotkey}.
 *
 * Binds on init (and re-binds when the spec changes), unbinds on destroy.
 * Defaults to global scope so the binding works regardless of focus —
 * pass `[scoped]="true"` to limit it to the host element.
 *
 * @example
 * ```html
 * <button (wrHotkeyMatch)="open()" [wrHotkey]="'mod+k'">Open palette</button>
 * <div tabindex="0" [wrHotkey]="'escape'" [scoped]="true" (wrHotkeyMatch)="close()">…</div>
 * ```
 */
@Directive({ selector: '[wrHotkey]' })
export class WrHotkeyBinding {
  readonly wrHotkey = input.required<WrHotkeySpec>();

  /** Scope the binding to the host element instead of `document`. @default false */
  readonly scoped = input(false, { transform: coerceBooleanProperty });

  /** Fire even when an input / textarea has focus. @default false */
  readonly allowInInput = input(false, { transform: coerceBooleanProperty });

  /** Suppress the default action when the binding fires. @default true */
  readonly preventDefault = input(true, { transform: coerceBooleanProperty });

  /** Emits the original KeyboardEvent on match. */
  readonly wrHotkeyMatch = output<KeyboardEvent>();

  private readonly hotkeys = inject(WrHotkey);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private handle: WrHotkeyHandle | null = null;

  constructor() {
    effect(() => {
      this.handle?.unbind();
      this.handle = this.hotkeys.bind(this.wrHotkey(), event => this.wrHotkeyMatch.emit(event), {
        element: this.scoped() ? this.host.nativeElement : undefined,
        allowInInput: this.allowInInput(),
        preventDefault: this.preventDefault(),
      });
    });
    inject(DestroyRef).onDestroy(() => this.handle?.unbind());
  }
}
