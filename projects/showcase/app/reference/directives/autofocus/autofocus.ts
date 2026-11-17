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
  protected readonly formOpen = signal(false);

  protected readonly snippets = {
    usage: `<input wrAutofocus placeholder="Focused on init" />
<input [wrAutofocus]="shouldFocus()" />`,
    first: `<form wrAutofocus="first">
  <input wrInput placeholder="Focused on init" />
</form>

<!-- Each time the form opens -->
<div [wrAutofocus]="open() && 'first'">
  @if (open()) {
    <wr-select [(value)]="plan">…</wr-select>
  }
</div>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrAutofocus]',
      description:
        'Focus the host on init, or when the binding turns true. `"first"` focuses the first focusable element inside the host instead.',
      type: "boolean | 'first'",
      default: 'true',
    },
  ];
}
