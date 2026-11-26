import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrInput } from 'ngwr/input';
import { WrBusy, WrSpinner } from 'ngwr/spinner';

import { DocApiComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-spinner-page',
  templateUrl: './spinner.html',
  imports: [
    WrSpinner,
    WrBusy,
    WrButton,
    WrInput,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocApiComponent,
  ],
})
export default class SpinnerComponent {
  protected readonly busy = signal(false);

  protected readonly snippets = {
    busy: `<form [wrBusy]="busy()" wrBusyLabel="Saving">
  <input wrInput placeholder="Name" aria-label="Name" />
  <wr-btn (click)="save()">Save</wr-btn>
</form>`,
    basic: `<wr-spinner />`,
    sizes: `<wr-spinner size="sm" />
<wr-spinner size="md" />
<wr-spinner size="lg" />`,
    color: `<div style="color: var(--wr-color-primary)">
  <wr-spinner />
</div>`,
  };

  protected readonly api = API.WrSpinner;
  protected readonly busyApi = API.WrBusy;

  protected save(): void {
    this.busy.set(true);
    setTimeout(() => this.busy.set(false), 2000);
  }
}
