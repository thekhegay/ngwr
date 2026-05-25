/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrInputDirective, WrInputGroupComponent, WrInputSuffixDirective, WrPasswordToggleComponent } from 'ngwr/input';

type WrAuthLoginValue = {
  readonly email: string;
  readonly password: string;
  readonly remember: boolean;
};

/**
 * Pre-styled login form. Headless — the consumer wires the actual auth
 * call. Emits `(submit)` with the form values.
 *
 * Project actions / footer links via attribute slots:
 * `[wrAuthHeader]`, `[wrAuthFooter]`, `[wrAuthSocial]`.
 *
 * @example
 * ```html
 * <wr-auth-login
 *   [loading]="loading()"
 *   [errorMessage]="error()"
 *   (submitted)="signIn($event)"
 * >
 *   <a wrAuthFooter href="/auth/forgot">Forgot password?</a>
 * </wr-auth-login>
 * ```
 *
 * @see https://ngwr.dev/docs/components/auth
 */
@Component({
  selector: 'wr-auth-login',
  templateUrl: './auth-login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-auth' },
  imports: [FormsModule, WrInputGroupComponent, WrInputDirective, WrInputSuffixDirective, WrPasswordToggleComponent],
})
export class WrAuthLoginComponent {
  readonly title = input<string>('Welcome back');
  readonly subtitle = input<string>('Sign in to continue.');
  readonly submitText = input<string>('Sign in');
  readonly loading = input(false, { transform: coerceBooleanProperty });
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<WrAuthLoginValue>();

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly remember = signal(false);

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.emit({
      email: this.email(),
      password: this.password(),
      remember: this.remember(),
    });
  }
}

export type { WrAuthLoginValue };
