import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrAutofocus } from 'ngwr/directives';
import { WrInput } from 'ngwr/input';

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
  imports: [
    WrAutofocus,
    WrButton,
    WrInput,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class AutofocusPage {
  /** Starts false so the page does not take focus on load. */
  protected readonly autofocusOn = signal(false);

  protected readonly snippets = {
    usage: `<input wrAutofocus placeholder="Focused on init" />
<input [wrAutofocus]="shouldFocus()" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrAutofocus]',
      description: 'Focus the host on init, or when the binding turns true.',
      type: 'boolean',
      default: 'true',
    },
  ];
}
