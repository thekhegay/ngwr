import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
  imports: [
    FormsModule,
    WrKnob,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class KnobPageComponent {
  protected readonly value = signal(45);
  protected readonly volume = signal(70);

  protected readonly snippet = `<wr-knob [(ngModel)]="value" [min]="0" [max]="100" suffix="%" />`;

  protected readonly api = API.WrKnob;
}
