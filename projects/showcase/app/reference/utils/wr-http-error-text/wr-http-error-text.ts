import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-http-error-text-page',
  templateUrl: './wr-http-error-text.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class WrHttpErrorTextPage {
  protected readonly snippet = `import { Injector, inject } from '@angular/core';

import { wrHttpErrorText, wrHttpStatus } from 'ngwr/i18n';

export class OrderForm {
  private readonly injector = inject(Injector);

  protected async save(): Promise<void> {
    try {
      await this.api.save(this.order());
    } catch (error) {
      if (wrHttpStatus(error) === 401) return this.session.lost();

      this.toast.danger(
        wrHttpErrorText(error, {
          injector: this.injector,
          overrides: { 409: 'An order with this number already exists.' },
        }),
      );
    }
  }
}`;

  protected readonly catalogSnippet = `// app.config.ts
provideWrI18nBaseCatalogs({ en: wrEn, de: wrDe }),
provideWrI18nStaticLoader({
  en: { httpError: { 403: 'Ask your manager for access.' } },
}),

// an API that writes its errors for the reader
wrHttpErrorText(error, { injector, serverMessage: true });`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrHttpStatus(error)',
      description:
        'The status of an `HttpErrorResponse`, or of anything with a numeric `status`. `0` is a network failure, `null` is not an HTTP error.',
      type: '(error: unknown) => number | null',
      default: '-',
    },
    {
      name: 'wrHttpErrorText(error, options?)',
      description: 'A sentence for the error, in the active language.',
      type: '(error: unknown, options?: WrHttpErrorTextOptions) => string',
      default: '-',
    },
    {
      name: 'options.overrides',
      description: 'Your own text per status, `0` being a network failure. A string, or a function of the error.',
      type: 'Partial<Record<number, string | ((error: unknown) => string)>>',
      default: '-',
    },
    {
      name: 'options.serverMessage',
      description: 'Prefer the sentence in the response body: `error.error.message`, or a string body.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'options.injector',
      description: 'Where to read `WrI18n` from. Needed when the call is outside an injection context.',
      type: 'Injector',
      default: '-',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Service', title: 'WrI18n', url: ['/reference/services', 'i18n'] },
    { kind: 'Guide', title: 'Translations setup', url: ['/guides/translations', 'setup'] },
  ];
}
