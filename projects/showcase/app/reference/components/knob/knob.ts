import { Component, signal } from '@angular/core';

import { WrKnob } from 'ngwr/knob';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-knob-page',
  templateUrl: './knob.html',
  imports: [WrKnob, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class KnobPageComponent {
  protected readonly install = `import { WrKnob } from 'ngwr/knob';

@Component({ imports: [WrKnob] })
export class MyComponent {}`;

  protected readonly value = signal(45);
  protected readonly volume = signal(70);

  protected readonly snippet = `<wr-knob [(value)]="value" [min]="0" [max]="100" suffix="%" />`;

  protected readonly api = API.WrKnob;
}
