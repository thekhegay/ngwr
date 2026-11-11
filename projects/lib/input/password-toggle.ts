/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input, signal } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { wrCheckStyles } from 'ngwr/utils';

/**
 * Self-contained eye-toggle button. Flips the linked `<input>`'s `type`
 * attribute between `password` and `text`. Drop it inside an
 * `<wr-input-group>` next to a password input.
 *
 * @example
 * ```html
 * <wr-input-group>
 *   <input wrInput type="password" [(ngModel)]="pw" #pwInput />
 *   <wr-password-toggle [for]="pwInput" />
 * </wr-input-group>
 * ```
 */
@Component({
  selector: 'wr-password-toggle',
  templateUrl: './password-toggle.html',
  encapsulation: ViewEncapsulation.None,
})
export class WrPasswordToggle {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('input');
  }

  /** Reference to the linked password input. */
  readonly for = input.required<HTMLInputElement>();

  protected readonly revealed = signal(false);

  /** Accessible name while the password is hidden. Falls back to `input.showPassword`. */
  readonly showPasswordLabel = input<string | null>(null);

  /** Accessible name while the password is revealed. Falls back to `input.hidePassword`. */
  readonly hidePasswordLabel = input<string | null>(null);

  private readonly resolvedShowPasswordLabel = useI18nText(
    this.showPasswordLabel,
    'input.showPassword',
    'Show password'
  );
  private readonly resolvedHidePasswordLabel = useI18nText(
    this.hidePasswordLabel,
    'input.hidePassword',
    'Hide password'
  );

  protected readonly ariaLabel = computed(() =>
    this.revealed() ? this.resolvedHidePasswordLabel() : this.resolvedShowPasswordLabel()
  );

  protected toggle(): void {
    const input = this.for();
    const next = input.type === 'password' ? 'text' : 'password';
    input.type = next;
    this.revealed.set(next === 'text');
  }
}
