import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrKnob } from 'ngwr/knob';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

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

  protected readonly api: readonly DocApiRow[] = [
    { name: 'min', description: 'Minimum value.', type: 'number', default: '0' },
    { name: 'max', description: 'Maximum value.', type: 'number', default: '100' },
    { name: 'step', description: 'Step granularity.', type: 'number', default: '1' },
    { name: 'size', description: 'Dial diameter in pixels.', type: 'number', default: '120' },
    { name: 'strokeWidth', description: 'Arc stroke width in pixels.', type: 'number', default: '8' },
    {
      name: 'trackColor',
      description: 'Unfilled track color.',
      type: 'string',
      default: "'rgba(var(--wr-color-light-rgb), 0.6)'",
    },
    { name: 'valueColor', description: 'Filled-arc color.', type: 'string', default: "'var(--wr-color-primary)'" },
    { name: 'showValue', description: 'Show the value text in the center.', type: 'boolean', default: 'true' },
    { name: 'suffix', description: 'Text appended to the center value (e.g. "%").', type: 'string', default: "''" },
    { name: 'readonly', description: 'Disable interaction but keep full opacity.', type: 'boolean', default: 'false' },
    { name: 'disabled', description: 'Disable interaction.', type: 'boolean', default: 'false' },
  ];
}
