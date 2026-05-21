import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrRadioComponent, WrRadioGroupComponent } from 'ngwr/radio';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-radio-page',
  templateUrl: './radio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrRadioComponent,
    WrRadioGroupComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class RadioComponent {
  protected readonly size = signal('md');
  protected readonly plan = signal('starter');

  protected readonly snippets = {
    install: `import { WrRadioComponent, WrRadioGroupComponent } from 'ngwr/radio';
import { FormsModule } from '@angular/forms';

@Component({ imports: [WrRadioComponent, WrRadioGroupComponent, FormsModule] })
export class MyComponent {}`,
    basic: `<wr-radio-group [(ngModel)]="size">
  <wr-radio value="sm">Small</wr-radio>
  <wr-radio value="md">Medium</wr-radio>
  <wr-radio value="lg">Large</wr-radio>
</wr-radio-group>`,
    disabled: `<wr-radio-group [disabled]="true" [(ngModel)]="size">
  <wr-radio value="sm">Small</wr-radio>
  <wr-radio value="md">Medium</wr-radio>
</wr-radio-group>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'id', description: 'Stable id for the native input.', type: 'string', default: 'auto' },
    { name: 'value', description: 'Value contributed when this radio is selected.', type: 'unknown', required: true },
  ];

  protected readonly groupApi: readonly DocApiRow[] = [
    {
      name: 'name',
      description: 'Shared `name` attribute. Auto-generated when omitted.',
      type: 'string',
      default: 'auto',
    },
  ];
}
