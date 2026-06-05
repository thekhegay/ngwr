/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input, signal } from '@angular/core';

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
  /** Reference to the linked password input. */
  readonly for = input.required<HTMLInputElement>();

  protected readonly revealed = signal(false);

  protected readonly ariaLabel = computed(() => (this.revealed() ? 'Hide password' : 'Show password'));

  protected toggle(): void {
    const input = this.for();
    const next = input.type === 'password' ? 'text' : 'password';
    input.type = next;
    this.revealed.set(next === 'text');
  }
}
