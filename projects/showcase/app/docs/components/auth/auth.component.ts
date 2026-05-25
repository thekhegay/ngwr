import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrAuthForgotComponent, WrAuthLoginComponent, WrAuthRegisterComponent, WrAuthResetComponent } from 'ngwr/auth';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-auth-page',
  templateUrl: './auth.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrAuthLoginComponent,
    WrAuthRegisterComponent,
    WrAuthForgotComponent,
    WrAuthResetComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class AuthPageComponent {
  protected readonly lastSubmission = signal<string>('');

  protected onSubmit(label: string, value: unknown): void {
    this.lastSubmission.set(`${label}: ${JSON.stringify(value)}`);
  }

  protected readonly snippet = `<wr-auth-login (submitted)="signIn($event)">
  <a wrAuthFooter href="/auth/forgot">Forgot password?</a>
</wr-auth-login>`;
}
