import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrRadio, WrRadioGroup } from 'ngwr/radio';

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
  templateUrl: './radio.html',
  imports: [
    FormsModule,
    WrRadio,
    WrRadioGroup,
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
    install: `import { WrRadio, WrRadioGroup } from 'ngwr/radio';
import { FormsModule } from '@angular/forms';

@Component({ imports: [WrRadio, WrRadioGroup, FormsModule] })
export class MyComponent {}`,
    basic: `<wr-radio-group [(ngModel)]="size">
  <wr-radio value="sm">Small</wr-radio>
  <wr-radio value="md">Medium</wr-radio>
  <wr-radio value="lg">Large</wr-radio>
</wr-radio-group>`,
    plans: `<wr-radio-group [(ngModel)]="plan">
  <wr-radio value="starter">Starter — $0/mo</wr-radio>
  <wr-radio value="pro">Pro — $9/mo</wr-radio>
  <wr-radio value="enterprise">Enterprise — custom</wr-radio>
</wr-radio-group>`,
    disabled: `<wr-radio-group [disabled]="true" [(ngModel)]="size">
  <wr-radio value="sm">Small</wr-radio>
  <wr-radio value="md">Medium</wr-radio>
</wr-radio-group>`,
    disabledOption: `<wr-radio-group [(ngModel)]="size">
  <wr-radio value="sm">Small</wr-radio>
  <wr-radio value="md">Medium</wr-radio>
  <wr-radio value="lg" disabled>Large</wr-radio>
</wr-radio-group>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'id', description: 'Stable id for the native input.', type: 'string', default: 'auto' },
    { name: 'value', description: 'Value contributed when this radio is selected.', type: 'unknown', required: true },
    { name: 'size', description: 'Control size.', type: "'sm' | 'md' | 'lg'", default: "'md'" },
    {
      name: 'disabled',
      description: 'Disable just this option (the group can also disable all).',
      type: 'boolean',
      default: 'false',
    },
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
