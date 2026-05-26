import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrAutofocus } from 'ngwr/directives';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-autofocus-page',
  templateUrl: './autofocus.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrAutofocus,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class AutofocusPage {
  protected readonly autofocusOn = signal(true);

  protected toggleAutofocus(): void {
    this.autofocusOn.update(v => !v);
  }

  protected readonly snippets = {
    install: `import { WrAutofocus } from 'ngwr/directives';`,
    usage: `<input wrAutofocus placeholder="Focused on init" />
<input [wrAutofocus]="shouldFocus()" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrAutofocus]',
      description: 'Focus host on init, or whenever the bound expression becomes truthy.',
      type: 'boolean (default true)',
      default: '—',
    },
  ];
}
