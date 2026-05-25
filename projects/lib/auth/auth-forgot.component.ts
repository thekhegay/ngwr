/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrInputDirective } from 'ngwr/input';

type WrAuthForgotValue = { readonly email: string };

/**
 * Forgot-password form — single email field + submit. Emits `(submitted)`
 * once the user requests a reset.
 *
 * @see https://ngwr.dev/docs/components/auth
 */
@Component({
  selector: 'wr-auth-forgot',
  templateUrl: './auth-forgot.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-auth' },
  imports: [FormsModule, WrInputDirective],
})
export class WrAuthForgotComponent {
  readonly title = input<string>('Reset your password');
  readonly subtitle = input<string>("We'll send a reset link to your email.");
  readonly submitText = input<string>('Send reset link');
  readonly loading = input(false, { transform: coerceBooleanProperty });
  readonly successMessage = input<string | null>(null);
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<WrAuthForgotValue>();

  protected readonly email = signal('');

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.emit({ email: this.email() });
  }
}

export type { WrAuthForgotValue };
