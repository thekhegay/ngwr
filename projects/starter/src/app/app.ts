import { Component, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';

import { WrButton } from 'ngwr/button';
import { WrCheckbox } from 'ngwr/checkbox';
import { WrFormField } from 'ngwr/form';
import { WrInput } from 'ngwr/input';

@Component({
  selector: 'app-root',
  imports: [FormField, WrFormField, WrInput, WrCheckbox, WrButton],
  template: `
    <form class="signup" novalidate (submit)="$event.preventDefault(); reserve()">
      <h1>Join the beta</h1>

      <wr-form-field label="Work email" required>
        <input wrInput type="email" [formField]="signup.email" />
      </wr-form-field>

      <wr-checkbox [formField]="signup.agree">I agree to the terms</wr-checkbox>

      <button wr-btn type="submit" color="primary" block>Reserve your spot</button>

      @if (reserved()) {
        <p>Reserved for {{ signup.email().value() }}.</p>
      }
    </form>
  `,
  styles: `
    .signup {
      display: grid;
      gap: 1rem;
      width: min(22rem, 100vw - 2rem);
    }

    h1 {
      margin: 0;
      font-size: 1.5rem;
    }
  `,
})
export class App {
  private readonly model = signal({ email: '', agree: false });

  // `[formField]` binds straight to the control's own value or checked model.
  // ngwr ships no validation copy, so each rule carries the message
  // <wr-form-field> shows.
  protected readonly signup = form(this.model, path => {
    required(path.email, { message: 'Enter your work email.' });
    email(path.email, { message: 'That is not an email address.' });
  });

  protected readonly reserved = signal(false);

  // `submit` marks every field touched, so an untouched required field shows its
  // error too, and runs the action only when the form is valid.
  protected reserve(): void {
    void submit(this.signup, async () => this.reserved.set(true));
  }
}
