/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrInputDirective, WrInputGroupComponent, WrInputSuffixDirective, WrPasswordToggleComponent } from 'ngwr/input';

type WrAuthResetValue = { readonly password: string };

/**
 * New-password form for the reset flow. Two fields with match validation.
 *
 * @see https://ngwr.dev/docs/components/auth
 */
@Component({
  selector: 'wr-auth-reset',
  templateUrl: './auth-reset.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-auth' },
  imports: [FormsModule, WrInputGroupComponent, WrInputDirective, WrInputSuffixDirective, WrPasswordToggleComponent],
})
export class WrAuthResetComponent {
  readonly title = input<string>('Set a new password');
  readonly subtitle = input<string>('Pick something strong.');
  readonly submitText = input<string>('Update password');
  readonly loading = input(false, { transform: coerceBooleanProperty });
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<WrAuthResetValue>();

  protected readonly password = signal('');
  protected readonly confirm = signal('');

  protected readonly mismatch = computed(() => this.confirm().length > 0 && this.password() !== this.confirm());

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.mismatch()) return;
    this.submitted.emit({ password: this.password() });
  }
}

export type { WrAuthResetValue };
