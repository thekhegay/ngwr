import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrInput } from 'ngwr/input';
import { WrQr } from 'ngwr/qr';

import { DocApiComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-qr-page',
  templateUrl: './qr.html',
  imports: [FormsModule, WrQr, WrInput, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocApiComponent],
})
export default class QrComponent {
  protected readonly text = signal('https://ngwr.dev');

  protected readonly snippets = {
    basic: `<wr-qr value="https://ngwr.dev" />`,
    sized: `<wr-qr value="ngwr" [size]="240" level="H" color="#3969e2" />`,
    interactive: `<wr-qr [value]="text()" [size]="180" />
<input wrInput [(ngModel)]="text" placeholder="Type to encode" />`,
    icon: `<wr-qr value="https://ngwr.dev" [size]="180" level="H" iconUrl="/icon.svg" [iconSize]="40" />`,
  };

  protected readonly api = API.WrQr;
}
