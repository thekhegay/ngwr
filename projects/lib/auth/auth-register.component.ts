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

type WrAuthRegisterValue = {
  readonly name: string;
  readonly email: string;
  readonly password: string;
};

/**
 * Pre-styled register form. Mirrors {@link WrAuthLoginComponent}.
 *
 * @see https://ngwr.dev/docs/components/auth
 */
@Component({
  selector: 'wr-auth-register',
  templateUrl: './auth-register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-auth' },
  imports: [FormsModule, WrInputGroupComponent, WrInputDirective, WrInputSuffixDirective, WrPasswordToggleComponent],
})
export class WrAuthRegisterComponent {
  readonly title = input<string>('Create your account');
  readonly subtitle = input<string>('Get started in seconds.');
  readonly submitText = input<string>('Create account');
  readonly loading = input(false, { transform: coerceBooleanProperty });
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<WrAuthRegisterValue>();

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirm = signal('');

  protected readonly mismatch = computed(() => this.confirm().length > 0 && this.password() !== this.confirm());

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.mismatch()) return;
    this.submitted.emit({ name: this.name(), email: this.email(), password: this.password() });
  }
}

export type { WrAuthRegisterValue };
