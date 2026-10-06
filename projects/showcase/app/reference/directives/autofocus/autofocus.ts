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
  /**
   * Starts falsy so the page does not steal the caret on arrival, and so the
   * demo's one control drives the directive instead of calling `focus()`
   * itself — the transition is the only thing `wrAutofocus` adds over the
   * native attribute.
   */
  protected readonly autofocusOn = signal(false);

  protected readonly snippets = {
    usage: `<input wrAutofocus placeholder="Focused on init" />
<input [wrAutofocus]="shouldFocus()" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrAutofocus]',
      description: 'Focus host on init, or whenever the bound expression becomes truthy.',
      type: 'boolean',
      default: 'true',
    },
  ];
}
