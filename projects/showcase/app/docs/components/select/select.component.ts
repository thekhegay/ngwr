import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrOptionComponent, WrOptionGroupComponent, WrSelectComponent } from 'ngwr/select';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-select-page',
  templateUrl: './select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrSelectComponent,
    WrOptionComponent,
    WrOptionGroupComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class SelectComponent {
  protected readonly size = signal<string | null>(null);
  protected readonly framework = signal<string | null>('angular');

  protected readonly snippets = {
    install: `import { WrSelectComponent, WrOptionComponent } from 'ngwr/select';
import { FormsModule } from '@angular/forms';

@Component({ imports: [WrSelectComponent, WrOptionComponent, FormsModule] })
export class MyComponent {}`,
    basic: `<wr-select placeholder="Pick a size" [(ngModel)]="size">
  <wr-option value="sm">Small</wr-option>
  <wr-option value="md">Medium</wr-option>
  <wr-option value="lg">Large</wr-option>
</wr-select>`,
    groups: `<wr-select [(ngModel)]="framework">
  <wr-option-group label="Frontend">
    <wr-option value="angular">Angular</wr-option>
    <wr-option value="react">React</wr-option>
    <wr-option value="vue">Vue</wr-option>
  </wr-option-group>
  <wr-option-group label="Backend">
    <wr-option value="nest">NestJS</wr-option>
    <wr-option value="fastify">Fastify</wr-option>
  </wr-option-group>
</wr-select>`,
    disabled: `<wr-select placeholder="Disabled" disabled />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'placeholder', description: 'Shown when no option is chosen.', type: 'string', default: "''" },
    { name: 'disabled', description: 'Disable the select.', type: 'boolean', default: 'false' },
    { name: 'rounded', description: 'Pill-shaped trigger.', type: 'boolean', default: 'false' },
  ];

  protected readonly optionApi: readonly DocApiRow[] = [
    { name: 'value', description: 'Form value contributed when chosen.', type: 'unknown', required: true },
    { name: 'disabled', description: 'Disable this option.', type: 'boolean', default: 'false' },
  ];

  protected readonly groupApi: readonly DocApiRow[] = [
    { name: 'label', description: 'Section heading.', type: 'string', required: true },
  ];
}
