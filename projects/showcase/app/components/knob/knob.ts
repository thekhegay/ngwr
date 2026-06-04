import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrKnob } from 'ngwr/knob';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-knob-page',
  templateUrl: './knob.html',
  imports: [FormsModule, WrKnob, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class KnobPageComponent {
  protected readonly value = signal(45);
  protected readonly volume = signal(70);

  protected readonly snippet = `<wr-knob [(ngModel)]="value" [min]="0" [max]="100" suffix="%" />`;
}
