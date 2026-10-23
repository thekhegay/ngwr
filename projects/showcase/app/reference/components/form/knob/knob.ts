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
  protected readonly value = signal(45);
  protected readonly volume = signal(70);

  protected readonly snippet = `<wr-knob [(value)]="value" [min]="0" [max]="100" suffix="%" />`;

  protected readonly sizeSnippet = `<wr-knob [(value)]="value" [size]="64" [strokeWidth]="5" />
<wr-knob [(value)]="value" [size]="160" [strokeWidth]="14" />`;

  protected readonly noValueSnippet = `<wr-knob [(value)]="volume" [showValue]="false" ariaLabel="Volume" />`;

  protected readonly statesSnippet = `<wr-knob [value]="62" readonly ariaLabel="Read-only" />
<wr-knob [value]="62" disabled ariaLabel="Disabled" />`;

  protected readonly api = API.WrKnob;
}
